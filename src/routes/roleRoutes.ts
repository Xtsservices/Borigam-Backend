import express from 'express';
import {  createRole,getRoles,createModule,getModules,createPermission,updatePermission,getAllPermissions } from '../controllers/rolecontroller';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.post('/createRole', asyncHandler(createRole));
router.get('/allRoles', asyncHandler(getRoles));
router.get('/getModules', asyncHandler(getModules));
router.post('/createModule', asyncHandler(createModule));

router.get('/getModules', asyncHandler(getModules));
router.post('/createModule', asyncHandler(createModule));

router.post('/createPermission', asyncHandler(createPermission));
router.post('/updatePermission', asyncHandler(updatePermission));
router.get('/getAllPermissions', asyncHandler(getAllPermissions));







export default router;
