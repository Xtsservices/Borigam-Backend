import express from 'express';
import {  createCourse,getCourses,createSubject,getSubjects } from '../controllers/coursecontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createCourse',asyncHandler(validateToken), asyncHandler(createCourse));

router.get('/getCourses',asyncHandler(validateToken), asyncHandler(getCourses));

router.post('/createSubject',asyncHandler(validateToken), asyncHandler(createSubject));

router.get('/getSubjects',asyncHandler(validateToken), asyncHandler(getSubjects));




export default router;
