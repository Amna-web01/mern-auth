import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporter = null;

if (env.smtp.host && env.smtp.user && env.smtp.pass) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

const send = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.warn(`[DEV] SMTP not configured. Email to ${to}: ${subject}`);
    console.log(text || html);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
};

export const sendVerificationEmail = async (user, token) => {
  const url = `${env.clientUrl}/verify-email?token=${token}`;
  await send({
    to: user.email,
    subject: 'Verify your email',
    text: `Verify your email: ${url}`,
    html: `<h2>Welcome ${user.name}!</h2><p>Please verify your email:</p><a href="${url}">Verify Email</a><p>Link expires in 1 hour.</p>`,
  });
};

export const sendResetPasswordEmail = async (user, token) => {
  const url = `${env.clientUrl}/reset-password?token=${token}`;
  await send({
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password: ${url}`,
    html: `<h2>Password Reset</h2><p>Click below to reset (valid 1 hour):</p><a href="${url}">Reset Password</a>`,
  });
};