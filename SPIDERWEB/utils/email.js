const nodemailer = require('nodemailer');
const { otpEmailHtml, verificationEmailHtml } = require('../../utils/email-templates');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendOTP = async (toEmail, toName, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'SpiderHub - Your OTP Code',
    html: otpEmailHtml(toName, otp)
  });
};

const sendVerification = async (toEmail, toName, otp) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'SpiderHub - Verify Your Account',
    html: verificationEmailHtml(toName, otp)
  });
};

module.exports = { sendOTP, sendVerification };
