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

        // Validate the request body using Joi
        const { error } = joiSchema.questionWithOptionsSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, type, subject_id, options } = req.body;
        const status = getStatus("active");

        // Check if the subject exists
        const subjectData: any = await baseRepository.select("subject", { id: subject_id }, ['id']);
        if (!subjectData || subjectData.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Subject not found" });
        }

        // Insert the new question
        const newQuestion: any = await baseRepository.insert(
            "question",
            { name, type, status, subject_id },
            questionSchema,
            client
        );

        // If options are provided, process and insert them
        if (options && options.length > 0) {
            // Ensure each option has a boolean `is_correct` field
            const optionsData = options.map((opt: { option_text: string, is_correct: any }) => ({
                question_id: newQuestion.id,
                option_text: opt.option_text,
                is_correct: typeof opt.is_correct === 'boolean' ? opt.is_correct : false // Default to false if not a boolean
            }));


            // Insert options data
            await baseRepository.insertMultiple("option", optionsData, optionSchema, client);
        }

        // Commit the transaction
        await client.query("COMMIT");
        logger.info("Question created successfully");

        // Respond with success message
        return ResponseMessages.Response(res, responseMessage.success, newQuestion);

    } catch (err) {
        // In case of an error, roll back the transaction
        await client.query("ROLLBACK");
        logger.error("Error creating question:", err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        // Release the client back to the pool
        client.release();
    }
};

export const getAllQuestions = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Get All Questions");

    const client: PoolClient = await baseRepository.getClient();  // Get a database client

    try {
        await client.query("BEGIN");

        // Query to get all questions along with options and course info
        const query = `
        SELECT 
            q.id, 
            q.name, 
            q.type, 
            q.status, 
            s.id AS subject_id, 
            s.name AS subject_name, 
            o.id AS option_id, 
            o.option_text, 
            o.is_correct
        FROM question q
        LEFT JOIN option o ON q.id = o.question_id
        LEFT JOIN subject s ON q.subject_id = s.id;
    `;
    


        const result = await client.query(query);
        const questions = result.rows;  // Assuming `result.rows` contains the data

        await client.query("COMMIT");

        if (questions.length === 0) {
            return ResponseMessages.Response(res, responseMessage.no_data, {});
        }

        // Group the questions by their id
        const groupedQuestions = questions.reduce((acc: any[], item) => {
            let question = acc.find(q => q.id === item.id);

            if (!question) {
                question = {
                    id: item.id,
                    name: item.name,
                    type: item.type,
                    status: getStatus(item.status),
                    subject_id: item.subject_id,
                    subject_name: item.subject_name,
                    options: []
                };
                acc.push(question);
            }

            // Add the option to the question's options array only if type is not 'blank' or 'text'
            if (item.type !== 'blank' && item.type !== 'text') {
                question.options.push({
                    option_id: item.option_id,
                    option_text: item.option_text,
                    is_correct: item.is_correct
                });
            }

            return acc;
        }, []);

        // Send the response with the grouped questions
        return ResponseMessages.Response(res, responseMessage.success, groupedQuestions);
    } catch (err) {
        await client.query("ROLLBACK");  // Rollback in case of error
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();  // Release client back to pool
    }
};



export const createTest = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Test");
  
    const client: PoolClient = await baseRepository.getClient();
  
    try {
      await client.query("BEGIN");
  
      // Validate the request body
      const { error } = joiSchema.testWithQuestionsSchema.validate(req.body);
      if (error) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const {
        name,
        duration,
        subject_id,
        start_date,
        end_date,
        batch_ids,
        questions
      } = req.body;
  
      // Convert to moment objects and validate
      const parsedStart = moment(start_date, "DD-MM-YYYY").startOf("day");
      const parsedEnd = moment(end_date, "DD-MM-YYYY").endOf("day");
  
      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Invalid date format. Use DD-MM-YYYY." });
      }
  
      const startTimestamp = parsedStart.unix(); // seconds
      const endTimestamp = parsedEnd.unix();     // seconds
  
      if (endTimestamp <= startTimestamp) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "end_date must be after start_date." });
      }
  
      // Validate subject
      const subjectCheck = await client.query('SELECT id FROM subject WHERE id = $1', [subject_id]);
      if (subjectCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Subject not found" });
      }
  
      // Validate batches
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
  
      // Insert into test table
      const newTest: any = await baseRepository.insert(
        "test",
        {
          name,
          duration,
          subject_id,
          start_date: startTimestamp,
          end_date: endTimestamp,
          created_at: moment().unix()
        },
        testSchema,
        client
      );
  
      // Insert into test_batches table
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
      
  
      // Handle questions
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
                s.id AS subject_id,
                s.name AS subject_name,
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
            LEFT JOIN subject s ON t.subject_id = s.id
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            GROUP BY t.id, s.id
            ORDER BY t.id DESC;
        `;

        const result = await client.query(query);

        await client.query("COMMIT");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No tests found" });
        }

        logger.info(`Retrieved ${result.rows.length} tests with questions and subject info`);

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
                s.id AS subject_id,
                s.name AS subject_name,
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
            LEFT JOIN subject s ON t.subject_id = s.id
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            WHERE t.id = $1
            GROUP BY t.id, s.id;
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










