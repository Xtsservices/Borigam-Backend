import { Request, Response, NextFunction } from "express";
import baseRepository from "../repo/baseRepo";
import { joiSchema } from "../common/joiValidations/validator";
import { questionSchema } from "../model/question";
import { optionSchema } from "../model/option";
import { testSchema } from "../model/test";
import { testBatchSchema } from "../model/testbatch";

import { testQuestionsSchema } from "../model/testQuestions";

import logger from "../logger/logger";
import { getStatus } from "../utils/constants";
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { PoolClient } from "pg";
import moment from 'moment';


export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Question");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Parse and normalize options
        let noptions: any = req.body.options;
        if (typeof noptions === "string") {
            try {
                noptions = JSON.parse(noptions);
                req.body.options = noptions;
            } catch (e) {
                return res.status(400).json({ error: "Invalid options JSON format" });
            }
        }

        // Validate request
        const { error } = joiSchema.questionWithOptionsSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, type, course_id, options } = req.body;
        const status = getStatus("active");
        const image = req.file ? (req.file as any).location : null;

        // Check if course exists
        const courseData: any = await baseRepository.select("course", { id: course_id }, ["id"]);
        if (!courseData || courseData.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Course not found" });
        }

        // Insert question with course_id
        const newQuestion: any = await baseRepository.insert(
            "question",
            { name, type, status, course_id, image },
            questionSchema,
            client
        );

        // Insert options
        if (options && options.length > 0) {
            const optionsData = options.map((opt: { option_text: string; is_correct: any }) => ({
                question_id: newQuestion.id,
                option_text: opt.option_text,
                is_correct: typeof opt.is_correct === "boolean" ? opt.is_correct : false,
            }));

            await baseRepository.insertMultiple("option", optionsData, optionSchema, client);
        }

        await client.query("COMMIT");
        logger.info("Question created successfully");
        return ResponseMessages.Response(res, responseMessage.success, newQuestion);
    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error creating question:", err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();
    }
};


export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Delete Question");
  
    const client: PoolClient = await baseRepository.getClient();
  
    try {
      await client.query("BEGIN");
  
      const { id } = req.query;
  
      if (!id) {
        return res.status(400).json({ error: "Question ID is required" });
      }
  
      // Check if the question exists and is not already deleted
      const question:any = await baseRepository.findOne("question", "id = $1", [id], client);
      if (!question) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Question not found" });
      }
  
      if (Number(question.status) === getStatus("inactive")) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Question is already deleted" });
      }
  
      // Update status to deleted
      await baseRepository.update("question", "id = $1", [id], { status: getStatus("inactive") }, client);
  
      await client.query("COMMIT");
  
      logger.info(`Question with ID ${id} marked as deleted`);
      return ResponseMessages.Response(res, "Question deleted successfully");
  
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Error deleting question:", err);
      return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
      client.release();
    }
  };
  


  export const getAllQuestions = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Get All Active Questions");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const status = getStatus("active")

        const query = `
            SELECT 
                q.id, 
                q.name, 
                q.type, 
                q.status, 
                q.image,
                c.id AS course_id, 
                c.name AS course_name, 
                o.id AS option_id, 
                o.option_text, 
                o.is_correct
            FROM question q
            LEFT JOIN option o ON q.id = o.question_id
            LEFT JOIN course c ON q.course_id = c.id
            WHERE q.status = $1
            ORDER BY q.id, o.id;
        `;

        const result = await client.query(query, [status]);
        const questions = result.rows;

        await client.query("COMMIT");

        if (questions.length === 0) {
            return ResponseMessages.Response(res, responseMessage.no_data, {});
        }

        const noOptionTypes = ['blank', 'text'];
        const groupedQuestions = questions.reduce((acc: any[], item) => {
            let question = acc.find(q => q.id === item.id);

            if (!question) {
                question = {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    status: getStatus(item.status),
                    course_id: item.course_id,
                    course_name: item.course_name,
                    image: item.image,
                    options: []
                };
                acc.push(question);
            }

            if (!noOptionTypes.includes(item.type) && item.option_id) {
                question.options.push({
                    option_id: item.option_id,
                    option_text: item.option_text,
                    is_correct: item.is_correct
                });
            }

            return acc;
        }, []);

        return ResponseMessages.Response(res, responseMessage.success, groupedQuestions);
    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error fetching active questions:", err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();
    }
};





