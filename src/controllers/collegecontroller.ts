import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { collegeSchema } from "../model/college";
import { collegeUsersSchema } from "../model/collegeUser";
import { loginSchema } from "../model/login";
import { userRolesSchema } from "../model/userRoles";

import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import logger from "../logger/logger";
import { PoolClient } from "pg";
import { userSchema } from "../model/user";
import { getStatus } from "../utils/constants";



export const registerCollege = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Register College");

    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client
    try {
        await client.query("BEGIN"); // Start transaction

        // Validate request body
        const { error } = joiSchema.collegeSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, address, contact } = req.body;
        const { firstname, lastname, email, countrycode, mobileno } = contact;

        const status = getStatus("active");

        // Insert college into `college` table
        const newCollege: any = await baseRepository.insert(
            "college",
            { name, address, status },
            collegeSchema,
            client
        );


        // Insert point of contact in `users` table
        const newUser: any = await baseRepository.insert(
            "users",
            { firstname, lastname, email, countrycode, mobileno, status },
            userSchema,
            client
        );

        // Map the user to the college in `college_users` table
        await baseRepository.insert(
            "college_users",
            { college_id: newCollege.id, user_id: newUser.id },
            collegeUsersSchema,
            client
        );


        const roleData: any = await baseRepository.select(
            "role",
            { name: "admin" }, // Ensure that 'name' exists in the 'role' table
            ['id']
        );


        if (!roleData || roleData.length === 0) {
            return res.status(400).json({ error: "Role not found" });
        }

        const roleid = roleData[0].id;  // Get the corresponding role_id



        // Generate random password
        const password = await common.generateRandomPassword();
        const hashedPassword = await common.hashPassword(password);

        // Insert user login data with transaction client
        await baseRepository.insert(
            "login",
            { user_id: newUser.id, password: hashedPassword },
            loginSchema,
            client
        );

        // Insert user roles with transaction client
        const userRolesData = [
            {
                user_id: newUser.id,
                role_id: roleid
            }
        ];

        await baseRepository.insertMultiple(
            "user_roles",
            userRolesData,
            userRolesSchema,
            client
        );


        await client.query("COMMIT"); // Commit transaction
        logger.info("College registered successfully");

        return ResponseMessages.Response(res, "College registered successfully", {
            collegeId: newCollege.id,
            userId: newUser.id,
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release client back to pool
    }
};


export const viewAllCollegesAndUsers = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching all colleges, their users, and roles");

    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client
    try {
        await client.query("BEGIN"); // Start transaction

        // Query all colleges and their associated users along with their roles using JOIN
        const query = `
          SELECT 
            c.id AS college_id,
            c.name AS college_name,
            c.address AS college_address,
            c.status AS college_status,
            u.id AS user_id,
            u.firstname AS user_firstname,
            u.lastname AS user_lastname,
            u.email AS user_email,
            u.countrycode AS user_countrycode,
            u.mobileno AS user_mobileno,
            u.status AS user_status,
            r.name AS role_name
          FROM college c
          LEFT JOIN college_users cu ON c.id = cu.college_id
          LEFT JOIN users u ON cu.user_id = u.id
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN role r ON ur.role_id = r.id
        `;
        
        const result = await client.query(query);

        // Group results by college to organize users under each college
        const collegeWithUsers:any = [];

        result.rows.forEach(row => {
            let college = collegeWithUsers.find((c: { collegeId: any; }) => c.collegeId === row.college_id);

            if (!college) {
                college = {
                    collegeId: row.college_id,
                    collegeName: row.college_name,
                    collegeAddress: row.college_address,
                    collegeStatus: row.college_status,
                    users: []
                };
                collegeWithUsers.push(college);
            }

            if (row.user_id) {
                college.users.push({
                    userId: row.user_id,
                    firstname: row.user_firstname,
                    lastname: row.user_lastname,
                    email: row.user_email,
                    countrycode: row.user_countrycode,
                    mobileno: row.user_mobileno,
                    status: row.user_status,
                    role: row.role_name || "No role"  // Default to "No role" if role is null
                });
            }
        });

        await client.query("COMMIT"); // Commit transaction

        logger.info("Colleges, users, and roles fetched successfully");

        // Return the data in the response
        return ResponseMessages.Response(res, "Colleges, users, and roles fetched successfully", collegeWithUsers);

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release client back to pool
    }
};


