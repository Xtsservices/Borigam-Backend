import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";

import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import logger from "../logger/logger";
import { PoolClient } from "pg";
import { getStatus } from "../utils/constants";
import { getdetailsfromtoken } from "../common/tokenvalidator";
import moment from "moment";
interface TestResult {
    user_id: number;
    test_id: number;
    total_questions?: number;
    attempted?: number;
    correct?: number;
    wrong?: number;
    final_score?: string;
    final_result?: string;
    start_time?: Date;
    status?: string;
}


export const startTest = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Start Test");

    const { test_id } = req.body;
    const token = req.headers['token'];
    const userDetails = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Check if test exists
        const test = await baseRepository.select("test", { id: test_id }, ['id', 'name', 'duration', "start_date", "end_date"], client);

        if (test.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test not found" });
        }

        let testcheck: any = await common.checkTestDates(test[0])
        if (testcheck == "no") {
            return res.status(400).json({ error: "Test Cant Start Now" });
        }


        // Check if test_results already exists for this user
        const existingResult = await baseRepository.select(
            "test_results",
            { user_id: userDetails.id, test_id },
            ['id'],
            client
        );

        if (existingResult.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test has already been started by this user." });
        }

        // Get all test questions
        const questionQuery = `
        SELECT 
          q.id AS question_id,
          q.name AS question_name,
          q.type,
          q.image AS question_image,
          q.total_marks,
          q.negative_marks,
          o.id AS option_id,
          o.option_text,
          o.image AS option_image
        FROM test_questions tq
        JOIN question q ON tq.question_id = q.id
        LEFT JOIN option o ON o.question_id = q.id
        WHERE tq.test_id = $1
        ORDER BY q.id, o.id;
      `;
        const result = await client.query(questionQuery, [test_id]);
        const rows = result.rows;

        if (rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "No questions found for this test." });
        }

        // Group questions for response
        const groupedQuestions = rows.reduce((acc: any[], row) => {
            let question = acc.find(q => q.id === row.question_id);

            if (!question) {
                question = {
                    id: row.question_id,
                    name: row.question_name,
                    type: row.type,
                    image: row.question_image,
                    total_marks: row.total_marks,
                    negative_marks: row.negative_marks,
                    options: []
                };
                acc.push(question);
            }

            if (row.option_id) {
                question.options.push({
                    id: row.option_id,
                    option_text: row.option_text,
                    image: row.option_image
                });
            }

            return acc;
        }, []);

        // Insert empty test submissions with "open" status
        const questionIds = [...new Set(rows.map(row => row.question_id))];
        const submissionInserts = questionIds.map(qId => ({
            user_id: userDetails.id,
            test_id,
            question_id: qId,
            status: 'open',
            is_correct: false,
        }));

        await baseRepository.insertMultiple("test_submissions", submissionInserts, {
            user_id: 'number',
            test_id: 'number',
            question_id: 'number',
            status: 'string'
        }, client);

        // Insert new test_results with start_time
        await baseRepository.insert(
            "test_results",
            {
                user_id: userDetails.id,
                test_id,
                start_time: moment().unix()
            },
            {},
            client
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Test started successfully",
            test_id,
            questions: groupedQuestions
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error in startTest:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    } finally {
        client.release();
    }
};



export const getTestSubmissions = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Get Test Submissions");

    const { test_id } = req.query; // Assuming the test_id is passed as a query parameter
    const token = req.headers['token'];
    const userDetails = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Check if the test exists
        const test = await baseRepository.select("test", { id: test_id }, ['id'], client);
        if (test.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test not found" });
        }

        // Get all submissions for this test and user
        const submissionQuery = `
            SELECT 
                ts.id AS submission_id,
                ts.user_id,
                ts.test_id,
                ts.question_id,
                ts.status AS submission_status
            FROM test_submissions ts
            JOIN question q ON ts.question_id = q.id
            WHERE ts.test_id = $1 AND ts.user_id = $2
            ORDER BY ts.question_id;
        `;

        const result = await client.query(submissionQuery, [test_id, userDetails.id]);
        const submissions = result.rows;

        if (submissions.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "No submissions found for this test." });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Test submissions fetched successfully",
            submissions
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error in getTestSubmissions:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    } finally {
        client.release();
    }
};