export const createTest = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Test");
  
    const client: PoolClient = await baseRepository.getClient();
  
    try {
      await client.query("BEGIN");
  
      const { error } = joiSchema.testWithQuestionsSchema.validate(req.body);
      if (error) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {
        name,
        duration,
        course_id,
        start_date,
        end_date,
        batch_ids,
        questions
      } = req.body;
  
      const parsedStart = moment(start_date, "DD-MM-YYYY").startOf("day");
      const parsedEnd = moment(end_date, "DD-MM-YYYY").endOf("day");
  
      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid date format. Use DD-MM-YYYY." });
      }
  
      const startTimestamp = parsedStart.unix();
      const endTimestamp = parsedEnd.unix();
  
      if (endTimestamp <= startTimestamp) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "end_date must be after start_date." });
      }
  
      const courseCheck = await client.query('SELECT id FROM course WHERE id = $1', [course_id]);
      if (courseCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Course not found" });
      }
  
      if (!Array.isArray(batch_ids) || batch_ids.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "At least one batch_id is required" });
      }
  
      const batchCheck = await client.query(
        'SELECT id FROM batch WHERE id = ANY($1)',
        [batch_ids]
      );
  
      if (batchCheck.rows.length !== batch_ids.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "One or more batches not found" });
      }
  
      const newTest: any = await baseRepository.insert(
        "test",
        {
          name,
          duration,
          course_id,
          start_date: startTimestamp,
          end_date: endTimestamp,
          created_at: moment().unix()
        },
        testSchema,
        client
      );
  
      const testBatchData = batch_ids.map((batchId: number) => ({
        test_id: newTest.id,
        batch_id: batchId,
        created_at: moment().unix()
      }));
  
      await baseRepository.insertMultiple(
        "test_batches",
        testBatchData,
        testBatchSchema,
        client
      );
  
      if (questions && questions.length > 0) {
        const questionIds = questions.map((q: number) => q);
  
        const result = await client.query(
          'SELECT id FROM question WHERE id = ANY($1)',
          [questionIds]
        );
  
        if (result.rows.length !== questions.length) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "One or more questions not found" });
        }
  
        const testQuestionsData = result.rows.map((row: any) => ({
          test_id: newTest.id,
          question_id: row.id
        }));
  
        await baseRepository.insertMultiple("test_questions", testQuestionsData, testQuestionsSchema, client);
      }
  
      await client.query("COMMIT");
      logger.info("Test created successfully");
  
      return ResponseMessages.Response(res, "Test created successfully", newTest);
  
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Error creating test:", err);
      return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
      client.release();
    }
  };
  

  export const viewAllTests = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into View All Tests");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const query = `
            SELECT 
                t.id AS test_id, 
                t.name AS test_name, 
                t.duration, 
                t.start_date,
                t.end_date,
                t.created_at,
                c.id AS course_id,
                c.name AS course_name,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', q.id, 
                            'name', q.name, 
                            'type', q.type, 
                            'status', q.status,
                            'options', (
                                SELECT COALESCE(
                                    json_agg(
                                        jsonb_build_object(
                                            'id', o.id, 
                                            'option_text', o.option_text, 
                                            'is_correct', o.is_correct
                                        )
                                    ), '[]'
                                )
                                FROM option o WHERE o.question_id = q.id
                            )
                        )
                    ) FILTER (WHERE q.id IS NOT NULL), 
                    '[]'
                ) AS questions
            FROM test t
            LEFT JOIN course c ON t.course_id = c.id
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            GROUP BY t.id, c.id
            ORDER BY t.id DESC;
        `;

        const result = await client.query(query);

        await client.query("COMMIT");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No tests found" });
        }

        logger.info(`Retrieved ${result.rows.length} tests with questions and course info`);

        return ResponseMessages.Response(res, responseMessage.success, result.rows);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error retrieving tests:", err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();
    }
};





export const viewTestById = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into View Test By ID");

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "Test ID is required" });
    }

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const query = `
            SELECT 
                t.id AS test_id, 
                t.name AS test_name, 
                t.duration, 
                t.start_date,
                t.end_date,
                t.created_at,
                c.id AS course_id,
                c.name AS course_name,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', q.id, 
                            'name', q.name, 
                            'type', q.type, 
                            'status', q.status,
                            'image', q.image,
                            'options', (
                                SELECT COALESCE(
                                    json_agg(
                                        jsonb_build_object(
                                            'id', o.id, 
                                            'option_text', o.option_text, 
                                            'is_correct', o.is_correct
                                        )
                                    ), '[]'
                                )
                                FROM option o WHERE o.question_id = q.id
                            )
                        )
                    ) FILTER (WHERE q.id IS NOT NULL), 
                    '[]'
                ) AS questions
            FROM test t
            LEFT JOIN course c ON t.course_id = c.id
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            WHERE t.id = $1
            GROUP BY t.id, c.id;
        `;

        const result = await client.query(query, [id]);

        await client.query("COMMIT");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Test not found" });
        }

        logger.info(`Retrieved test with ID: ${id}`);

        return ResponseMessages.Response(res, responseMessage.success, result.rows[0]);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error(`Error retrieving test with ID: ${id}`, err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();
    }
};











