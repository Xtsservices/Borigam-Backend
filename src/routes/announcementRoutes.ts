import { Router } from "express";
import {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement,
} from "../controllers/announcementController";
import { validateToken } from "../common/tokenvalidator";
const asyncHandler = (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  
const router = Router();

router.post("/createAnnouncement",asyncHandler(validateToken), asyncHandler(createAnnouncement)); // Create an announcement
router.get("/getAnnouncements",asyncHandler(validateToken), asyncHandler(getAnnouncements)); // Get all announcements
router.put("/updateAnnouncement",asyncHandler(validateToken), asyncHandler(updateAnnouncement)); // Update an announcement by ID
router.delete("/deleteAnnouncement",asyncHandler(validateToken), asyncHandler(deleteAnnouncement)); // Delete an announcement by ID

export default router;