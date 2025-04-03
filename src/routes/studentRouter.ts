import express from 'express';
import { createStudent ,getAllStudents,getUnassignedStudentsCount,getAllStudentsCount,getUnassignedStudentsList,assignStudentToCourse } from '../controllers/studentcontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createStudent', asyncHandler(validateToken),asyncHandler(createStudent));
router.get('/getAllStudentsCount', asyncHandler(validateToken),asyncHandler(getAllStudentsCount));
router.get('/getAllStudents', asyncHandler(validateToken),asyncHandler(getAllStudents));
router.get('/getUnassignedStudentsCount', asyncHandler(validateToken),asyncHandler(getUnassignedStudentsCount));
router.get('/getUnassignedStudentsList', asyncHandler(validateToken),asyncHandler(getUnassignedStudentsList));
router.post('/assignStudentToCourse', asyncHandler(validateToken),asyncHandler(assignStudentToCourse));


export default router;
