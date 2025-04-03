import express from 'express';
import {  submitTest } from '../controllers/testsubmissioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/submitTest',asyncHandler(validateToken), asyncHandler(submitTest));







export default router;
