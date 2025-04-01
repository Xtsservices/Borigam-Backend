import express from 'express';
import {  createCourse,getCourses } from '../controllers/coursecontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createCourse',asyncHandler(validateToken), asyncHandler(createCourse));
router.get('/getCourses',asyncHandler(validateToken), asyncHandler(getCourses));


export default router;
