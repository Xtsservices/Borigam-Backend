import { Request, Response, NextFunction } from "express";
import pool from "../database";
import { joiSchema, announcementSchema } from "../common/joiValidations/validator";
import logger from "../logger/logger";
import baseRepository from "../repo/baseRepo";
import moment from 'moment-timezone';
import { Announcement, AnnouncementSchema } from "../model/announcement";

moment.tz.setDefault("Asia/Kolkata");

import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";


import { statuses, statusmap, getStatus } from "../utils/constants";
import { getdetailsfromtoken } from "../common/tokenvalidator";
import { PoolClient } from "pg";

export const createAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create announcement");
        const client: PoolClient = await baseRepository.getClient(); // Use single transaction client
    

    try {
        // Validate request body using Joi schema
        await client.query("BEGIN"); // Start transaction

        const { error } = joiSchema.announcementSchema.validate(req.body);
        if (error) {
            next(error); // Pass the error to the next middleware
            return;
        }

        let { start_date, end_date, text, status } = req.body;

        // Extract user details from token
        const token = req.headers['token'];
        const details = await getdetailsfromtoken(token);

        // Validate date format and logic
        if (!moment(start_date, "DD-MM-YYYY", true).isValid()) {
            return res.status(400).json({ error: "Invalid start_date format. Use DD-MM-YYYY." });
        }
        if (!moment(end_date, "DD-MM-YYYY", true).isValid()) {
            return res.status(400).json({ error: "Invalid end_date format. Use DD-MM-YYYY." });
        }
        const announcementStatus = getStatus("active");

        const today = moment().startOf("day");
        const startDateMoment = moment(start_date, "DD-MM-YYYY");
        const endDateMoment = moment(end_date, "DD-MM-YYYY");

        if (startDateMoment.isSameOrBefore(today)) {
            return res.status(400).json({ error: "Start date must be greater than today." });
        }

        if (endDateMoment.isSameOrBefore(startDateMoment)) {
            return res.status(400).json({ error: "End date must be greater than start date." });
        }

        // Convert dates to Unix timestamps
        start_date = startDateMoment.unix();
        end_date = endDateMoment.unix();
        // Insert announcement into the database
        const NewAnnouncement: any = await baseRepository.insert(
            "announcements",
            {
                start_date,
                end_date,
                text,
                status: announcementStatus,
                created_by_id: details.id,
                updated_by_id: details.id,
                created_date: moment().unix(),
                updated_date: moment().unix(),
            },
            AnnouncementSchema
        );
        await client.query("COMMIT"); // Commit transaction

        return ResponseMessages.Response(res, responseMessage.success, NewAnnouncement);
    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error

        logger.error("Error creating announcement:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};

export const getAnnouncements = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Fetching announcements");

    try {
        // Use baseRepository to fetch announcements
        const announcements = await baseRepository.findAll("announcements");

        if (!announcements || announcements.length === 0) {
            return ResponseMessages.noDataFound(res, "No announcements found");
        }

        // Map the announcements to include status text
        const mappedAnnouncements = announcements.map((announcement) => ({
            ...(typeof announcement === 'object' && announcement !== null ? announcement : {}),
            status: statusmap[(announcement as any).status] || "unknown", // Convert status to human-readable text
        }));

        return ResponseMessages.Response(res, "Announcements fetched successfully", mappedAnnouncements);
    } catch (err) {
        logger.error("Error fetching announcements:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};

export const updateAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { start_date, end_date, text, status, updated_by_id } = req.body;

    try {
        const query = `
            UPDATE announcements
            SET start_date = $1, end_date = $2, text = $3, updated_date = NOW(), status = $4, updated_by_id = $5
            WHERE id = $6
            RETURNING *;
        `;
        const values = [start_date, end_date, text, status, updated_by_id, id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return ResponseMessages.noDataFound(res, "Announcement not found");
        }

        return ResponseMessages.Response(res, "Announcement updated successfully", result.rows[0]);
    } catch (err) {
        console.error("Error updating announcement:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};

export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const query = `
            DELETE FROM announcements
            WHERE id = $1
            RETURNING *;
        `;
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return ResponseMessages.noDataFound(res, "Announcement not found");
        }

        return ResponseMessages.Response(res, "Announcement deleted successfully", result.rows[0]);
    } catch (err) {
        console.error("Error deleting announcement:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    }
};