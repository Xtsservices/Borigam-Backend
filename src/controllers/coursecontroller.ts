import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { courseSchema } from "../model/course";
import { subjectSchema } from "../model/subject";

import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { statuses,statusmap,getStatus } from "../utils/constants";

import logger from "../logger/logger";


export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create Course")
    try {

        const { error } = joiSchema.courseSchema.validate(req.body)


        if (error) {
            next(error)
            return
        }
        const { name } = req.body;
        let status=getStatus("active")
        

        const newCourse: any = await baseRepository.insert(
            "course",{name,status},
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




