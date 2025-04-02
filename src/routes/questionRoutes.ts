import express from 'express';
import {  createQuestion,getAllQuestions,createTest,viewAllTests,viewTestById } from '../controllers/questioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createQuestion',asyncHandler(validateToken), asyncHandler(createQuestion));
router.get('/getAllQuestions',asyncHandler(validateToken), asyncHandler(getAllQuestions));

router.post('/createTest',asyncHandler(validateToken), asyncHandler(createTest));

router.get('/viewAllTests',asyncHandler(validateToken), asyncHandler(viewAllTests));
router.get('/viewTestByID',asyncHandler(validateToken), asyncHandler(viewTestById));







export default router;
