const otpBlock = (otp) =>
  `<div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#00e5ff;text-align:center;padding:20px;background:#111827;border-radius:8px;margin:20px 0;">${otp}</div>`;

const emailWrapper = (heading, bodyHtml) =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#0a0f1e;color:#fff;border-radius:12px;padding:32px;">
    <h2 style="color:#00e5ff;margin-bottom:8px;">${heading}</h2>
    ${bodyHtml}
    <p style="color:#555;font-size:12px;margin-top:24px;">— SpiderHub Team</p>
  </div>`;

const otpEmailHtml = (name, otp) =>
  emailWrapper(
    'SpiderHub 🔐',
    `<p>Hi <strong>${name}</strong>,</p>
     <p>Your one-time verification code is:</p>
     ${otpBlock(otp)}
     <p style="color:#aaa;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>`
  );

const verificationEmailHtml = (name, otp) =>
  emailWrapper(
    'Welcome to SpiderHub 👋',
    `<p>Hi <strong>${name}</strong>, thanks for signing up!</p>
     <p>Use this code to verify your account:</p>
     ${otpBlock(otp)}
     <p style="color:#aaa;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>`
  );

module.exports = { emailWrapper, otpBlock, otpEmailHtml, verificationEmailHtml };
