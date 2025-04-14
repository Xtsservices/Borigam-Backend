import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { roleSchema } from "../model/role";
import { moduleSchema } from "../model/module";

import { permissionSchema } from "../model/permissions";


import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import { statuses, statusmap, getStatus } from "../utils/constants";

import logger from "../logger/logger";
import { PoolClient } from "pg";
import moment from "moment";

interface User {
    id: number;
    name: string;
    status: number;
    // Add other fields as necessary
}
interface Module {
    id: number;
    name: string;
    status: number;
    // Add other fields as necessary
}
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create role")
    try {

        const { error } = joiSchema.roleSchema.validate(req.body)


        if (error) {
            next(error)
            return
        }
        const { name } = req.body;
        let status = getStatus("active")


        const newRole: any = await baseRepository.insert(
            "role", { name, status },
            roleSchema
        );


        return ResponseMessages.Response(res, responseMessage.success, newRole)
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err)

    }
};


export const getRoles = async (req: Request, res: Response) => {
    try {
        const users: User[] = await baseRepository.findAll("role"); // Explicitly define the type of users

        if (users && users.length > 0) {
            const modifiedUsers = users.map((user: User) => ({
                ...user,  // Spread works since we now explicitly define the user as User type
                status: getStatus(user.status)  // Dynamically change the status field based on the user's actual status
            }));

            res.json(modifiedUsers);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const createModule = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into create module");

    try {
        const { error } = joiSchema.moduleSchema.validate(req.body);

        if (error) {
            next(error);
            return;
        }

        const { name } = req.body;
        const status = getStatus("active");

        const newModule: any = await baseRepository.insert(
            "module",
            { name, status },
            moduleSchema
        );

        return ResponseMessages.Response(res, responseMessage.success, newModule);
    } catch (err) {
        return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
    }
};

export const getModules = async (req: Request, res: Response) => {
    try {
        const modules: Module[] = await baseRepository.findAll("module");

        if (modules && modules.length > 0) {
            const modifiedUsers = modules.map((module: Module) => ({
                ...module,
                status: getStatus(module.status)
            }));

            res.json(modifiedUsers);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Create Permission");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const { error } = joiSchema.permissionSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const {
            role_id,
            module_id,
            read_permission,
            write_permission,
            update_permission,
            delete_permission
        } = req.body;

        // Check if the role exists
        const roleCheck = await client.query('SELECT id FROM role WHERE id = $1', [role_id]);
        if (roleCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Role not found" });
        }

        // Check if the module exists
        const moduleCheck = await client.query('SELECT id FROM module WHERE id = $1', [module_id]);
        if (moduleCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Module not found" });
        }

        // Check if permissions already exist for this role and module
        const permissionCheck = await client.query(`
        SELECT * FROM permissions WHERE role_id = $1 AND module_id = $2
      `, [role_id, module_id]);
        if (permissionCheck.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Permissions already assigned for this role and module." });
        }

        // Insert new permission
        const newPermission: any = await baseRepository.insert(
            "permissions",
            {
                role_id,
                module_id,
                read_permission,
                write_permission,
                update_permission,
                delete_permission,
            },
            permissionSchema,
            client
        );

        // Commit transaction
        await client.query("COMMIT");
        logger.info("Permission created successfully");

        return ResponseMessages.Response(res, "Permission created successfully", newPermission);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error creating permission:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};

export const updatePermission = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Update Permission");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        const { error } = joiSchema.permissionSchema.validate(req.body);
        if (error) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: error.details[0].message });
        }

        const {
            role_id,
            module_id,
            read_permission,
            write_permission,
            update_permission,
            delete_permission
        } = req.body;

        // Check if the role exists
        const roleCheck = await client.query('SELECT id FROM role WHERE id = $1', [role_id]);
        if (roleCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Role not found" });
        }

        // Check if the module exists
        const moduleCheck = await client.query('SELECT id FROM module WHERE id = $1', [module_id]);
        if (moduleCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Module not found" });
        }

        // Check if the permission exists for this role and module
        const permissionCheck = await client.query(`
        SELECT * FROM permissions WHERE role_id = $1 AND module_id = $2
      `, [role_id, module_id]);

        if (permissionCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Permission not found for this role and module" });
        }

        // Prepare update data as an object
        const updatedData = {
            read_permission,
            write_permission,
            update_permission,
            delete_permission
        };

        // Update the permission in the database
        const updatedPermission = await client.query(
            `UPDATE permissions 
        SET read_permission = $1, write_permission = $2, update_permission = $3, delete_permission = $4
        WHERE role_id = $5 AND module_id = $6 RETURNING *`,
            [
                updatedData.read_permission,
                updatedData.write_permission,
                updatedData.update_permission,
                updatedData.delete_permission,
                role_id,
                module_id
            ]
        );

        // Commit transaction
        await client.query("COMMIT");
        logger.info("Permission updated successfully");

        return ResponseMessages.Response(res, "Permission updated successfully", updatedPermission.rows[0]);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error updating permission:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};

export const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    logger.info("Entered Into Get All Permissions");

    const client: PoolClient = await baseRepository.getClient();

    try {
        await client.query("BEGIN");

        // Fetch all permissions for all roles and modules
        const permissions = await client.query(`
        SELECT 
          p.role_id,
          p.module_id,
          p.read_permission,
          p.write_permission,
          p.update_permission,
          p.delete_permission,
          r.name AS role_name,
          m.name AS module_name
        FROM permissions p
        JOIN role r ON p.role_id = r.id
        JOIN module m ON p.module_id = m.id
      `);

        // Commit transaction
        await client.query("COMMIT");

        if (permissions.rows.length === 0) {
            return res.status(404).json({ message: "No permissions found" });
        }

        logger.info("All permissions fetched successfully");
        return ResponseMessages.Response(res, "All permissions fetched successfully", permissions.rows);

    } catch (err) {
        await client.query("ROLLBACK");
        logger.error("Error fetching all permissions:", err);
        return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
    } finally {
        client.release();
    }
};



