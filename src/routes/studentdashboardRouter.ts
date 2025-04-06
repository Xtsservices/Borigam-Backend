import express from 'express';
import {  getStudentTestStatus } from '../controllers/studentdashboardcontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/getStudentTestStatus',asyncHandler(validateToken), asyncHandler(getStudentTestStatus));









export default router;
