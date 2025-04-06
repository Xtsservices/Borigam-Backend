import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { courseSchema } from "../model/course";
import { subjectSchema } from "../model/subject";
import { batchSchema } from "../model/batch";


import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { statuses, statusmap, getStatus } from "../utils/constants";

import logger from "../logger/logger";
import { getdetailsfromtoken } from "../common/tokenvalidator";
import { PoolClient } from "pg";
import moment from 'moment';



export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create Course")
    try {

        const { error } = joiSchema.courseSchema.validate(req.body)


        if (error) {
            next(error)
            return
        }
        const { name } = req.body;
        let status = getStatus("active")


        const newCourse: any = await baseRepository.insert(
            "course", { name, status },
            courseSchema
        );


        return ResponseMessages.Response(res, responseMessage.success, newCourse)
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err)

    }
};
interface Course {
    id: number;
    name: string;
    status: number;
}

interface Subject {
    id: number;
    name: string;
    status: number;
}

export const getCourses = async (req: Request, res: Response) => {
    try {
        const courses: Course[] = await baseRepository.findAll("course"); // Explicitly define the type of users

        if (courses && courses.length > 0) {
            const modifiedCourse = courses.map((course: Course) => ({
                ...course,  // Spread works since we now explicitly define the user as User type
                status: getStatus(course.status)  // Dynamically change the status field based on the user's actual status
            }));

            res.json(modifiedCourse);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create Subject");
    try {
        const { error } = joiSchema.subjectSchema.validate(req.body);

        if (error) {
            next(error);
            return;
        }

        const { name } = req.body;
        let status = getStatus("active");

        const newSubject: any = await baseRepository.insert(
            "subject",
            { name, status },
            subjectSchema
        );

        return ResponseMessages.Response(res, responseMessage.success, newSubject);
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    }
};

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const subjects: Subject[] = await baseRepository.findAll("subject"); // Explicitly define the type of users

        if (subjects && subjects.length > 0) {
            const modifiedSubject = subjects.map((subject: Subject) => ({
                ...subject,  // Spread works since we now explicitly define the user as User type
                status: getStatus(subject.status)  // Dynamically change the status field based on the user's actual status
            }));

            res.json(modifiedSubject);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Batch");

    const token = req.headers['token'];
    const details = await getdetailsfromtoken(token);

    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client

    try {
        await client.query("BEGIN"); // Start transaction

        // Validate request body using Joi
        const { error } = joiSchema.batchSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }



        const { name, course_id, start_date, end_date } = req.body;
        const courseCheck = await client.query('SELECT id FROM course WHERE id = $1', [course_id]);
        if (courseCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Course not found" });
        }
        const status = getStatus("active");

        // Convert and validate date formats
        const startMoment = moment(start_date, "DD-MM-YYYY");
        const endMoment = moment(end_date, "DD-MM-YYYY");

        if (!startMoment.isValid() || !endMoment.isValid()) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid date format. Use DD-MM-YYYY." });
        }

        // Set start to 00:00:00 and end to 23:59:59
        const parsedStartDate = startMoment.startOf('day').unix();
        const parsedEndDate = endMoment.endOf('day').unix();

        // Check that end_date is after start_date
        if (parsedEndDate <= parsedStartDate) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "End date must be after start date." });
        }


        // Get college ID from token
        const college_id = details.college_id;




        // Insert new batch into `batch` table
      
        const newBatch: any = await baseRepository.insert(
            "batch",
            {
                name,
                course_id,
                start_date: parsedStartDate,
                end_date: parsedEndDate,
                status,
                college_id
            },
            batchSchema,
            client
        );

        await client.query("COMMIT"); // Commit transaction
        logger.info("Batch created successfully");

        // Send success response
        return ResponseMessages.Response(res, "Batch created successfully", {
            batchId: newBatch.id,
            name: newBatch.name,
            course_id: newBatch.course_id,
            college_id: newBatch.college_id,
            start_date: newBatch.start_date,
            end_date: newBatch.end_date,
            status: newBatch.status
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release DB client
    }
};





