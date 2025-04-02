import express from 'express';
import {  createQuestion,getAllQuestions,createTest } from '../controllers/questioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createQuestion',asyncHandler(validateToken), asyncHandler(createQuestion));
router.get('/getAllQuestions',asyncHandler(validateToken), asyncHandler(getAllQuestions));

router.post('/createTest',asyncHandler(validateToken), asyncHandler(createTest));





export default router;
