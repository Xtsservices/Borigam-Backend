import { Request, Response, NextFunction } from 'express';
// import { MongoError } from 'mongodb';
// import { Error as MongooseError } from 'mongoose';
import logger from '../logger/logger';
import { serverResponseCodes } from '../utils/serverResponses';
//response message  class

export class ResponseMessages {
    async noDataFound(res: Response, message: string) {
        logger.info(message)
        return res.status(serverResponseCodes.NoData).json({
            type: false,
            message: message,
        })
    }
    async invalidParameters(res:Response, message: string){
        logger.info(message)
        return res.status(serverResponseCodes.Invalid_Parameters).json({
            type: false,
            message:message
        })
    }
    async invalidMessage(res: Response, message: string) {
        logger.info(message)
        return res.status(serverResponseCodes.Invalid_Parameters).json({
            type: true,
            message: message,
        })
    }
    userBlocked(res:Response,message: string){
        logger.info(message)
        return res.status(serverResponseCodes.Permissions_Denied).json({
            type: true,
            message:message
        })
    }
    unauthorized(res:Response,message: string){
        logger.info(message)
        return res.status(serverResponseCodes.Unauthorized).json({
            type: true,
            message:message
        })
    }

    async alreadyExist(res: Response, message: string) {
        logger.info(message)
        return res.status(serverResponseCodes.AlreadyExist).json({
            type: true,
            message: message,
        })
    }
    async invalidToken(res: Response, message: string) {
        logger.info(message)
        return res.status(serverResponseCodes.AcessToken).json({
            type: true,
            message: message,
        })
    }

    //Error handler
    async ErrorHandlerMethod(res: Response, message: string, err: any) {
        console.log("Database Error:", err);
    
        if (err.code === '42P01') {  // Table not found
            return res.status(500).json({
                error: 'Database Table Not Found',
                message: `The table referenced in the query does not exist.`
            });
        } else if (err.code === '23505') {  // Unique constraint violation
            return res.status(409).json({
                error: 'Conflict',
                message: 'Duplicate entry found.'
            });
        } else if (err.code === '23503') {  // Foreign key violation
            return res.status(409).json({
                error: 'Foreign Key Violation',
                message: 'Invalid reference in foreign key constraint.'
            });
        }
    
        return res.status(500).json({
            error: 'Internal Server Error',
            message: message || 'An unexpected error occurred.'
        });
    }
    
    
    //success response message
    async Response(res: Response, message: string, data?: Object) {
        logger.info(message)
        return res.status(serverResponseCodes.Success).json({
            type: true,
            message: message,
            data: data,

        })

    };

    async validation(res: Response, message: string) {
        logger.info(message)
        
        return res.status(400).json({
            type: true,
            message: message,

        })

    };



    async loginResponse(res: Response, code: number, message: string, data?: any, token?: any) {
        logger.info(message)
        return res.status(code).json({
            type: true,
            message: message,
            token: token,
            data: data

        })
    }


    async keyRequired(res: Response, message: string) {
        logger.info(message)
        return res.status(400).json({
            type: true,
            message: message,

        })

    }

}
export default new ResponseMessages();
