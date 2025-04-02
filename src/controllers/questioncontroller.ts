import { Request, Response, NextFunction } from "express";
import baseRepository from "../repo/baseRepo";
import { joiSchema } from "../common/joiValidations/validator";
import { questionSchema } from "../model/question";
import { optionSchema } from "../model/option";
import { testSchema } from "../model/test";
import { testQuestionsSchema } from "../model/testQuestions";

import logger from "../logger/logger";
import { getStatus } from "../utils/constants";
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { PoolClient } from "pg";

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

        const { name, type, course_id, options } = req.body;
        const status = getStatus("active");

        // Check if the course exists
        const courseData: any = await baseRepository.select("course", { id: course_id }, ['id']);
        if (!courseData || courseData.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Course not found" });
        }

        // Insert the new question
        const newQuestion: any = await baseRepository.insert(
            "question",
            { name, type, status, course_id },
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

            console.log('Options Data:', optionsData); // Log options for debugging

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
            SELECT q.id, q.name, q.type, q.status, q.course_id, c.name AS course_name, o.id AS option_id, o.option_text, o.is_correct
            FROM question q
            LEFT JOIN option o ON q.id = o.question_id
            LEFT JOIN course c ON q.course_id = c.id;
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
                    course_id: item.course_id,
                    course_name: item.course_name,
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

        // Validate the request body using Joi
        const { error } = joiSchema.testWithQuestionsSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, duration, questions } = req.body;

        // Insert the new test
        const newTest: any = await baseRepository.insert(
            "test",
            { name, duration },
            testSchema,
            client
        );

        // If questions are provided, process and insert them
        if (questions && questions.length > 0) {
            // Ensure each question exists
            const questionIds = questions.map((q: number) => q);  // Ensure it's an array of integers

            // Use parameterized query to avoid SQL injection and format the array correctly
            const query = 'SELECT id FROM question WHERE id = ANY($1)';
            const result = await client.query(query, [questionIds]);

            // If the number of questions returned doesn't match the number of provided IDs, one or more questions do not exist
            if (result.rows.length !== questions.length) {
                await client.query("ROLLBACK");
                return res.status(400).json({ error: "One or more questions not found" });
            }

            // Prepare test-questions mapping
            const testQuestionsData = questions.map((question_id: number) => ({
                test_id: newTest.id,
                question_id,
            }));

            // Insert test-questions data
            await baseRepository.insertMultiple("test_questions", testQuestionsData, testQuestionsSchema, client);
        }

        // Commit the transaction
        await client.query("COMMIT");
        logger.info("Test created successfully");

        // Respond with success message
        return ResponseMessages.Response(res, responseMessage.success, newTest);

    } catch (err) {
        // In case of an error, roll back the transaction
        await client.query("ROLLBACK");
        logger.error("Error creating test:", err);
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        // Release the client back to the pool
        client.release();
    }
};

export const viewAllTests = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into View All Tests");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Fetch all tests with their associated questions, options, and course details
        const query = `
            SELECT 
                t.id AS test_id, 
                t.name AS test_name, 
                t.duration, 
                t.created_at,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', q.id, 
                            'name', q.name, 
                            'type', q.type, 
                            'status', q.status,
                            'course', jsonb_build_object(
                                'id', c.id,
                                'name', c.name,
                                'status', c.status
                            ),
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
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            LEFT JOIN course c ON q.course_id = c.id
            GROUP BY t.id
            ORDER BY t.id DESC;
        `;

        const result = await client.query(query);

        await client.query("COMMIT");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No tests found" });
        }

        logger.info(`Retrieved ${result.rows.length} tests with questions, options, and courses`);

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
    const { id } = req.query; // Extract test ID from URL params
    if (!id) {
        return res.status(400).json({ error: "Test ID is required" });
    }

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Fetch the test with questions, options, and course details
        const query = `
            SELECT 
                t.id AS test_id, 
                t.name AS test_name, 
                t.duration, 
                t.created_at,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', q.id, 
                            'name', q.name, 
                            'type', q.type, 
                            'status', q.status,
                            'course', jsonb_build_object(
                                'id', c.id,
                                'name', c.name,
                                'status', c.status
                            ),
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
            LEFT JOIN test_questions tq ON t.id = tq.test_id
            LEFT JOIN question q ON tq.question_id = q.id
            LEFT JOIN course c ON q.course_id = c.id
            WHERE t.id = $1
            GROUP BY t.id;
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








  
