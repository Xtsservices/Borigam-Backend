import express from 'express';
import {  startTest, getTestSubmissions,setQuestionStatusUnanswered,submitTest,getTestResultById,submitFinalResult,getTestQuestionsWithSubmissions } from '../controllers/testsubmissioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/startTest',asyncHandler(validateToken), asyncHandler(startTest));

router.get('/getTestQuestionSubmissions',asyncHandler(validateToken), asyncHandler(getTestSubmissions));

router.get('/setQuestionStatusUnanswered',asyncHandler(validateToken), asyncHandler(setQuestionStatusUnanswered));



router.post('/submitTest',asyncHandler(validateToken), asyncHandler(submitTest));

router.get('/getTestResultById',asyncHandler(validateToken), asyncHandler(getTestResultById));

router.get('/submitFinalResult',asyncHandler(validateToken), asyncHandler(submitFinalResult));

router.get('/getTestQuestionsWithSubmissions',asyncHandler(validateToken), asyncHandler(getTestQuestionsWithSubmissions));

export default router;
