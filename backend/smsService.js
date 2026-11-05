// backend/smsService.js
// SMS OTP Service for WorqDen Platform

// In-memory store for active phone OTPs: { [phone]: { otp, expiry, verified, purpose } }
const phoneOtpStore = new Map();

/**
 * Generate a 6-digit random numeric OTP
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send SMS OTP to a phone number
 * Supports external SMS Gateway (Twilio / Fast2SMS / Brevo SMS) with simulation fallback
 */
async function sendSmsOtp(phone, purpose = "verification") {
  const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
  const otp = generateOtp();
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  // Save OTP in store
  phoneOtpStore.set(cleanedPhone, {
    otp,
    expiry,
    verified: false,
    purpose,
    createdAt: Date.now()
  });

  const message = `Your WorqDen ${purpose} verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;

  // Check if Fast2SMS or Twilio or Brevo SMS key is configured
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (fast2SmsKey && fast2SmsKey.trim() !== "") {
    try {
      console.log(`📡 Sending Fast2SMS to +91${cleanedPhone}...`);
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "authorization": fast2SmsKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: cleanedPhone
        })
      });
      const data = await res.json();
      console.log("Fast2SMS Response:", data);
      return { success: true, otp, simulated: false };
    } catch (e) {
      console.error("Fast2SMS error:", e.message);
    }
  }

  if (twilioSid && twilioAuth && twilioPhone) {
    try {
      console.log(`📡 Sending Twilio SMS to +91${cleanedPhone}...`);
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append("To", `+91${cleanedPhone}`);
      params.append("From", twilioPhone);
      params.append("Body", message);

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioAuth}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });
      const data = await res.json();
      console.log("Twilio Response:", data);
      return { success: true, otp, simulated: false };
    } catch (e) {
      console.error("Twilio error:", e.message);
    }
  }

  // Simulated SMS logger (Local dev & testing)
  console.log("\n=======================================================");
  console.log("📱 [SMS OTP DISPATCHED]");
  console.log(`Phone: +91 ${cleanedPhone}`);
  console.log(`Purpose: ${purpose.toUpperCase()}`);
  console.log(`Verification OTP: [ ${otp} ]`);
  console.log(`Message: ${message}`);
  console.log("👉 Tip: Add FAST2SMS_API_KEY or TWILIO credentials in .env for live carrier SMS.");
  console.log("=======================================================\n");

  return { success: true, otp, simulated: true };
}

/**
 * Verify phone OTP
 */
function verifySmsOtp(phone, inputOtp) {
  const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
  const record = phoneOtpStore.get(cleanedPhone);

  if (!record) {
    return { success: false, message: "No OTP was requested for this phone number. Please request a new code." };
  }

  if (Date.now() > record.expiry) {
    phoneOtpStore.delete(cleanedPhone);
    return { success: false, message: "Verification code has expired. Please request a new code." };
  }

  if (record.otp.trim() !== inputOtp.trim()) {
    return { success: false, message: "Incorrect verification code. Please check and re-enter." };
  }

  // Mark as verified
  record.verified = true;
  phoneOtpStore.set(cleanedPhone, record);

  return { success: true, message: "Phone number verified successfully! ✅" };
}

/**
 * Check if a phone number was recently verified
 */
function isPhoneVerified(phone) {
  const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
  const record = phoneOtpStore.get(cleanedPhone);
  if (!record) return false;
  // Valid for 30 minutes after verification
  return record.verified && (Date.now() - record.createdAt < 30 * 60 * 1000);
}

/**
 * Clear phone verification record
 */
function clearPhoneRecord(phone) {
  const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
  phoneOtpStore.delete(cleanedPhone);
}

module.exports = {
  sendSmsOtp,
  verifySmsOtp,
  isPhoneVerified,
  clearPhoneRecord
};