export const setQuestionStatusUnanswered = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Set Question Status as Unanswered");

    const { test_id, question_id } = req.query; // Assuming the test_id and question_id are passed in the body
    const token = req.headers['token'];
    const userDetails = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Check if the test exists
        const test = await baseRepository.select("test", { id: test_id }, ['id'], client);
        if (test.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test not found" });
        }

        // Fetch question details along with options (excluding is_correct and including images)
        const questionQuery = `
        SELECT 
          q.id AS question_id,
          q.name AS question_name,
          q.type AS question_type,
          q.image AS question_image,
          q.total_marks,
          q.negative_marks,
          o.id AS option_id,
          o.option_text,
          o.image AS option_image
        FROM question q
        LEFT JOIN option o ON o.question_id = q.id
        WHERE q.id = $1;
      `;

        const questionResult = await client.query(questionQuery, [question_id]);
        const question = questionResult.rows;

        if (question.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Question not found" });
        }

        // Group the options by question
        const groupedOptions = question.reduce((acc: any, row) => {
            const { option_id, option_text, option_image } = row;

            if (!acc.options) {
                acc.options = [];
            }

            if (option_id) {
                acc.options.push({
                    id: option_id,
                    option_text,
                    option_image // Including option image if available
                });
            }

            return acc;
        }, {});

        // Update the status of the specific question for the user to "unanswered"
        const updateResult = await client.query(`
            UPDATE test_submissions
            SET status = 'unanswered'
            WHERE test_id = $1 AND user_id = $2 AND question_id = $3 AND status = 'open'
          `, [test_id, userDetails.id, question_id]);


        await client.query("COMMIT");

        return res.status(200).json({
            message: "Question status updated to 'unanswered'",
            test_id,
            question_id,
            question: {
                id: question[0].question_id,
                name: question[0].question_name,
                type: question[0].question_type,
                total_marks: question[0].total_marks,
                negative_marks: question[0].negative_marks,
                image: question[0].question_image, // Include question image
                options: groupedOptions.options
            }
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error in setQuestionStatusUnanswered:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    } finally {
        client.release();
    }
};







export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Submit Test");

    const { error } = joiSchema.submitTestSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: "Validation error", details: error.details });
    }

    const { test_id, answers } = req.body;
    const token = req.headers['token'];
    const userDetails = await getdetailsfromtoken(token);
    const user_id = userDetails.id;
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Check if the test exists
        const test: any = await baseRepository.select("test", { id: test_id }, ['id', 'name', 'duration', "start_date", "end_date"], client);
        if (test.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test not found" });
        }

        // Check if the test has started
        const result: any = await baseRepository.select("test_results", { user_id, test_id }, ['start_time'], client);
        if (result.length === 0) {
            return res.status(400).json({ error: "Test did not start" });
        }

        // Process answers
        const results = await Promise.all(answers.map(async (answer: { question_id: number; option_id?: number | number[]; text?: string }) => {
            const { question_id, option_id } = answer;

            // Check if the question is part of the test
            const testQuestion = await baseRepository.select("test_questions", { test_id, question_id }, ['id'], client);
            if (testQuestion.length === 0) {
                return { question_id, error: "Question not part of the test." };
            }

            // Fetch question details
            const question: any = await baseRepository.select("question", { id: question_id }, ['id', 'type', 'total_marks', 'negative_marks'], client);
            if (!question || question.length === 0) {
                return { question_id, error: "Question not found." };
            }

            const { type, total_marks, negative_marks } = question[0];
            let isCorrect = false;

            if (type === "multiple_choice") {
                // For multiple-choice questions, process option_id as an array
                if (Array.isArray(option_id) && option_id.length > 0) {
                    const correctOptions: any = await baseRepository.select("option", { question_id, is_correct: true }, ['id'], client);
                    const correctOptionIds = correctOptions.map((opt: any) => opt.id);
            
                    // Validate submitted options
                    const validOptions = option_id.filter((optId: number) => correctOptionIds.includes(optId));
                    const invalidOptions = option_id.filter((optId: number) => !correctOptionIds.includes(optId));
            
                    if (invalidOptions.length > 0) {
                        return { question_id, error: `Invalid option_id(s) for multiple-choice question: ${invalidOptions.join(", ")}` };
                    }
            
                    // Remove all previous submissions for this question
                    await baseRepository.delete("test_submissions", { user_id, test_id, question_id }, client);
            
                    // Insert each valid option as a separate submission
                    const submissions = validOptions.map((optId: number) => ({
                        user_id,
                        test_id,
                        question_id,
                        option_id: optId,
                        text: null,
                        is_correct: true,
                        status: "answered",
                        marks_awarded: total_marks / correctOptionIds.length, // Divide marks equally among correct options
                        marks_deducted: 0
                    }));
            
                    await Promise.all(submissions.map(async (submission) => {
                        await baseRepository.insert("test_submissions", submission, {}, client);
                    }));
            
                    return {
                        question_id,
                        isCorrect: true,
                        marks_awarded: total_marks,
                        marks_deducted: 0,
                        message: "Submission updated for multiple-choice question."
                    };
                } else {
                    return { question_id, error: "Invalid option_id for multiple-choice question. At least one valid option must be submitted." };
                }
            } else if (type === "radio") {
                // For single-choice questions, ensure option_id is a single integer
                if (typeof option_id === "number") {
                    const correctOptions: any = await baseRepository.select("option", { question_id, is_correct: true }, ['id'], client);
                    isCorrect = correctOptions.some((opt: { id: number }) => opt.id === option_id);

                    const submissionData = {
                        user_id,
                        test_id,
                        question_id,
                        option_id,
                        text: null,
                        is_correct: isCorrect,
                        status: "answered",
                        marks_awarded: isCorrect ? total_marks : 0,
                        marks_deducted: isCorrect ? 0 : negative_marks
                    };

                    const existingSubmission = await baseRepository.select("test_submissions", { user_id, test_id, question_id }, ['id'], client);
                    if (existingSubmission.length > 0) {
                        await baseRepository.update("test_submissions", "user_id = $1 AND test_id = $2 AND question_id = $3", [user_id, test_id, question_id], submissionData, client);
                    } else {
                        await baseRepository.insert("test_submissions", submissionData, {}, client);
                    }

                    return { question_id, isCorrect, message: "Submission processed for single-choice question." };
                } else {
                    return { question_id, error: "Invalid option_id for single-choice question." };
                }
            } else if (type === "blank" || type === "text") {
                const questionDetails: any = await baseRepository.select("question", { id: question_id }, ['correct_answer'], client);
                const correctAnswer = questionDetails?.[0]?.correct_answer || null;
                if (correctAnswer && correctAnswer.trim().toLowerCase() === answer.text?.trim().toLowerCase()) {
                    isCorrect = true;
                }

                const submissionData = {
                    user_id,
                    test_id,
                    question_id,
                    option_id: null,
                    text: answer.text,
                    is_correct: isCorrect,
                    status: "answered",
                    marks_awarded: isCorrect ? total_marks : 0,
                    marks_deducted: isCorrect ? 0 : negative_marks
                };

                const existingSubmission = await baseRepository.select("test_submissions", { user_id, test_id, question_id }, ['id'], client);
                if (existingSubmission.length > 0) {
                    await baseRepository.update("test_submissions", "user_id = $1 AND test_id = $2 AND question_id = $3", [user_id, test_id, question_id], submissionData, client);
                } else {
                    await baseRepository.insert("test_submissions", submissionData, {}, client);
                }

                return { question_id, isCorrect, message: "Submission processed for text/blank question." };
            }
        }));

        console.log("Results:", results);

        // Commit the transaction before fetching pending submissions
        await client.query("COMMIT");

        // Fetch pending submissions after committing the transaction
        const pendingsubmission = await common.gettestStatus(test_id, user_id);
        console.log("Pending submission:", pendingsubmission);

        return res.status(200).json({
            message: "Questions submitted successfully",
            results,
            pendingsubmission
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error in submitTest:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    } finally {
        client.release();
    }
};







