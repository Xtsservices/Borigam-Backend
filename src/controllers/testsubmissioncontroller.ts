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
    let user_id = userDetails.id
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        let results = [];
        let finalSummary: any = null;


        // Check if test exists
        const test:any = await baseRepository.select("test", { id: test_id }, ['id', 'name', 'duration', "start_date", "end_date"], client);

        if (test.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Test not found" });
        }

        let testcheck: any = await common.checkTestDates(test[0])
        if (testcheck == "no") {
            return res.status(400).json({ error: "Test Cant Start Now" });
        }


        const result:any = await baseRepository.select(
            "test_results",
            { user_id, test_id },
            ['start_time']
        );


        if (result.length === 0) {
            return res.status(400).json({ error: "Test Did not start" });
        }

        let continuesubmission= await common.checkendtime(test[0].duration,result[0].start_time)

        if (continuesubmission == "no") {
            return res.status(400).json({ error: "Test Submission Time is finished" });
        }


        for (const answer of answers) {
            const { question_id, option_id, text } = answer;

            const testQuestion = await baseRepository.select(
                "test_questions",
                { test_id, question_id },
                ['id'],
                client
            );
            if (testQuestion.length === 0) {
                results.push({ question_id, error: "Question not part of the test." });
                continue;
            }

            const question: any = await baseRepository.select(
                "question",
                { id: question_id },
                ['id', 'type', 'total_marks', 'negative_marks'],
                client
            );
            if (!question || question.length === 0) {
                results.push({ question_id, error: "Question not found." });
                continue;
            }

            const { type, total_marks, negative_marks } = question[0];
            let isCorrect = false;

            if (type === "radio" || type === "multiple_choice") {
                const correctOptions: any = await baseRepository.select(
                    "option",
                    { question_id, is_correct: true },
                    ['id'],
                    client
                );

                if (type === "radio") {
                    if (correctOptions.length > 0 && correctOptions.some((opt: { id: number }) => opt.id === option_id)) {
                        isCorrect = true;
                    }

                    const submissionData: any = {
                        user_id: userDetails.id,
                        test_id,
                        question_id,
                        option_id,
                        is_correct: isCorrect,
                        status: "answered",
                        marks_awarded: isCorrect ? total_marks : 0,
                        marks_deducted: isCorrect ? 0 : negative_marks
                    };

                    const existingSubmission: any = await baseRepository.select(
                        "test_submissions",
                        { user_id: userDetails.id, test_id, question_id },
                        ['id'],
                        client
                    );

                    if (existingSubmission.length > 0) {
                        await baseRepository.update(
                            "test_submissions",
                            "user_id = $1 AND test_id = $2 AND question_id = $3",
                            [userDetails.id, test_id, question_id],
                            submissionData,
                            client
                        );
                        results.push({ question_id, isCorrect, message: "Submission updated" });
                    } else {
                        await baseRepository.insert(
                            "test_submissions",
                            submissionData,
                            {},
                            client
                        );
                        results.push({ question_id, isCorrect, message: "New submission created" });
                    }
                }

                if (type === "multiple_choice") {
                    const selectedOptions: number[] = Array.isArray(option_id) ? option_id : [];
                    const correctOptionIds = correctOptions.map((opt: any) => opt.id);
                    const perOptionMark = total_marks / correctOptionIds.length;

                    let correctSelections = selectedOptions.filter((optId: number) => correctOptionIds.includes(optId));
                    let incorrectSelections = selectedOptions.filter((optId: number) => !correctOptionIds.includes(optId));

                    let optionMarksAwarded = correctSelections.length * perOptionMark;
                    let optionMarksDeducted = incorrectSelections.length * negative_marks;

                    isCorrect = correctSelections.length > 0 && incorrectSelections.length === 0;

                    const existingSubmissions: any = await baseRepository.select(
                        "test_submissions",
                        { user_id: userDetails.id, test_id, question_id },
                        ['id', 'option_id'],
                        client
                    );
                    const existingOptionIds = existingSubmissions.map((s: any) => s.option_id);

                    for (const optId of selectedOptions) {
                        const isCorrectOption = correctOptionIds.includes(optId);
                        const perOptAward = isCorrectOption ? perOptionMark : 0;
                        const perOptDeduct = isCorrectOption ? 0 : negative_marks;

                        if (!existingOptionIds.includes(optId)) {
                            await baseRepository.insert("test_submissions", {
                                user_id: userDetails.id,
                                test_id,
                                question_id,
                                option_id: optId,
                                is_correct: isCorrectOption,
                                status: "answered",
                                marks_awarded: perOptAward,
                                marks_deducted: perOptDeduct
                            }, {}, client);
                        }
                    }

                    for (const existing of existingSubmissions) {
                        if (!selectedOptions.includes(existing.option_id)) {
                            await baseRepository.delete(
                                "test_submissions",
                                { id: existing.id },
                                client
                            );
                        }
                    }

                    results.push({
                        question_id,
                        isCorrect,
                        message: "Submitted multiple choice answer",
                        optionMarksAwarded,
                        optionMarksDeducted
                    });

                    continue;
                }
            }

            else if (type === "blank" || type === "text") {
                const correctAnswers: any = await baseRepository.select(
                    "option",
                    { question_id },
                    ['option_text'],
                    client
                );

                if (correctAnswers.some((opt: { option_text: string }) =>
                    opt.option_text.toLowerCase() === text?.toLowerCase())) {
                    isCorrect = true;
                }

                const submissionData: any = {
                    user_id: userDetails.id,
                    test_id,
                    question_id,
                    text,
                    is_correct: isCorrect,
                    status: "answered",
                    marks_awarded: isCorrect ? total_marks : 0,
                    marks_deducted: isCorrect ? 0 : negative_marks
                };

                const existingSubmission: any = await baseRepository.select(
                    "test_submissions",
                    { user_id: userDetails.id, test_id, question_id },
                    ['id'],
                    client
                );

                if (existingSubmission.length > 0) {
                    await baseRepository.update(
                        "test_submissions",
                        "user_id = $1 AND test_id = $2 AND question_id = $3",
                        [userDetails.id, test_id, question_id],
                        submissionData,
                        client
                    );
                    results.push({ question_id, isCorrect, message: "Submission updated" });
                } else {
                    await baseRepository.insert(
                        "test_submissions",
                        submissionData,
                        {},
                        client
                    );
                    results.push({ question_id, isCorrect, message: "New submission created" });
                }
            }
        }

        const totalQuestions = await baseRepository.count("test_questions", { test_id }, client);
        const submittedAnswers: any[] = await baseRepository.select(
            "test_submissions",
            { user_id: userDetails.id, test_id },
            ['is_correct', 'marks_awarded', 'marks_deducted'],
            client
        );

        const attempted = submittedAnswers.length;
        let correct = submittedAnswers.filter(ans => ans.is_correct).length;
        let wrong = attempted - correct;

        let marks_awarded = submittedAnswers.reduce((sum, a) => sum + parseFloat(a.marks_awarded || 0), 0);
        let marks_deducted = submittedAnswers.reduce((sum, a) => sum + parseFloat(a.marks_deducted || 0), 0);

        if (attempted === totalQuestions) {
            const finalScore = ((correct / totalQuestions) * 100).toFixed(2);
            const finalResult = correct >= totalQuestions / 2 ? "Pass" : "Fail";

            await baseRepository.upsert(
                "test_results",
                { user_id: userDetails.id, test_id },
                {
                    total_questions: totalQuestions,
                    attempted,
                    correct,
                    wrong,
                    final_score: finalScore,
                    final_result: finalResult,
                    marks_awarded,
                    marks_deducted,
                    total_marks_awarded: marks_awarded - marks_deducted
                } as any,
                client
            );

            finalSummary = {
                totalQuestions,
                attempted,
                correct,
                wrong,
                finalScore,
                finalResult,
                marks_awarded,
                marks_deducted,
                total_marks_awarded: marks_awarded - marks_deducted,
                message: "Final submission completed"
            };
        }

        let pendingsubmission = await common.gettestStatus(test_id,user_id)
        if(pendingsubmission && pendingsubmission.unanswered){

        }
        await client.query("COMMIT");

        return res.status(200).json({
            message: "Questions submitted successfully",
            results,
            pendingsubmission
           // finalSummary
        });

    } catch (err) {
        await client.query("ROLLBACK");
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
            ['total_questions', 'attempted', 'correct', 'wrong', 'final_score', 'final_result']
        );

        if (result.length === 0) {
            return res.status(404).json({ error: "Test result not found for this test ID" });
        }

        // Fetch submitted answers with submitted option and all options
        const answersQuery = `
            SELECT 
                q.id AS question_id,
                q.name AS question_text,
                q.type AS question_type,
                ts.is_correct,
                ts.option_id AS submitted_option_id,
                submitted_option.option_text AS submitted_option_text,
                json_agg(
                    json_build_object(
                        'option_id', o.id,
                        'option_text', o.option_text,
                        'is_correct', o.is_correct
                    ) ORDER BY o.id
                ) AS options
            FROM test_submissions ts
            INNER JOIN question q ON ts.question_id = q.id
            LEFT JOIN option o ON o.question_id = q.id
            LEFT JOIN option submitted_option ON submitted_option.id = ts.option_id
            WHERE ts.user_id = $1 AND ts.test_id = $2
            GROUP BY q.id, q.name, q.type, ts.is_correct, ts.option_id, submitted_option.option_text
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









