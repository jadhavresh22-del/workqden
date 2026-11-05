// backend/emailService.js
// Brevo (Sendinblue) Transactional Email Service

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send an email via Brevo REST API v3
 * Falls back to console simulation if BREVO_API_KEY is not configured.
 */
async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@worqden.com";
  const senderName = process.env.BREVO_SENDER_NAME || "WorqDen Platform";

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_brevo_api_key_here" || apiKey.startsWith("your_")) {
    console.log("\n=======================================================");
    console.log("📨 [BREVO SIMULATED EMAIL - Real email not sent because BREVO_API_KEY is missing in .env]");
    console.log(`To: ${toName ? `${toName} <${toEmail}>` : toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${textContent || htmlContent.replace(/<[^>]*>?/gm, "")}`);
    console.log("👉 Tip: Add BREVO_API_KEY and BREVO_SENDER_EMAIL in .env to send real emails to inboxes.");
    console.log("=======================================================\n");
    return { success: true, simulated: true };
  }

  try {
    const payload = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent || htmlContent.replace(/<[^>]*>?/gm, "")
    };

    console.log(`📡 Sending transactional email via Brevo to ${toEmail}...`);

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey.trim(),
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Brevo API Error Response:", data);
      return { success: false, error: data.message || "Failed to send email via Brevo" };
    }

    console.log(`✅ Brevo email sent successfully to ${toEmail} (MessageId: ${data.messageId || 'ok'})`);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error("❌ Brevo network error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Welcome Email upon registration
 */
async function sendWelcomeEmail({ email, name, userType }) {
  const typeLabels = {
    staff: "Worker / Professional",
    student: "Student Worker",
    hotel: "Hotel / Organization"
  };

  const subject = `Welcome to WorqDen, ${name}! 🎉`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121826; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #2a3449;">
      <div style="background: linear-gradient(135deg, #7C5CFC 0%, #FF7A50 100%); padding: 30px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; letter-spacing: -0.5px;">WorqDen</h1>
        <p style="margin: 6px 0 0; color: #f1f5f9; font-size: 15px;">Smart Hospitality & Job Hiring Platform</p>
      </div>
      <div style="padding: 32px 28px;">
        <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Welcome aboard, ${name}!</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          Your account as <strong>${typeLabels[userType] || userType}</strong> has been successfully created.
        </p>
        <div style="background-color: #1c2436; border-left: 4px solid #7C5CFC; padding: 16px; border-radius: 6px; margin: 24px 0;">
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">Registered Email: <strong style="color: #ffffff;">${email}</strong></p>
          <p style="margin: 6px 0 0; color: #94a3b8; font-size: 14px;">Account Type: <strong style="color: #7C5CFC;">${typeLabels[userType] || userType}</strong></p>
        </div>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          ${userType === 'hotel' 
            ? 'You can now explore available staff, search workers by skillset and location, and send hiring requests directly.' 
            : 'You can now browse available hotels and organizations, submit direct work requests, and manage your availability.'}
        </p>
        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="http://localhost:5000/login.html" style="background: linear-gradient(135deg, #7C5CFC, #FF7A50); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 15px; display: inline-block;">Login to Dashboard</a>
        </div>
      </div>
      <div style="background-color: #0b0f19; padding: 18px 24px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
        &copy; ${new Date().getFullYear()} WorqDen. All rights reserved.
      </div>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: email,
    toName: name,
    subject,
    htmlContent
  });
}

/**
 * Send Password Reset OTP Email
 */
async function sendPasswordResetOtpEmail({ email, name, otp }) {
  const subject = `Your WorqDen Password Reset Code: ${otp}`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121826; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #2a3449;">
      <div style="background: linear-gradient(135deg, #7C5CFC 0%, #FF7A50 100%); padding: 26px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 26px;">WorqDen Security</h1>
        <p style="margin: 4px 0 0; color: #f1f5f9; font-size: 14px;">Password Reset Verification</p>
      </div>
      <div style="padding: 32px 28px;">
        <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Hello ${name || 'User'},</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for your WorqDen account associated with <strong>${email}</strong>.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #94a3b8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your 6-Digit Verification Code</p>
          <div style="display: inline-block; background-color: #1c2436; border: 2px dashed #7C5CFC; padding: 14px 32px; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #FF7A50; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 10px;">This code is valid for <strong>15 minutes</strong>.</p>
        </div>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
          If you did not request this password reset, please ignore this email or reach out to support. Your password will remain unchanged.
        </p>
      </div>
      <div style="background-color: #0b0f19; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
        &copy; ${new Date().getFullYear()} WorqDen Security Team
      </div>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: email,
    toName: name,
    subject,
    htmlContent
  });
}

/**
 * Send Hiring / Work Request Notification Email
 */
async function sendRequestNotificationEmail({ recipientEmail, recipientName, senderName, position, date, message, requestType }) {
  const isWorkerRequest = requestType === "worker_to_hotel";
  const subject = isWorkerRequest 
    ? `New Work Application from ${senderName} for ${position} 🛎️`
    : `New Hiring Request from ${senderName} for ${position} 🛎️`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #121826; color: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #2a3449;">
      <div style="background: linear-gradient(135deg, #7C5CFC 0%, #FF7A50 100%); padding: 26px 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 26px;">WorqDen</h1>
        <p style="margin: 4px 0 0; color: #f1f5f9; font-size: 14px;">${isWorkerRequest ? 'New Work Application' : 'New Hiring Request'}</p>
      </div>
      <div style="padding: 32px 28px;">
        <h2 style="color: #ffffff; font-size: 20px; margin-top: 0;">Hello ${recipientName}!</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          <strong>${senderName}</strong> has sent you a ${isWorkerRequest ? 'work application' : 'hiring request'} on WorqDen.
        </p>
        <div style="background-color: #1c2436; border-left: 4px solid #FF7A50; padding: 18px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong>Position / Role:</strong> ${position || 'General Staff'}</p>
          <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;"><strong>Requested Date:</strong> ${date || 'Flexible'}</p>
          ${message ? `<p style="margin: 0; color: #94a3b8; font-size: 14px;"><strong>Message:</strong> <em>"${message}"</em></p>` : ''}
        </div>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          Please login to your WorqDen dashboard to review and accept or decline this request.
        </p>
        <div style="text-align: center; margin: 28px 0 10px;">
          <a href="http://localhost:5000/requests.html" style="background: linear-gradient(135deg, #7C5CFC, #FF7A50); color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 15px; display: inline-block;">View Requests</a>
        </div>
      </div>
      <div style="background-color: #0b0f19; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; color: #64748b; font-size: 12px;">
        &copy; ${new Date().getFullYear()} WorqDen. All rights reserved.
      </div>
    </div>
  `;

  return sendBrevoEmail({
    toEmail: recipientEmail,
    toName: recipientName,
    subject,
    htmlContent
  });
}

module.exports = {
  sendBrevoEmail,
  sendWelcomeEmail,
  sendPasswordResetOtpEmail,
  sendRequestNotificationEmail
};
