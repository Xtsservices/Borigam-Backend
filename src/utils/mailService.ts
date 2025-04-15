// utils/mailService.ts
import { sendMail } from "./mailer";

export const sendWelcomeEmail = async ({
  to,
  firstname,
  lastname,
  userId,
  password,
}: {
  to: string;
  firstname: string;
  lastname: string;
  userId: string;
  password: string;
}) => {
  const subject = "Welcome to Our Platform";
  const html = `
    <h2>Hello ${firstname} ${lastname},</h2>
    <p>Welcome to our platform! Your account has been created.</p>
    <p><strong>Login Email:</strong> ${userId}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>Please change your password after logging in for the first time.</p>
    <br/>
    <p>Thanks,<br/>Team</p>
  `;
  await sendMail({ to, subject, html });
};
