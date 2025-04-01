const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
import { serverResponseCodes } from "../utils/constants";
import ResponseMessages from "./responseMessages";
import baseRepository from "../repo/baseRepo";


import bcrypt from 'bcrypt';

import dotenv from 'dotenv';
import crypto from 'crypto'; // You can use crypto or any other method for generating random strings

dotenv.config();

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            JWT_SECRET: string;
        }
    }
}


// Middleware to validate token

export async function validateToken(req: any, res: any, next: any) {
  const token = req.headers['token'];

  if (!token) {
    return await ResponseMessages.invalidToken(res, "Token required");
  }

  jwt.verify(token, process.env.JWT_SECRET, (err: any, decoded: { userId: any }) => {
    if (err) {
      // Check if the error is related to token expiration
      if (err.name === 'TokenExpiredError') {
        return res.status(serverResponseCodes.AcessToken).send({ message: 'Token has expired. Please log in again.' });
      }
      return res.status(serverResponseCodes.Error).send({ message: 'Failed to authenticate token.' });
    }
    req.userDetails = decoded;
    next();
  });
}

export async function getdetailsfromtoken(token:any) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };

    const user: any = await baseRepository.findOne("users", "id = $1", [
      decoded.userId,
    ]);
    return user;
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid token');
  }
  
}
