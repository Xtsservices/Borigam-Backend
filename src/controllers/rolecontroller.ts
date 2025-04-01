import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { roleSchema } from "../model/role";
import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { statuses,statusmap,getStatus } from "../utils/constants";

import logger from "../logger/logger";


export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create role")
    try {

        const { error } = joiSchema.roleSchema.validate(req.body)


        if (error) {
            next(error)
            return
        }
        const { name } = req.body;
        let status=getStatus("active")
        

        const newRole: any = await baseRepository.insert(
            "role",{name,status},
            roleSchema
        );


        return ResponseMessages.Response(res, responseMessage.success, newRole)
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err)

    }
};
interface User {
    id: number;
    name: string;
    status: number;
    // Add other fields as necessary
}

export const getRoles = async (req: Request, res: Response) => {
    try {
        const users: User[] = await baseRepository.findAll("role"); // Explicitly define the type of users

        if (users && users.length > 0) {
            const modifiedUsers = users.map((user: User) => ({
                ...user,  // Spread works since we now explicitly define the user as User type
                status: getStatus(user.status)  // Dynamically change the status field based on the user's actual status
            }));

            res.json(modifiedUsers);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};



