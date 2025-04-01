import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';
import { serverResponseCodes } from '../../utils/serverResponses';

const multer = require('multer');



export const errorHandlingMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected field: ' + err.field });
        }
        // Handle other Multer errors as needed
        return res.status(400).json({ error: 'Multer error occurred: ' + err.message });
      }
    if (err instanceof ValidationError) {
        res.status(serverResponseCodes.Invalid_Parameters).json({
            type: 'ValidationError',
            message: err.message,
        });
    } else {
        next(err);
    }
};