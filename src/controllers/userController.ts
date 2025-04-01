import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { userSchema } from "../model/user";
import { loginSchema } from "../model/login";
import { userRolesSchema } from "../model/userRoles";
import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import logger from "../logger/logger";
import { getStatus } from "../utils/constants";
import { PoolClient } from "pg"; 

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create User");
    
    const client: PoolClient = await baseRepository.getClient();  // Use single client for the whole transaction

    try {
        await client.query("BEGIN");  // Explicitly start the transaction

        // Validate request body
        const { error } = joiSchema.userSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        

        const { firstname, lastname, email, countrycode, mobileno, roles } = req.body;

        // Generate random password
        const password = await common.generateRandomPassword();
        const hashedPassword = await common.hashPassword(password);
        

        const status = getStatus("active");

         // Check if the provided role exists in the 'role' table
         const roleData: any = await baseRepository.select(
          "role",
          { name: roles[0] }, // Ensure that 'name' exists in the 'role' table
          ['id']
        );
        

    if (!roleData || roleData.length === 0) {
      return res.status(400).json({ error: "Role not found" });
    }

    const roleid = roleData[0].id;  // Get the corresponding role_id


        // Insert user data into 'users' table with transaction client
        const newUser: any = await baseRepository.insert(
            "users",
            { firstname, lastname, email, countrycode, mobileno, status },
            userSchema,
            client  // Use transaction client
        );


        // Insert user login data with transaction client
        await baseRepository.insert(
            "login",
            { user_id: newUser.id, password: hashedPassword },
            loginSchema,
            client
        );

        // Insert user roles with transaction client
        const userRolesData = roles.map((roleId: number) => ({
            user_id: newUser.id,
            role_id: roleid
        }));

        await baseRepository.insertMultiple(
            "user_roles",
            userRolesData,
            userRolesSchema,
            client
        );

        await client.query("COMMIT");  // Commit the transaction
        logger.info("User created successfully");

        return ResponseMessages.Response(res, responseMessage.success, newUser);


    } catch (err) {
        await client.query("ROLLBACK");  // Rollback on any error
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    } finally {
        client.release();  // Release the client back to the pool
    }
};


export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await baseRepository.findAll("users");
    res.json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user: any = await baseRepository.findOne("users", "email = $1", [
      email,
    ]);
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const loginData: any = await baseRepository.findOne(
      "login",
      "user_id = $1",
      [user.id]
    );
    let matachPassword = await common.comparePassword(
      password,
      loginData.password
    );
    if (!loginData || !matachPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    let token = await common.generatetoken(user.id);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};


