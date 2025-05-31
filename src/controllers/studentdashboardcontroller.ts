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

export const getStudentTestStatus = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching student by ID");

    let studentId: number | null = null;
    const token = req.headers['token'];
    let collegeId: number | null = null;

    // Check if studentId is provided in the query parameters
    if (req.query.studentId) {
        studentId = parseInt(req.query.studentId as string, 10);
        if (isNaN(studentId)) {
            return res.status(400).json({ error: "Invalid studentId parameter" });
        }
    } else {
        // Extract studentId from the token if not provided in the query
        const details = await getdetailsfromtoken(token);
        studentId = details.id;
    }

    try {
        const students: any = await common.getStudentDetails(studentId, collegeId);

        if (students && students.length > 0) {
            if (students[0] && students[0].batches && students[0].batches.length > 0 && students[0].batches[0].batch_id) {
                let batch_id = students[0].batches[0].batch_id;
                const tests: any = await common.getTestsAssingedForStudent(studentId, batch_id);
                students[0].tests = tests;
                return ResponseMessages.Response(res, "Student fetched successfully", students[0]);
            } else {
                return ResponseMessages.Response(res, "Student fetched successfully", students[0]);
            }
        } else {
            return ResponseMessages.noDataFound(res, "Student not found");
        }
    } catch (err) {
        logger.error("Error fetching student by ID", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};












