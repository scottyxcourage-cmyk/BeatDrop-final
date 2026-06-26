const { otpEmailHtml, verificationEmailHtml } = require('./email-templates');

const sendEmail = async (to, subject, html) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }

  return res.json();
};

const sendOTP = async (toEmail, toName, otp) => {
  await sendEmail(toEmail, 'SpiderHub - Your OTP Code', otpEmailHtml(toName, otp));
};

const sendVerification = async (toEmail, toName, otp) => {
  await sendEmail(toEmail, 'SpiderHub - Verify Your Account', verificationEmailHtml(toName, otp));
};

module.exports = { sendOTP, sendVerification };
