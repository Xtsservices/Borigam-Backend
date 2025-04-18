import { NextFunction, Request, Response } from "express";
import baseRepository from "../repo/baseRepo";
import { userSchema } from "../model/user";
import { loginSchema } from "../model/login";
import { userRolesSchema } from "../model/userRoles";
import common from "../common/common";
import { joiSchema } from '../common/joiValidations/validator';
import ResponseMessages from "../common/responseMessages";
import { responseMessage } from "../utils/serverResponses";
import logger from "../logger/logger";
import { getStatus } from "../utils/constants";
import { PoolClient } from "pg";
import { getdetailsfromtoken } from "../common/tokenvalidator";
import { sendWelcomeEmail,forgotPasswordmail } from "../utils/mailService";

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  logger.info("Entered Into Create User");

  const client: PoolClient = await baseRepository.getClient();  // Use single client for the whole transaction

  try {
    await client.query("BEGIN");  // Explicitly start the transaction

    // Validate request body
    const { error } = joiSchema.userSchema.validate(req.body);
    if (error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: error.details[0].message });
    }



    const { firstname, lastname, email, countrycode, mobileno, roles } = req.body;

    // Generate random password
    const password = await common.generateRandomPassword();
    const hashedPassword = await common.hashPassword(password);


    const status = getStatus("active");

    // Check if the provided role exists in the 'role' table
    const roleData: any = await baseRepository.select(
      "role",
      { name: roles[0] }, // Ensure that 'name' exists in the 'role' table
      ['id']
    );


    if (!roleData || roleData.length === 0) {
      return res.status(400).json({ error: "Role not found" });
    }

    const roleid = roleData[0].id;  // Get the corresponding role_id


    // Insert user data into 'users' table with transaction client
    const newUser: any = await baseRepository.insert(
      "users",
      { firstname, lastname, email, countrycode, mobileno, status },
      userSchema,
      client  // Use transaction client
    );


    // Insert user login data with transaction client
    await baseRepository.insert(
      "login",
      { user_id: newUser.id, password: hashedPassword },
      loginSchema,
      client
    );

    // Insert user roles with transaction client
    const userRolesData = roles.map((roleId: number) => ({
      user_id: newUser.id,
      role_id: roleid
    }));

    await baseRepository.insertMultiple(
      "user_roles",
      userRolesData,
      userRolesSchema,
      client
    );

    await client.query("COMMIT");  // Commit the transaction
    logger.info("User created successfully");

    return ResponseMessages.Response(res, responseMessage.success, newUser);


  } catch (err) {
    await client.query("ROLLBACK");  // Rollback on any error
    return ResponseMessages.ErrorHandlerMethod(res, responseMessage.internal_server_error, err);
  } finally {
    client.release();  // Release the client back to the pool
  }
};


export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await baseRepository.findAll("users");
    res.json(users);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user: any = await baseRepository.findOne("users", "email = $1", [email]);
if (!user) {
  return res.status(400).json({ error: "Invalid email" });
}

const loginData: any = await baseRepository.findOne("login", "user_id = $1", [user.id])
    const matchPassword = await common.comparePassword(password, loginData?.password);
    if (!loginData || !matchPassword) {
      return res.status(400).json({ error: "Invalid  password" });
    }

    const token = await common.generatetoken(user.id);
    let profile: any = await common.profile(user.id);
    profile = profile[0];
    profile.status = getStatus(profile.status);

    let userRolesResult:any = await baseRepository.query(
      `SELECT role_id FROM user_roles WHERE user_id = $1`,
      [user.id]
    );
    const roleRows = userRolesResult;

    const roleIds = roleRows.map((r: any) => r.role_id);
    if (roleIds.length === 0) {
      profile.permissions = [];
      return res.json({ token, profile });
    }

    const permissionQuery = `
  SELECT 
    p.module_id,
    m.name AS module_name,
    MAX(p.read_permission::int) = 1 AS read_permission,
    MAX(p.write_permission::int) = 1 AS write_permission,
    MAX(p.update_permission::int) = 1 AS update_permission,
    MAX(p.delete_permission::int) = 1 AS delete_permission
  FROM permissions p
  JOIN module m ON p.module_id = m.id
  WHERE p.role_id = ANY($1)
  GROUP BY p.module_id, m.name
`;


    const permissionsResult:any = await baseRepository.query(permissionQuery, [roleIds]);
    profile.permissions = permissionsResult || [];

    res.json({ token, profile });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




