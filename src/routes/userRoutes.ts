import express from 'express';
import { getUsers, createUser, loginUser } from '../controllers/userController';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/user', asyncHandler(getUsers));
router.post('/createUser', asyncHandler(createUser));
router.post('/login', asyncHandler(loginUser));

export default router;
