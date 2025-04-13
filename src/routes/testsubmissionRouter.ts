import express from 'express';
import {  startTest, getTestSubmissions,submitTest,getTestResultById } from '../controllers/testsubmissioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/startTest',asyncHandler(validateToken), asyncHandler(startTest));

router.get('/getTestQuestionSubmissions',asyncHandler(validateToken), asyncHandler(getTestSubmissions));


router.post('/submitTest',asyncHandler(validateToken), asyncHandler(submitTest));

router.get('/getTestResultById',asyncHandler(validateToken), asyncHandler(getTestResultById));


export default router;
