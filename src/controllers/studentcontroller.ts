import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { loginSchema } from "../model/login";
import { collegeStudentsSchema } from "../model/studentCollege";


import { userRolesSchema } from "../model/userRoles";

import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import logger from "../logger/logger";
import { PoolClient } from "pg";
import { userSchema } from "../model/user";
import { getStatus } from "../utils/constants";
import { getdetailsfromtoken } from "../common/tokenvalidator";



export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Student");    

    const token = req.headers['token'];

    let details = await getdetailsfromtoken(token)


    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client
    try {
    
        await client.query("BEGIN"); // Start transaction

        // Validate the request body using Joi schema for students
        const { error } = joiSchema.studentSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }


        const { firstname, lastname, email, countrycode, mobileno } = req.body;

        const status = getStatus("active");
        const roleName = "student"; // Student role name

        // Insert the new student into `users` table
        const newStudent: any = await baseRepository.insert(
            "users",
            { firstname, lastname, email, countrycode, mobileno, status },
            userSchema,
            client
        );

        // Fetch the "student" role ID from the `role` table
        const roleData: any = await baseRepository.select(
            "role",
            { name: roleName },
            ['id'],
            client
        );

        if (!roleData || roleData.length === 0) {
            return res.status(400).json({ error: "Role not found" });
        }

        const roleid = roleData[0].id; // Get the corresponding role_id

        // Assign role to the new student in `user_roles` table
        await baseRepository.insert(
            "user_roles",
            { user_id: newStudent.id, role_id: roleid },
            userRolesSchema,
            client
        );

        // Map the student to the college in `college_users` table
        let collegeId=null
        if(details.college_id && details.college_id!=null){
            collegeId=details.college_id

            await baseRepository.insert(
                "college_students",
                { college_id: collegeId, user_id: newStudent.id },
                collegeStudentsSchema, // Using `collegeStudentsSchema` instead of `collegeUsersSchema`
                client
            );
        }

      

        // Generate a random password for the student
        const password = await common.generateRandomPassword();
        const hashedPassword = await common.hashPassword(password);

        // Insert login credentials for the student
        await baseRepository.insert(
            "login",
            { user_id: newStudent.id, password: hashedPassword },
            loginSchema,
            client
        );

        await client.query("COMMIT"); // Commit transaction
        logger.info("Student created successfully");

        // Respond with success and the student details
        return ResponseMessages.Response(res, "Student created successfully", {
            studentId: newStudent.id,
            firstname: newStudent.firstname,
            lastname: newStudent.lastname,
            email: newStudent.email,
            role: roleName
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release client back to pool
    }
};


export const getAllStudentsCount = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching total count of students");

    let collegeId: number | null = req.query.collegeId ? parseInt(req.query.collegeId as string) : null;

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);
    
    if (details.college_id && details.college_id !== null) {
        collegeId = details.college_id;
    }

    try {
        // Query to get total student count
        let query = `
            SELECT COUNT(u.id) AS total_students
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            WHERE r.name = $1
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student"];

        if (collegeId) {
            query += ` AND cs.college_id = $2`;
            params.push(collegeId);
        }

        // Execute the query
        const result = await baseRepository.query(query, params);

        // Type assertion to fix TypeScript error
        const totalStudents = (result[0] as { total_students: number })?.total_students || 0;

        return ResponseMessages.Response(res, "Total students count fetched successfully", { total_students: totalStudents });

    } catch (err) {
        logger.error("Error fetching total student count", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};



export const getAllStudents = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching all students");

    let collegeId:any = req.query.collegeId ? parseInt(req.query.collegeId as string) : null; // Get collegeId from query params


    const token = req.headers['token'];

    let details = await getdetailsfromtoken(token)
    if(details.college_id && details.college_id !=null){
        collegeId = details.college_id

    }

    try {
        // Start building the query
        let query = `
            SELECT u.id AS student_id, u.firstname, u.lastname, u.email, u.countrycode, 
                   u.mobileno, u.status, 
                   cs.college_id, c.name AS college_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            LEFT JOIN college c ON cs.college_id = c.id
            WHERE r.name = $1
        `;

        // Parameters for the query
        const params = ["student"];

        // If collegeId is provided, add condition to the query
        if (collegeId) {
            query += ` AND cs.college_id = $2`;
            params.push(collegeId);
        }

        // Order by first name
        query += ` ORDER BY u.firstname ASC`;

        // Execute the query with parameters
        const students = await baseRepository.query(query, params);
        if(students && students.length>0){
            return ResponseMessages.Response(res, "Students fetched successfully", students);
        }else{
            return ResponseMessages.noDataFound(res, "No Students Found");

        }

    } catch (err) {
        logger.error("Error fetching students", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};

export const getUnassignedStudentsCount = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching count of students without a course");

    let collegeId: number | null = req.query.collegeId ? parseInt(req.query.collegeId as string) : null;

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);

    if (details.college_id && details.college_id !== null) {
        collegeId = details.college_id;
    }

    try {
        // Start building the query
        let query = `
            SELECT COUNT(u.id) AS "unassigned_students_count"
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            LEFT JOIN college c ON cs.college_id = c.id
            LEFT JOIN course_students cs2 ON u.id = cs2.student_id
            WHERE r.name = $1 AND cs2.student_id IS NULL
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student"];

        // If collegeId is provided, filter by college
        if (collegeId) {
            query += ` AND cs.college_id = $2`;
            params.push(collegeId);
        }

        // Execute the query
        const result = await baseRepository.query(query, params);
        
        // Ensure TypeScript recognizes the result structure
        const count = (result[0] as { unassigned_students_count?: number })?.unassigned_students_count || 0;

        return ResponseMessages.Response(res, "Unassigned students count fetched successfully", { count });

    } catch (err) {
        logger.error("Error fetching unassigned students count", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};

export const getUnassignedStudentsList = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching list of students without a course");

    let collegeId: number | null = req.query.collegeId ? parseInt(req.query.collegeId as string) : null;

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);

    if (details.college_id && details.college_id !== null) {
        collegeId = details.college_id;
    }

    try {
        // Query to fetch students without a course, including their college name
        let query = `
            SELECT 
                u.id AS student_id, 
                u.firstname, 
                u.lastname, 
                u.email, 
                u.countrycode, 
                u.mobileno, 
                u.status, 
                cs.college_id, 
                COALESCE(c.name, 'Not Assigned') AS college_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            LEFT JOIN college c ON cs.college_id = c.id
            LEFT JOIN course_students cs2 ON u.id = cs2.student_id
            WHERE r.name = $1 AND cs2.student_id IS NULL
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student"];

        // If collegeId is provided, filter by college
        if (collegeId) {
            query += ` AND cs.college_id = $2`;
            params.push(collegeId);
        }

        // Order by first name
        query += ` ORDER BY u.firstname ASC`;

        // Execute the query
        const students = await baseRepository.query(query, params);

        if (students.length > 0) {
            return ResponseMessages.Response(res, "Unassigned students fetched successfully", students);
        } else {
            return ResponseMessages.noDataFound(res, "No unassigned students found");
        }

    } catch (err) {
        logger.error("Error fetching unassigned students", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};







