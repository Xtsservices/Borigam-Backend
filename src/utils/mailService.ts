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
export const forgotPasswordmail = async ({
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
  const subject = "🔐 Password Reset - Your New Login Credentials";

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2>Hello ${firstname} ${lastname},</h2>
      <p>We received a request to reset your account password.</p>

      <p><strong>Login Email:</strong> ${userId}</p>
      <p><strong>New Password:</strong> ${password}</p>

      <p>Please use this password to log in and make sure to change it after your first login to keep your account secure.</p>

      <p>If you did not request this password reset, please contact our support team immediately.</p>

      <br/>
      <p>Thanks,<br/>The Team</p>
    </div>
  `;

  await sendMail({ to, subject, html });
};

