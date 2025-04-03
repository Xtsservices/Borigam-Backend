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

export const submitTest = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Submit Test");

    // Validate request body
    const { error } = joiSchema.submitTestSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: "Validation error", details: error.details });
    }

    const { test_id, answers } = req.body;
    const token = req.headers['token'];

    let userDetails = await getdetailsfromtoken(token);

    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client
    try {
        await client.query("BEGIN"); // Start transaction

        let results = [];
        let newSubmissions = 0; // Track newly submitted questions
        let finalSummary: any = null; // To store final submission summary

        for (const answer of answers) {
            const { question_id, option_id, text } = answer;

            // Check if question exists in the test
            const testQuestion = await baseRepository.select(
                "test_questions",
                { test_id, question_id },
                ['id'],
                client
            );
            if (testQuestion.length === 0) {
                results.push({ question_id, error: "Question not found in test." });
                continue;
            }

            // Check if question already submitted
            const existingSubmission = await baseRepository.select(
                "test_submissions",
                { user_id: userDetails.id, test_id, question_id },
                ['id'],
                client
            );
            if (existingSubmission.length > 0) {
                results.push({ question_id, message: "This question has already been submitted." });
                continue; // Skip already submitted questions
            }

            // Fetch question details
            const question: any = await baseRepository.select("question", { id: question_id }, ['id', 'type'], client);
            if (!question || question.length === 0) {
                results.push({ question_id, error: "Question not found." });
                continue;
            }

            let isCorrect = false;
            if (question[0].type === "radio" || question[0].type === "multiple_choice") {
                const correctOption: any = await baseRepository.select("option", { question_id, is_correct: true }, ['id'], client);
                if (correctOption.length > 0 && correctOption.some((opt: { id: any; }) => opt.id === option_id)) {
                    isCorrect = true;
                }
            } else if (question[0].type === "blank" || question[0].type === "text") {
                const correctAnswer: any = await baseRepository.select("option", { question_id }, ['option_text'], client);
                if (correctAnswer.length > 0 && correctAnswer.some((opt: { option_text: string; }) => opt.option_text.toLowerCase() === text.toLowerCase())) {
                    isCorrect = true;
                }
            }

            // Save question submission
            await baseRepository.insert(
                "test_submissions",
                { user_id: userDetails.id, test_id, question_id, is_correct: isCorrect },
                {},
                client
            );

            results.push({ question_id, isCorrect });
            newSubmissions++;
        }

        // Fetch total and submitted questions
        const totalQuestions = await baseRepository.count("test_questions", { test_id }, client);
        const submittedAnswers: { is_correct: boolean }[] = await baseRepository.select(
            "test_submissions",
            { user_id: userDetails.id, test_id },
            ['is_correct'],
            client
        );

        const attempted = submittedAnswers.length;

        if (attempted === totalQuestions) {
            // Only return final result if all questions have been submitted
            const correct = submittedAnswers.filter(ans => ans.is_correct).length;
            const wrong = attempted - correct;
            const finalScore = ((correct / totalQuestions) * 100).toFixed(2);
            const finalResult = correct >= totalQuestions / 2 ? "Pass" : "Fail";

            // Save/update test result
            await baseRepository.upsert(
                "test_results",
                { user_id: userDetails.id, test_id },
                { total_questions: totalQuestions, attempted, correct, wrong, final_score: finalScore, final_result: finalResult },
                client
            );

            // Store final summary separately
            finalSummary = {
                totalQuestions,
                attempted,
                correct,
                wrong,
                finalScore,
                finalResult,
                message: "Final submission completed"
            };
        }

        await client.query("COMMIT"); // Commit transaction
        logger.info("Questions submitted successfully");

        return res.status(200).json({
            message: "Questions submitted successfully",
            results,
            finalSummary // Separate object for final submission summary
        });
    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return res.status(500).json({ error: "Internal server error", details: err });
    } finally {
        client.release(); // Release client back to pool
    }
};





