import express from 'express';
import {  createQuestion,getAllQuestions } from '../controllers/questioncontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createQuestion',asyncHandler(validateToken), asyncHandler(createQuestion));
router.get('/getAllQuestions',asyncHandler(validateToken), asyncHandler(getAllQuestions));


export default router;
