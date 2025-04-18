import express from 'express';
import { getUsers, createUser, loginUser,myprofile,forgotPassword,changePassword } from '../controllers/userController';
import { validateToken } from '../common/tokenvalidator';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get('/user', asyncHandler(getUsers));
router.post('/createUser', asyncHandler(createUser));
router.post('/login', asyncHandler(loginUser));
router.get('/myprofile',asyncHandler(validateToken), asyncHandler(myprofile));

router.post('/forgotPassword', asyncHandler(forgotPassword));
router.post('/changePassword',asyncHandler(validateToken), asyncHandler(changePassword));



export default router;