export const myprofile = async (req: Request, res: Response) => {
  try {
    const token = req.headers['token'];
    const userDetails = await getdetailsfromtoken(token);

    let user: any = await common.profile(userDetails.id);
    user = user[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.status = getStatus(user.status);

    // 🔍 Fetch roles from user_roles
    const userRolesResults:any = await baseRepository.query(
      `SELECT role_id FROM user_roles WHERE user_id = $1`,
      [user.id]
    );

    const roleRows = userRolesResults;
    const roleIds = roleRows.map((r: any) => r.role_id);

    if (roleIds.length === 0) {
      user.permissions = [];
      return res.json(user);
    }

    // 🔐 Fetch permissions
    const permissionQuery = `
      SELECT 
        p.module_id,
        m.name AS module_name,
        MAX(p.read_permission::int) = 1 AS read_permission,
        MAX(p.write_permission::int) = 1 AS write_permission,
        MAX(p.update_permission::int) = 1 AS update_permission,
        MAX(p.delete_permission::int) = 1 AS delete_permission
      FROM permissions p
      JOIN module m ON p.module_id = m.id
      WHERE p.role_id = ANY($1)
      GROUP BY p.module_id, m.name
    `;

    const permissionsResult:any = await baseRepository.query(permissionQuery, [roleIds]);
    user.permissions = permissionsResult || [];

    return res.json(user);

  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  logger.info("Entered into Forgot Password");

  const { email } = req.body;

  if (!email) {
      return res.status(400).json({ error: "Email is required" });
  }

  const client: PoolClient = await baseRepository.getClient();

  try {
      await client.query("BEGIN");

      // Find user by email
      const userData: any = await baseRepository.select(
          "users",
          { email },
          ['id', 'firstname', 'lastname', 'email',"status"],
          client
      );

      if (!userData || userData.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({ error: "User not found" });
      }


      const user:any = userData[0];
      if(user && user.status !=2){
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Account is terminated" });
      }

      // Generate new password and hash it
      const newPassword = await common.generateRandomPassword();
      const hashedPassword = await common.hashPassword(newPassword);
      // Update password in login table
      await baseRepository.update(
        "login",
        { user_id: user.id },
        [], // no need for manual conditionValues when using object-style condition
        { password: hashedPassword, change_password: true }, // optionally update the change_password flag too
        client
      );
      

      // Send email with the new password
      await forgotPasswordmail({
          to: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          userId: user.email,
          password: newPassword
      });

      await client.query("COMMIT");

      logger.info(`Password reset email sent to ${email}`);

      return ResponseMessages.Response(res, "New password sent to your email");

  } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Forgot Password error:", err);
      return ResponseMessages.ErrorHandlerMethod(res, "Internal server error", err);
  } finally {
      client.release();
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const token = req.headers['token'];
  if (!token) {
    return res.status(401).json({ error: "Token is required" });
  }

  const userDetails = await getdetailsfromtoken(token);
  if (!userDetails || !userDetails.id) {
    return res.status(401).json({ error: "Invalid token" });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new passwords are required" });
  }

  if (currentPassword == newPassword) {
    return res.status(400).json({ error: "Passwords can't be same" });
  }

  

  const client: PoolClient = await baseRepository.getClient();

  try {
    await client.query("BEGIN");

    const userId = userDetails.id;

    const loginData: any = await baseRepository.findOne("login", "user_id = $1", [userId], client);

    if (!loginData) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Login data not found" });
    }

    const isMatch = await common.comparePassword(currentPassword, loginData.password);
    if (!isMatch) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedNewPassword = await common.hashPassword(newPassword);

    

    await baseRepository.update(
      "login",
      { user_id: userId },
      [], // no need for manual conditionValues when using object-style condition
      { password: hashedNewPassword, change_password: false }, // optionally update the change_password flag too
      client
    );

    await client.query("COMMIT");

    return res.status(200).json({ message: "Password updated successfully" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Change Password Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};








