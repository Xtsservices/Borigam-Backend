// utils/mailer.ts
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../logger/logger"; // Adjust based on your logger location

dotenv.config();

console.log(process.env.SMTP_HOST,process.env.SMTP_USER,process.env.SMTP_PASS)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMail = async ({
  to,
  subject,
  html,
  from = process.env.SMTP_FROM || "no-reply@yourdomain.com",
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) => {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
  } catch (error:any) {
    logger.error(`Failed to send email to ${to}: ${error.message}`, error);
  }
};