export const getTestResultById = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching test result by ID");

    let { test_id, user_id } = req.query;
    const token = req.headers['token'];

    if (!test_id) {
        return res.status(400).json({ error: "Test ID is required" });
    }

    const userDetails = await getdetailsfromtoken(token);
    if (!user_id) user_id = userDetails.id;

    try {
        // Get overall test result
        const result = await baseRepository.select(
            "test_results",
            { user_id, test_id },
            ['total_questions', 'attempted', 'unattempted', 'correct', 'wrong', 'final_score', 'final_result', 'marks_awarded', 'marks_deducted']
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "Test result not found for this test ID" });
        }

        const answersQuery = `
            SELECT 
                q.id AS question_id,
                q.name AS question_text,
                q.explanation AS question_explanation,
                q.type AS question_type,
                COALESCE(array_agg(DISTINCT ts.option_id) FILTER (
                    WHERE ts.status = 'answered' AND ts.option_id IS NOT NULL
                ), '{}') AS submitted_option_ids,
                bool_or(ts.is_correct) FILTER (WHERE ts.status = 'answered') AS is_correct,
                SUM(ts.marks_awarded) FILTER (WHERE ts.status = 'answered') AS marks_awarded,
                SUM(ts.marks_deducted) FILTER (WHERE ts.status = 'answered') AS marks_deducted,
                CASE 
                    WHEN COUNT(ts.id) FILTER (WHERE ts.status = 'answered') > 0 THEN 'answered'
                    ELSE 'unanswered'
                END AS submission_status,
                json_agg(
                    jsonb_build_object(
                        'option_id', o.id,
                        'option_text', o.option_text,
                        'is_correct', o.is_correct
                    ) ORDER BY o.id
                ) AS options
            FROM test_questions tq
            JOIN question q ON tq.question_id = q.id
            LEFT JOIN test_submissions ts 
                ON ts.question_id = q.id 
                AND ts.user_id = $1 
                AND ts.test_id = $2
            LEFT JOIN option o ON o.question_id = q.id
            WHERE tq.test_id = $2
            GROUP BY q.id, q.name, q.type
        `;

        const answers = await baseRepository.query(answersQuery, [user_id, test_id]);

        return res.status(200).json({
            message: "Test result retrieved successfully",
            result: result[0],
            answers
        });
    } catch (err) {
        logger.error("Error fetching test result:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    }
};


export const submitFinalResult = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Processing final test result submission");

    let { test_id, user_id } = req.query;
    const token = req.headers['token'];

    if (!test_id) {
        return res.status(400).json({ error: "Test ID is required" });
    }

    const userDetails = await getdetailsfromtoken(token);
    if (!user_id) user_id = userDetails.id;

    try {
        const client = await baseRepository.getClient();

        // Query to fetch total marks_awarded and marks_deducted
        const totalMarksQuery = `
            SELECT 
                COALESCE(SUM(ts.marks_awarded), 0) AS total_marks_awarded,
                COALESCE(SUM(ts.marks_deducted), 0) AS total_marks_deducted
            FROM test_submissions ts
            WHERE ts.test_id = $1 AND ts.user_id = $2;
        `;

        const totalMarksResult = await client.query(totalMarksQuery, [test_id, user_id]);
        const { total_marks_awarded, total_marks_deducted } = totalMarksResult.rows[0];

        // Query to fetch all test questions and user submissions
        const answersQuery = `
            SELECT 
                q.id AS question_id,
                q.name AS question_text,
                q.type AS question_type,
                COALESCE(SUM(DISTINCT ts.marks_awarded), 0) AS marks_awarded, -- Sum DISTINCT marks_awarded for unique option_id
                COALESCE(SUM(ts.marks_deducted), 0) AS marks_deducted, -- Sum marks_deducted for all rows with the same question_id
                COALESCE(array_agg(DISTINCT ts.option_id) FILTER (
                    WHERE ts.option_id IS NOT NULL
                ), '{}') AS submitted_option_ids,
                bool_or(ts.is_correct) AS is_correct, -- At least one correct option makes the question correct
                CASE 
                    WHEN COUNT(ts.id) > 0 THEN 'answered'
                    ELSE 'unanswered'
                END AS submission_status,
                json_agg(
                    jsonb_build_object(
                        'option_id', o.id,
                        'option_text', o.option_text,
                        'is_correct', o.is_correct
                    )
                ) AS options
            FROM test_questions tq
            JOIN question q ON tq.question_id = q.id
            LEFT JOIN test_submissions ts 
                ON ts.question_id = q.id 
                AND ts.user_id = $1 
                AND ts.test_id = $2
            LEFT JOIN option o ON o.question_id = q.id
            WHERE tq.test_id = $2
            GROUP BY q.id, q.name, q.type
            ORDER BY q.id;
        `;

        const answers: any = await baseRepository.query(answersQuery, [user_id, test_id]);

        // Derived values
        const total_questions = answers.length;
        const attempted = answers.filter((q: any) => q.submission_status === 'answered').length;
        const unattempted = total_questions - attempted;
        const correct = answers.filter((q: any) => q.submission_status === 'answered' && q.is_correct === true).length;
        const wrong = attempted - correct;

        const final_score = total_questions > 0 ? ((correct / total_questions) * 100).toFixed(2) : '0.00';
        const final_result = correct >= total_questions / 2 ? "Pass" : "Fail";

        // Insert or Update result in the database
        const insertQuery = `
            INSERT INTO test_results 
            (user_id, test_id, total_questions, attempted, unattempted, correct, wrong, final_score, final_result, marks_awarded, marks_deducted, created_at)
            VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (user_id, test_id) 
            DO UPDATE SET 
                total_questions = EXCLUDED.total_questions,
                attempted = EXCLUDED.attempted,
                unattempted = EXCLUDED.unattempted,
                correct = EXCLUDED.correct,
                wrong = EXCLUDED.wrong,
                final_score = EXCLUDED.final_score,
                final_result = EXCLUDED.final_result,
                marks_awarded = EXCLUDED.marks_awarded,
                marks_deducted = EXCLUDED.marks_deducted;
        `;

        await client.query(insertQuery, [
            user_id,
            test_id,
            total_questions,
            attempted,
            unattempted,
            correct,
            wrong,
            final_score,
            final_result,
            total_marks_awarded,
            total_marks_deducted
        ]);

        await client.release();

        return res.status(200).json({
            message: "Test result saved successfully",
            result: {
                total_questions,
                attempted,
                unattempted,
                correct,
                wrong,
                final_score,
                final_result,
                marks_awarded: total_marks_awarded,
                marks_deducted: total_marks_deducted,
                total_marks_awarded: total_marks_awarded - total_marks_deducted
            },
            answers
        });
    } catch (err) {
        logger.error("Error processing final test result:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    }
};
















