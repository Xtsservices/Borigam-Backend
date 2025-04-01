import { Request, Response, NextFunction } from "express";
import baseRepository from "../repo/baseRepo";
import { joiSchema } from "../common/joiValidations/validator";
import { questionSchema } from "../model/question";
import { optionSchema } from "../model/option";
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
            status:getStatus(item.status),
            course_id: item.course_id,
            course_name: item.course_name,
            options: []
          };
          acc.push(question);
        }
        
        // Add the option to the question's options array
        question.options.push({
          option_id: item.option_id,
          option_text: item.option_text,
          is_correct: item.is_correct
        });

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

  
