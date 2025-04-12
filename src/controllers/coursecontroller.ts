import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { courseSchema } from "../model/course";
import { subjectSchema } from "../model/subject";
import { batchSchema } from "../model/batch";


import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { statuses, statusmap, getStatus } from "../utils/constants";

import logger from "../logger/logger";
import { getdetailsfromtoken } from "../common/tokenvalidator";
import { PoolClient } from "pg";
import moment from 'moment';
import pool from "../database";



export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create Course")
    try {

        const { error } = joiSchema.courseSchema.validate(req.body)


        if (error) {
            next(error)
            return
        }
        const { name } = req.body;
        let status = getStatus("active")


        const newCourse: any = await baseRepository.insert(
            "course", { name, status },
            courseSchema
        );


        return ResponseMessages.Response(res, responseMessage.success, newCourse)
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err)

    }
};
interface Course {
    id: number;
    name: string;
    status: number;
}

interface Subject {
    id: number;
    name: string;
    status: number;
}

export const getCourses = async (req: Request, res: Response) => {
    try {
        const courses: Course[] = await baseRepository.findAll("course"); // Explicitly define the type of users

        if (courses && courses.length > 0) {
            const modifiedCourse = courses.map((course: Course) => ({
                ...course,  // Spread works since we now explicitly define the user as User type
                status: getStatus(course.status)  // Dynamically change the status field based on the user's actual status
            }));

            res.json(modifiedCourse);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Entered Into update Course");

  try {
    const { error } = joiSchema.updatecourseSchema.validate(req.body);
    if (error) {
      next(error);
      return;
    }

    const { id, name } = req.body;

    // Check if the course exists
    const existingCourse = await baseRepository.findOne("course", "id = $1", [id]);
    if (!existingCourse) {
      return ResponseMessages.noDataFound(res, "Course not found");
    }

    // Check if another course with the same name exists
    const duplicateCourse = await baseRepository.findOne(
      "course",
      "name = $1 AND id != $2",
      [name, id]
    );

    if (duplicateCourse) {
      return ResponseMessages.alreadyExist(res, "Course name already exists");
    }

    // Proceed with update
    const updatedCourse: any = await baseRepository.update(
      "course",
      "id = $1",
      [id],
      { name }
    );

    return ResponseMessages.Response(res, responseMessage.success, updatedCourse);
  } catch (err) {
    return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into delete Course");
  
    try {
      const { id } = req.query;
      if(id ==null || id ==undefined){
        return ResponseMessages.invalidParameters(res, "Need CourseID");

      }
  
      // Check if the course exists
      const existingCourse :any = await baseRepository.findOne("course", "id = $1", [id]);
      if (!existingCourse) {
        return ResponseMessages.noDataFound(res, "Course not found");
      }
  
      // Check if already deleted
      if (existingCourse.status === 3) {
        return ResponseMessages.alreadyExist(res, "Course is already deleted");
      }
  
      // Soft-delete the course
      const deletedCourse: any = await baseRepository.update(
        "course",
        "id = $1",
        [id],
        { status: 3 }
      );
  
      return ResponseMessages.Response(res, "Course deleted successfully", deletedCourse);
    } catch (err) {
      return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    }
  };
  

  
  

export const createSubject = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create Subject");
    try {
        const { error } = joiSchema.subjectSchema.validate(req.body);

        if (error) {
            next(error);
            return;
        }

        const { name, course_id } = req.body;
        const status = getStatus("active");

        const course = await baseRepository.findOne("course", { id: course_id });
        if (!course) {
            return ResponseMessages.noDataFound(res,  "Course not found");
        }

        const newSubject: any = await baseRepository.insert(
            "subject",
            { name, course_id, status },
            subjectSchema
        );

        return ResponseMessages.Response(res, responseMessage.success, newSubject);
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    }
};


export const getSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id,
                s.name,
                s.status,
                s.course_id,
                c.name AS course_name
            FROM subject s
            JOIN course c ON s.course_id = c.id
        `);

        const subjects = result.rows.map((subject) => ({
            ...subject,
            status: getStatus(subject.status),
        }));

        res.json(subjects);
    } catch (error) {
        console.error("Error fetching subjects with course info:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};



export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Batch");

    const token = req.headers['token'];
    const details = await getdetailsfromtoken(token);

    const client: PoolClient = await baseRepository.getClient(); // Use single transaction client

    try {
        await client.query("BEGIN"); // Start transaction

        // Validate request body using Joi
        const { error } = joiSchema.batchSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }



        const { name, course_id, start_date, end_date } = req.body;
        const courseCheck = await client.query('SELECT id FROM course WHERE id = $1', [course_id]);
        if (courseCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Course not found" });
        }
        const status = getStatus("active");

        // Convert and validate date formats
        const startMoment = moment(start_date, "DD-MM-YYYY");
        const endMoment = moment(end_date, "DD-MM-YYYY");

        if (!startMoment.isValid() || !endMoment.isValid()) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Invalid date format. Use DD-MM-YYYY." });
        }

        // Set start to 00:00:00 and end to 23:59:59
        const parsedStartDate = startMoment.startOf('day').unix();
        const parsedEndDate = endMoment.endOf('day').unix();

        // Check that end_date is after start_date
        if (parsedEndDate <= parsedStartDate) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "End date must be after start date." });
        }


        // Get college ID from token
        const college_id = details.college_id;




        // Insert new batch into `batch` table
      
        const newBatch: any = await baseRepository.insert(
            "batch",
            {
                name,
                course_id,
                start_date: parsedStartDate,
                end_date: parsedEndDate,
                status,
                college_id
            },
            batchSchema,
            client
        );

        await client.query("COMMIT"); // Commit transaction
        logger.info("Batch created successfully");

        // Send success response
        return ResponseMessages.Response(res, "Batch created successfully", {
            batchId: newBatch.id,
            name: newBatch.name,
            course_id: newBatch.course_id,
            college_id: newBatch.college_id,
            start_date: newBatch.start_date,
            end_date: newBatch.end_date,
            status: newBatch.status
        });

    } catch (err) {
        await client.query("ROLLBACK"); // Rollback on error
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release(); // Release DB client
    }
};

export const viewAllBatches = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into View All Batches");

    const token = req.headers['token'];
    const details = await getdetailsfromtoken(token);
    const college_id = details.college_id;
    console.log("college_id from token:", college_id);

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Dynamic condition based on whether college_id is null
        const query = `
            SELECT 
                b.id AS batch_id,
                b.name,
                b.course_id,
                c.name AS course_name,
                b.college_id,
                clg.name AS college_name,
                b.start_date,
                b.end_date,
                b.status
            FROM batch b
            LEFT JOIN course c ON b.course_id = c.id
            LEFT JOIN college clg ON b.college_id = clg.id
            WHERE 
                ($1::int IS NULL AND b.college_id IS NULL)
                OR
                ($1::int IS NOT NULL AND b.college_id = $1)
            ORDER BY b.id DESC;
        `;

        const result = await client.query(query, [college_id]);

        await client.query("COMMIT");

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No batches found" });
        }
        console.log(result.rows)

        const modifiedBatches = result.rows.map((batch) => {
            const originalStatus = batch.status;
            const readableStatus = getStatus(Number(originalStatus));
            
            
            return {
              ...batch,
              status: readableStatus
            };
          });
          
      
      

        logger.info(`Retrieved ${result.rows.length} batches with college details`);

        return ResponseMessages.Response(res, "Batches retrieved successfully", modifiedBatches);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error retrieving batches:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Update Batch");
  
    const token = req.headers['token'];
    const details = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient();
  
    try {
      await client.query("BEGIN");
  
      const { error } = joiSchema.updateBatchSchema.validate(req.body); // course_id not allowed here
      if (error) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: error.details[0].message });
      }
  
      const { id, name, start_date, end_date } = req.body;
  
      // Check if batch exists and is not deleted
      const batchCheck = await client.query(
        "SELECT id, status FROM batch WHERE id = $1",
        [id]
      );
  
      if (batchCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Batch not found" });
      }
  
      const existingBatch = batchCheck.rows[0];
      if (existingBatch.status === "3") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Cannot update a deleted batch" });
      }
  
      const updateData: any = { name };
  
      if (start_date) {
        const startMoment = moment(start_date, "DD-MM-YYYY");
        if (!startMoment.isValid()) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Invalid start_date format. Use DD-MM-YYYY." });
        }
        updateData.start_date = startMoment.startOf("day").unix();
      }
  
      if (end_date) {
        const endMoment = moment(end_date, "DD-MM-YYYY");
        if (!endMoment.isValid()) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Invalid end_date format. Use DD-MM-YYYY." });
        }
        updateData.end_date = endMoment.endOf("day").unix();
      }
  
      if (updateData.start_date && updateData.end_date) {
        if (updateData.end_date <= updateData.start_date) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "End date must be after start date." });
        }
      }
  
      const updatedBatch = await baseRepository.update(
        "batch",
        "id = $1",
        [id],
        updateData,
        client
      );
  
      await client.query("COMMIT");
      logger.info(`Batch with ID ${id} updated successfully`);
  
      return ResponseMessages.Response(res, "Batch updated successfully");
  
    } catch (err) {
      await client.query("ROLLBACK");
      return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
      client.release();
    }
  };
  

  export const deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Delete Batch");
  
    const token = req.headers['token'];
    const details = await getdetailsfromtoken(token);
    const client: PoolClient = await baseRepository.getClient();
  
    try {
      await client.query("BEGIN");
  
      const { id } = req.query;
  
      if (!id) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Batch ID is required" });
      }
  
      // Check if batch exists and is not already deleted
      const existingBatch = await client.query(
        "SELECT id, status FROM batch WHERE id = $1",
        [id]
      );
  
      if (existingBatch.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Batch not found" });
      }
  
      const batch = existingBatch.rows[0];
      if (batch.status === "3") {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Batch already deleted" });
      }
  
      // Soft delete the batch by setting status = 3
      await baseRepository.update(
        "batch",
        "id = $1",
        [id],
        { status: 3 },
        client
      );
  
      await client.query("COMMIT");
      logger.info(`Batch with ID ${id} marked as deleted`);
  
      return ResponseMessages.Response(res, "Batch deleted successfully");
  
    } catch (err) {
      await client.query("ROLLBACK");
      return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
      client.release();
    }
  };
  
  








