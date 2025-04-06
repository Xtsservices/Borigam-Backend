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
    logger.info("Fetching test status for student");

    const { studentId } = req.query; // Using params for clarity

    const client: PoolClient = await baseRepository.getClient();
    try {
        await client.query("BEGIN");

        // Get all courseIds the student is enrolled in
        const studentCourses: { course_id: number }[] = await baseRepository.select(
            "course_students",
            { student_id: studentId }, // ✅ Changed user_id to student_id
            ["course_id"],
            client
        );

        console.log(`Student ${studentId} is enrolled in courses:`, studentCourses);

        if (studentCourses.length === 0) {
            await client.query("ROLLBACK");
            return ResponseMessages.noDataFound(res, "Student is not enrolled in any courses");
        }

        let courseTestStatus = [];

        for (const { course_id } of studentCourses) {
            // Get all test IDs for the course
            const testIds: { id: number }[] = await baseRepository.select(
                "test",
                { course_id },
                ["id"],
                client
            );
            const testIdList = testIds.map(t => t.id); // Extract test IDs

            const totalTests = testIdList.length;

            // Count completed tests where test_id is in testIdList
            let completedTests = 0;
            if (totalTests > 0) {
                completedTests = await baseRepository.count(
                    "test_results",
                    { user_id: studentId, test_id: testIdList, status: 'completed' },
                    client
                );
            }

            // Calculate pending tests
            const pendingTests = totalTests - completedTests;

            courseTestStatus.push({
                courseId: course_id,
                availableTests: totalTests,
                completedTests,
                pendingTests
            });
        }

        await client.query("COMMIT");

        return ResponseMessages.Response(res, "Student test status retrieved successfully", {
            studentId,
            courses: courseTestStatus
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error fetching student test status", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};












