import express from 'express';
import { createQuestion, getAllQuestions, deleteQuestion, getQuestionsByCourseId, createTest, viewAllTests, viewTestById,getCurrentAndUpcomingTests } from '../controllers/questioncontroller';
import { validateToken } from '../common/tokenvalidator';
import { upload } from "../middlewares/uploadToS3";

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createQuestion',  asyncHandler(validateToken),  upload.fields([{ name: 'image', maxCount: 1 },  { name: 'optionImages', maxCount: 10 },{ name: 'imageOption1', maxCount: 1 },{ name: 'imageOption2', maxCount: 1 },{ name: 'imageOption3', maxCount: 1 },{ name: 'imageOption4', maxCount: 1 },]), asyncHandler(createQuestion));
router.get('/getAllQuestions', asyncHandler(validateToken), asyncHandler(getAllQuestions));
router.get('/getQuestionsByCourseId', asyncHandler(validateToken), asyncHandler(getQuestionsByCourseId));

router.get('/deleteQuestion', asyncHandler(validateToken), asyncHandler(deleteQuestion));


router.post('/createTest', asyncHandler(validateToken), asyncHandler(createTest));
router.get('/viewAllTests', asyncHandler(validateToken), asyncHandler(viewAllTests));
router.get('/getCurrentAndUpcomingTests', asyncHandler(validateToken), asyncHandler(getCurrentAndUpcomingTests));

router.get('/viewTestByID', asyncHandler(validateToken), asyncHandler(viewTestById));







export default router;
