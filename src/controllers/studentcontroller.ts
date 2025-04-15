import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { loginSchema } from "../model/login";
import { collegeStudentsSchema } from "../model/studentCollege";
import { courseStudentsSchema } from "../model/coursestudents";


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
import moment from 'moment';





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

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Update Student");

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client

    try {
        await client.query("BEGIN"); // Start transaction

        // Validate the request body using Joi schema for students
        const { error } = joiSchema.updatestudentSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { studentId, firstname, lastname, email, countrycode, mobileno } = req.body;

        // Check if studentId is valid
        if (!studentId) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Student ID is required" });
        }

        // Prepare the update data
        const updateData: any = { firstname, lastname, email, countrycode, mobileno };

        // Log the condition and update data for debugging
        logger.info("Updating student with condition", { studentId, updateData });

        // Ensure the condition is an object and not null or undefined
        const condition:any = { id: studentId };
        if (typeof condition !== 'object' || condition === null) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid condition provided for update" });
        }

        // Update the student in the `users` table
        const updatedStudent: any = await baseRepository.update(
            "users",
            { id: studentId }as any, // This is the condition, passed as an object
            [],
            updateData,
            client
        );
        

        // Ensure updatedStudent is an object, not an array
        if (!updatedStudent || Array.isArray(updatedStudent)) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Student not found" });
        }

        // Commit transaction
        await client.query("COMMIT");
        logger.info("Student updated successfully");

        // Respond with success and the updated student details
        return ResponseMessages.Response(res, "Student updated successfully", {
            studentId: updatedStudent.id,
            firstname: updatedStudent.firstname,
            lastname: updatedStudent.lastname,
            email: updatedStudent.email
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        logger.error("Error during student update", { error: err });
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release client back to pool
    }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Delete Student");

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client

    try {
        await client.query("BEGIN"); // Start transaction

        // Validate the request body
        const { studentId } = req.body;

        // Check if studentId is valid
        if (!studentId) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Student ID is required" });
        }

        // Prepare the update data (set status to 3)
        const updateData = { status: 3 };  // 3 will represent "deleted"

        // Log the condition and update data for debugging
        logger.info("Deleting student with condition", { studentId, updateData });

        // Ensure the condition is an object and not null or undefined
        const condition: any = { id: studentId };
        if (typeof condition !== 'object' || condition === null) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid condition provided for update" });
        }

        // Update the student's status in the `users` table
        const updatedStudent: any = await baseRepository.update(
            "users",
            { id: studentId } as any, // This is the condition, passed as an object
            [],
            updateData,
            client
        );

        // Ensure updatedStudent is an object, not an array
        if (!updatedStudent || Array.isArray(updatedStudent)) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Student not found" });
        }

        // Commit transaction
        await client.query("COMMIT");
        logger.info("Student deleted successfully");

        // Respond with success and the updated student details
        return ResponseMessages.Response(res, "Student deleted successfully", {
            studentId: updatedStudent.id,
            firstname: updatedStudent.firstname,
            lastname: updatedStudent.lastname,
            email: updatedStudent.email
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        logger.error("Error during student deletion", { error: err });
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
        // Query to get total student count with status = 2 (e.g., active status)
        let query = `
            SELECT COUNT(u.id) AS total_students
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            WHERE r.name = $1
            AND u.status = $2
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student", 2]; // 2 is the status value for active students

        if (collegeId) {
            query += ` AND cs.college_id = $3`;
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
  
    let collegeId: any = req.query.collegeId ? parseInt(req.query.collegeId as string) : null;
    const batchIds: number[] = req.query.batchIds
      ? (req.query.batchIds as string).split(',').map((id) => parseInt(id))
      : [];
  
    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);
  
    if (details.college_id && details.college_id != null) {
      collegeId = details.college_id;
    }
  
    try {
      let query = `
        SELECT 
            u.id AS student_id, u.firstname, u.lastname, u.email, 
            u.countrycode, u.mobileno, u.status, 
            cs.college_id, c.name AS college_name,
            
            -- Courses
            COALESCE(json_agg(DISTINCT jsonb_build_object(
                'course_id', co.id,
                'course_name', co.name
            )) FILTER (WHERE co.id IS NOT NULL), '[]') AS courses,
  
            -- Batches
            COALESCE(json_agg(DISTINCT jsonb_build_object(
                'batch_id', b.id,
                'batch_name', b.name,
                'start_date', b.start_date,
                'end_date', b.end_date
            )) FILTER (WHERE b.id IS NOT NULL), '[]') AS batches
  
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN role r ON ur.role_id = r.id
        LEFT JOIN college_students cs ON u.id = cs.user_id
        LEFT JOIN college c ON cs.college_id = c.id
        LEFT JOIN course_students cs2 ON u.id = cs2.student_id
        LEFT JOIN course co ON cs2.course_id = co.id
        LEFT JOIN batch b ON cs2.batch_id = b.id
  
        WHERE r.name = $1
        AND u.status = $2
      `;
  
      const params: any[] = ["student", 2];
      let paramIndex = 3;
  
      if (collegeId) {
        query += ` AND cs.college_id = $${paramIndex}`;
        params.push(collegeId);
        paramIndex++;
      }
  
      if (batchIds.length > 0) {
        query += ` AND cs2.batch_id = ANY($${paramIndex})`;
        params.push(batchIds);
        paramIndex++;
      }
  
      query += ` GROUP BY u.id, cs.college_id, c.name ORDER BY u.firstname ASC`;
  
      const students = await baseRepository.query(query, params);
      if (students && students.length > 0) {
        return ResponseMessages.Response(res, "Students fetched successfully", students);
      } else {
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
            WHERE r.name = $1 AND cs2.student_id IS NULL AND u.status = $2
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student", 2];  // 2 is for active students

        // If collegeId is provided, filter by college
        if (collegeId) {
            query += ` AND cs.college_id = $3`;
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
                COALESCE(c.name, 'Not Applicable') AS college_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN role r ON ur.role_id = r.id
            LEFT JOIN college_students cs ON u.id = cs.user_id
            LEFT JOIN college c ON cs.college_id = c.id
            LEFT JOIN course_students cs2 ON u.id = cs2.student_id
            WHERE r.name = $1 AND cs2.student_id IS NULL AND u.status = $2
        `;

        // Parameters for the query
        const params: (string | number)[] = ["student", 2]; // 2 for active students

        // If collegeId is provided, filter by college
        if (collegeId) {
            query += ` AND cs.college_id = $3`;
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




export const assignStudentToCourse = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Assigning student to a course");

    const token = req.headers['token'];
    let details = await getdetailsfromtoken(token);

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const { error } = joiSchema.assignStudentSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { studentId, courseId, batchId, startDate, endDate } = req.body;

        // Validate course
        const courseExists = await baseRepository.select(
            "course",
            { id: courseId },
            ['id'],
            client
        );
        if (!courseExists?.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Course not found" });
        }

        // Validate student
        const studentExists = await baseRepository.select(
            "users",
            { id: studentId },
            ['id'],
            client
        );
        if (!studentExists?.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Student not found" });
        }

        // Validate batch
        const batchExists:any = await baseRepository.select(
            "batch",
            { id: batchId },
            ['id', 'start_date', 'end_date'],
            client
        );
        
        if (!batchExists?.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Batch not found" });
        }

        // Prevent duplicate assignment
        let existingAssignment = await baseRepository.select(
            "course_students",
            { student_id: studentId, course_id: courseId, batch_id: batchId },
            ['id'],
            client
        );
        if (existingAssignment.length > 0) {
            await client.query("ROLLBACK");
            return ResponseMessages.alreadyExist(res, "Student is already assigned to this course and batch");
        }

        // Convert start and end dates to UNIX (start/end of day)
        const startUnix = batchExists[0]?.start_date
        const endUnix = batchExists[0]?.end_date

        // if (!moment(startDate, "DD-MM-YYYY").isValid() || !moment(endDate, "DD-MM-YYYY").isValid()) {
        //     await client.query("ROLLBACK");
        //     return res.status(400).json({ error: "Invalid date format. Use DD-MM-YYYY" });
        // }

        // if (endUnix <= startUnix) {
        //     await client.query("ROLLBACK");
        //     return res.status(400).json({ error: "End date must be after start date" });
        // }

        // Insert into course_students
        console.log(  {
            student_id: studentId,
            course_id: courseId,
            batch_id: batchId,
            start_date: startUnix,
            end_date: endUnix
        },)
        const newAssignment: any = await baseRepository.insert(
            "course_students",
            {
                student_id: studentId,
                course_id: courseId,
                batch_id: batchId,
                start_date: startUnix,
                end_date: endUnix
            },
            courseStudentsSchema,
            client
        );

        await client.query("COMMIT");

        logger.info("Student assigned to course successfully");
        return ResponseMessages.Response(res, "Student assigned to course successfully", {
            assignmentId: newAssignment.id,
            studentId,
            courseId,
            batchId,
            startDate: startUnix,
            endDate: endUnix
        });

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error assigning student to course", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};

export const getAllTestResultsForAllTests = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching all test results for all tests");

    const token = req.headers['token'];
    let collegeId: number | null = null;

    try {
        const details = await getdetailsfromtoken(token);
        if (details.college_id && details.college_id != null) {
            collegeId = details.college_id;
        }

        let resultsQuery = `
            SELECT 
                tr.user_id,
                u.firstname,
                u.lastname,
                tr.test_id,
                t.name AS test_name,
                tr.total_questions,
                tr.attempted,
                tr.unattempted,
                tr.correct,
                tr.wrong,
                tr.final_score,
                tr.final_result,
                tr.marks_awarded,
                tr.marks_deducted
            FROM test_results tr
            INNER JOIN users u ON u.id = tr.user_id
            INNER JOIN test t ON t.id = tr.test_id
        `;

        const params: any[] = [];

        if (collegeId !== null) {
            resultsQuery += ` WHERE u.college_id = $1`;
            params.push(collegeId);
        }

        resultsQuery += ` ORDER BY t.name, u.firstname, u.lastname`;

        const results = await baseRepository.query(resultsQuery, params);

        return res.status(200).json({
            message: "Test results retrieved successfully",
            results
        });

    } catch (err) {
        logger.error("Error fetching test results:", err);
        return res.status(500).json({ error: "Internal server error", details: err });
    }
};














