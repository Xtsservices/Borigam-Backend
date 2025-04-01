import express from 'express';
import {  createRole,getRoles } from '../controllers/rolecontroller';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createRole', asyncHandler(createRole));
router.get('/allRoles', asyncHandler(getRoles));


export default router;
