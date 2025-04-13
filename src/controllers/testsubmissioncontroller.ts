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
      const test = await baseRepository.select("test", { id: test_id }, ['id', 'name', 'duration'], client);
      if (test.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Test not found" });
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
        status: 'open'
      }));
  
      await baseRepository.insertMultiple("test_submissions", submissionInserts, {
        user_id: 'number',
        test_id: 'number',
        question_id: 'number',
        status: 'string'
      }, client);
  
      // Insert or update test_results with start_time and status
      await baseRepository.upsert(
        "test_results",
        { user_id: userDetails.id, test_id },
        {
            start_time: new Date(),
            status: "open"
          } as any,
        client
      );
  
      await client.query("COMMIT");
  
      return res.status(200).json({
        message: "Test started successfully",
        test_id,
       
      });
  
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Error in startTest:", err);
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
    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        let results = [];
        let newSubmissions = 0;
        let finalSummary: any = null;

        for (const answer of answers) {
            const { question_id, option_id, text } = answer;

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

            const existingSubmission = await baseRepository.select(
                "test_submissions",
                { user_id: userDetails.id, test_id, question_id },
                ['id'],
                client
            );
            if (existingSubmission.length > 0) {
                results.push({ question_id, message: "This question has already been submitted." });
                continue;
            }

            const question: any = await baseRepository.select(
                "question",
                { id: question_id },
                ['id', 'type'],
                client
            );
            if (!question || question.length === 0) {
                results.push({ question_id, error: "Question not found." });
                continue;
            }

            let isCorrect = false;

            if (question[0].type === "radio" || question[0].type === "multiple_choice") {
                const correctOption: any = await baseRepository.select(
                    "option",
                    { question_id, is_correct: true },
                    ['id'],
                    client
                );
                if (correctOption.length > 0 && correctOption.some((opt: { id: number }) => opt.id === option_id)) {
                    isCorrect = true;
                }
            } else if (question[0].type === "blank" || question[0].type === "text") {
                const correctAnswer: any = await baseRepository.select(
                    "option",
                    { question_id },
                    ['option_text'],
                    client
                );
                if (correctAnswer.length > 0 && correctAnswer.some((opt: { option_text: string }) =>
                    opt.option_text.toLowerCase() === text?.toLowerCase())) {
                    isCorrect = true;
                }
            }

            const submissionData: any = {
                user_id: userDetails.id,
                test_id,
                question_id,
                is_correct: isCorrect
            };

            if (option_id) {
                submissionData.option_id = option_id;
            }

            await baseRepository.insert(
                "test_submissions",
                submissionData,
                {},
                client
            );

            results.push({ question_id, isCorrect });
            newSubmissions++;
        }

        const totalQuestions = await baseRepository.count("test_questions", { test_id }, client);
        const submittedAnswers: { is_correct: boolean }[] = await baseRepository.select(
            "test_submissions",
            { user_id: userDetails.id, test_id },
            ['is_correct'],
            client
        );

        const attempted = submittedAnswers.length;

        if (attempted === totalQuestions) {
            const correct = submittedAnswers.filter(ans => ans.is_correct).length;
            const wrong = attempted - correct;
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
                    final_result: finalResult
                },
                client
            );

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

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Questions submitted successfully",
            results,
            finalSummary
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









