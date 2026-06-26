// Uses Resend HTTP API directly — avoids Render's blocked SMTP ports
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
  await sendEmail(
    toEmail,
    'SpiderHub - Your OTP Code',
    `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0f1e;color:#fff;border-radius:12px;padding:32px;">
      <h2 style="color:#00e5ff;margin-bottom:8px;">SpiderHub 🔐</h2>
      <p>Hi <strong>${toName}</strong>,</p>
      <p>Your one-time verification code is:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#00e5ff;text-align:center;padding:20px;background:#111827;border-radius:8px;margin:20px 0;">
        ${otp}
      </div>
      <p style="color:#aaa;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <p style="color:#555;font-size:12px;margin-top:24px;">— SpiderHub Team</p>
    </div>
    `
  );
};

const sendVerification = async (toEmail, toName, otp) => {
  await sendEmail(
    toEmail,
    'SpiderHub - Verify Your Account',
    `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0f1e;color:#fff;border-radius:12px;padding:32px;">
      <h2 style="color:#00e5ff;margin-bottom:8px;">Welcome to SpiderHub 👋</h2>
      <p>Hi <strong>${toName}</strong>, thanks for signing up!</p>
      <p>Use this code to verify your account:</p>
      <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#00e5ff;text-align:center;padding:20px;background:#111827;border-radius:8px;margin:20px 0;">
        ${otp}
      </div>
      <p style="color:#aaa;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
      <p style="color:#555;font-size:12px;margin-top:24px;">— SpiderHub Team</p>
    </div>
    `
  );
};

module.exports = { sendOTP, sendVerification };
