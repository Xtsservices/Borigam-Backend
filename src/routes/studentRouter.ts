import express from 'express';
import { createStudent ,getAllStudents} from '../controllers/studentcontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createStudent', asyncHandler(validateToken),asyncHandler(createStudent));
router.get('/getAllStudents', asyncHandler(validateToken),asyncHandler(getAllStudents));

export default router;
