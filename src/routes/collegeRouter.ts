import express from 'express';
import { registerCollege ,viewAllCollegesAndUsers} from '../controllers/collegecontroller';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/registerCollege', asyncHandler(validateToken),asyncHandler(registerCollege));

router.get('/viewAllCollegesAndUsers', asyncHandler(validateToken),asyncHandler(viewAllCollegesAndUsers));

export default router;
