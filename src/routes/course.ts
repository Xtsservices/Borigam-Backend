import express from 'express';
import {  createCourse,getCourses,updateCourse,deleteCourse, createSubject,getSubjects,createBatch,viewAllBatches,updateBatch,deleteBatch } from '../controllers/coursecontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createCourse',asyncHandler(validateToken), asyncHandler(createCourse));

router.get('/getCourses',asyncHandler(validateToken), asyncHandler(getCourses));

router.post('/updateCourse',asyncHandler(validateToken), asyncHandler(updateCourse));

router.post('/updateCourse',asyncHandler(validateToken), asyncHandler(updateCourse));

router.get('/deleteCourse',asyncHandler(validateToken), asyncHandler(deleteCourse));


router.post('/createSubject',asyncHandler(validateToken), asyncHandler(createSubject));

router.get('/getSubjects',asyncHandler(validateToken), asyncHandler(getSubjects));


router.post('/createBatch',asyncHandler(validateToken), asyncHandler(createBatch));

router.get('/viewAllBatches',asyncHandler(validateToken), asyncHandler(viewAllBatches));

router.post('/updateBatch',asyncHandler(validateToken), asyncHandler(updateBatch));

router.get('/deleteBatch',asyncHandler(validateToken), asyncHandler(deleteBatch));






export default router;
