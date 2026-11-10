const path = require("path");
const crypto = require("crypto");

// Load backend/.env first, fall back to root .env
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");
const {
  sendWelcomeEmail,
  sendPasswordResetOtpEmail,
  sendRequestNotificationEmail
} = require("./emailService");
const {
  sendSmsOtp,
  verifySmsOtp,
  isPhoneVerified,
  clearPhoneRecord
} = require("./smsService");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "worqden_super_secret_key_change_this_later_12345";

// Support large JSON payloads for base64 blob image uploads
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ===== MYSQL CONNECTION POOL =====
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "worqden",
  waitForConnections: true,
  connectionLimit: 10
});

// Auto-run schema migrations to ensure all required tables and columns exist
async function runAutoMigrations() {
  try {
    // 1. Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        userType VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NULL,
        password VARCHAR(255) NOT NULL,
        state VARCHAR(100) NULL,
        district VARCHAR(100) NULL,
        category VARCHAR(100) NULL,
        subcategory VARCHAR(100) NULL,
        experience VARCHAR(50) NULL,
        skills TEXT NULL,
        availability VARCHAR(50) NULL,
        about TEXT NULL,
        profileImage LONGTEXT NULL,
        hotelType VARCHAR(100) NULL,
        availablePositions TEXT NULL,
        organizationName VARCHAR(255) NULL,
        organizationType VARCHAR(100) NULL,
        resetOtp VARCHAR(10) NULL,
        resetOtpExpiry DATETIME NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Create hiring_requests table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_requests (
        id VARCHAR(50) PRIMARY KEY,
        hotelId VARCHAR(50) NOT NULL,
        hotelName VARCHAR(255) NULL,
        hotelDistrict VARCHAR(100) NULL,
        hotelState VARCHAR(100) NULL,
        workerId VARCHAR(50) NOT NULL,
        workerName VARCHAR(255) NULL,
        workerEmail VARCHAR(255) NULL,
        workerDistrict VARCHAR(100) NULL,
        workerState VARCHAR(100) NULL,
        position VARCHAR(100) NOT NULL,
        date VARCHAR(50) NULL,
        message TEXT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        senderType VARCHAR(20) DEFAULT 'hotel',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Create jobs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(50) PRIMARY KEY,
        hotelId VARCHAR(50) NOT NULL,
        hotelName VARCHAR(255) NULL,
        hotelDistrict VARCHAR(100) NULL,
        hotelState VARCHAR(100) NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100) NULL,
        salary VARCHAR(50) NULL,
        salaryType VARCHAR(50) DEFAULT 'per day',
        shift VARCHAR(50) NULL,
        workDate VARCHAR(50) NULL,
        vacancies INT DEFAULT 1,
        requirements TEXT NULL,
        description TEXT NULL,
        status VARCHAR(20) DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hotel (hotelId),
        INDEX idx_category (category),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Schema Migrations table (Idempotent tracking engine)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Helper to run a versioned migration exactly once
    const isMigrationApplied = async (v) => {
      const [rows] = await pool.query("SELECT version FROM schema_migrations WHERE version = ?", [v]);
      return rows.length > 0;
    };
    const markMigrationApplied = async (v) => {
      await pool.query("INSERT IGNORE INTO schema_migrations (version) VALUES (?)", [v]);
    };

    // 5. Users table columns migration
    const [userCols] = await pool.query("SHOW COLUMNS FROM users");
    const userFieldNames = userCols.map((c) => c.Field);

    if (!userFieldNames.includes("profileImage")) {
      await pool.query("ALTER TABLE users ADD COLUMN profileImage LONGTEXT NULL AFTER about");
      console.log(" Migration: Added profileImage column to users table");
    }

    if (!userFieldNames.includes("resetOtp")) {
      await pool.query("ALTER TABLE users ADD COLUMN resetOtp VARCHAR(10) NULL");
      console.log(" Migration: Added resetOtp column to users table");
    }

    if (!userFieldNames.includes("resetOtpExpiry")) {
      await pool.query("ALTER TABLE users ADD COLUMN resetOtpExpiry DATETIME NULL");
      console.log(" Migration: Added resetOtpExpiry column to users table");
    }

    if (!userFieldNames.includes("hotelType")) {
      await pool.query("ALTER TABLE users ADD COLUMN hotelType VARCHAR(100) NULL");
      console.log(" Migration: Added hotelType column to users table");
    }

    if (!userFieldNames.includes("availablePositions")) {
      await pool.query("ALTER TABLE users ADD COLUMN availablePositions TEXT NULL");
      console.log(" Migration: Added availablePositions column to users table");
    }

    if (!userFieldNames.includes("status")) {
      await pool.query("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
      console.log(" Migration: Added status column to users table");
    }

    // 6. Hiring requests table columns migration
    const [reqCols] = await pool.query("SHOW COLUMNS FROM hiring_requests");
    const reqFieldNames = reqCols.map((c) => c.Field);

    // Make hotelId and staffId nullable to safely support Student <-> Staff peer hiring
    const hotelIdCol = reqCols.find((c) => c.Field === "hotelId");
    if (hotelIdCol && hotelIdCol.Null === "NO") {
      await pool.query("ALTER TABLE hiring_requests MODIFY COLUMN hotelId VARCHAR(50) NULL");
      console.log(" Migration: Modified hotelId to allow NULL for peer hiring");
    }

    if (reqFieldNames.includes("staffId")) {
      await pool.query("ALTER TABLE hiring_requests MODIFY COLUMN staffId VARCHAR(50) NULL");
    }
    if (reqFieldNames.includes("staffName")) {
      await pool.query("ALTER TABLE hiring_requests MODIFY COLUMN staffName VARCHAR(255) NULL");
    }

    if (!reqFieldNames.includes("workerId")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN workerId VARCHAR(50) NULL");
      if (reqFieldNames.includes("staffId")) {
        await pool.query("UPDATE hiring_requests SET workerId = staffId WHERE workerId IS NULL");
      }
    }

    if (!reqFieldNames.includes("workerName")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN workerName VARCHAR(255) NULL");
      if (reqFieldNames.includes("staffName")) {
        await pool.query("UPDATE hiring_requests SET workerName = staffName WHERE workerName IS NULL");
      }
    }

    if (!reqFieldNames.includes("workerEmail")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN workerEmail VARCHAR(255) NULL");
    }
    if (!reqFieldNames.includes("workerDistrict")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN workerDistrict VARCHAR(100) NULL");
    }
    if (!reqFieldNames.includes("workerState")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN workerState VARCHAR(100) NULL");
    }
    if (!reqFieldNames.includes("hotelDistrict")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN hotelDistrict VARCHAR(100) NULL");
    }
    if (!reqFieldNames.includes("hotelState")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN hotelState VARCHAR(100) NULL");
    }
    if (!reqFieldNames.includes("date")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN date VARCHAR(50) NULL");
    }
    if (!reqFieldNames.includes("senderType")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN senderType VARCHAR(20) DEFAULT 'worker'");
      console.log(" Migration: Added senderType column to hiring_requests table");
    }
    if (!reqFieldNames.includes("jobId")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN jobId VARCHAR(50) NULL");
      console.log(" Migration: Added jobId column to hiring_requests table");
    }
    if (!reqFieldNames.includes("jobTitle")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN jobTitle VARCHAR(255) NULL");
      console.log(" Migration: Added jobTitle column to hiring_requests table");
    }
    if (!reqFieldNames.includes("salary")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN salary VARCHAR(50) NULL");
      console.log(" Migration: Added salary column to hiring_requests table");
    }
    if (!reqFieldNames.includes("shift")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN shift VARCHAR(50) NULL");
      console.log(" Migration: Added shift column to hiring_requests table");
    }

    // 7. Three-way routing columns (senderId, receiverId, and roles)
    if (!reqFieldNames.includes("senderId")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN senderId VARCHAR(50) NULL");
    }
    if (!reqFieldNames.includes("senderRole")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN senderRole VARCHAR(30) NULL");
    }
    if (!reqFieldNames.includes("senderName")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN senderName VARCHAR(255) NULL");
    }
    if (!reqFieldNames.includes("receiverId")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN receiverId VARCHAR(50) NULL");
    }
    if (!reqFieldNames.includes("receiverRole")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN receiverRole VARCHAR(30) NULL");
    }
    if (!reqFieldNames.includes("receiverName")) {
      await pool.query("ALTER TABLE hiring_requests ADD COLUMN receiverName VARCHAR(255) NULL");
    }

    // 8. Idempotent Historical Data Backfill for 3-way routing
    if (!(await isMigrationApplied("v2_three_way_hiring_backfill"))) {
      await pool.query(`
        UPDATE hiring_requests hr
        JOIN users u_w ON hr.workerId = u_w.id
        SET 
          hr.senderId = hr.hotelId,
          hr.senderRole = 'hotel',
          hr.senderName = hr.hotelName,
          hr.receiverId = hr.workerId,
          hr.receiverRole = u_w.userType,
          hr.receiverName = hr.workerName
        WHERE hr.senderType = 'hotel' AND hr.senderId IS NULL;
      `);

      await pool.query(`
        UPDATE hiring_requests hr
        JOIN users u_w ON hr.workerId = u_w.id
        SET 
          hr.senderId = hr.workerId,
          hr.senderRole = u_w.userType,
          hr.senderName = hr.workerName,
          hr.receiverId = hr.hotelId,
          hr.receiverRole = 'hotel',
          hr.receiverName = hr.hotelName
        WHERE hr.senderType = 'worker' AND hr.senderId IS NULL;
      `);

      // Ensure any legacy rows missing status have 'active'
      await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL OR status = ''");

      await markMigrationApplied("v2_three_way_hiring_backfill");
      console.log(" Migration: Applied and verified v2_three_way_hiring_backfill ✅");
    }

    // Repair historical corrupted / typo dates using actual createdAt timestamp
    await pool.query(`
      UPDATE hiring_requests 
      SET date = DATE_FORMAT(createdAt, '%Y-%m-%d') 
      WHERE date IS NULL OR date = '' OR date LIKE '22026%' OR date LIKE '92026%' OR date LIKE '20000%' OR date LIKE '2004%'
    `);

    console.log(" Database tables & schema verified ✅");
  } catch (err) {
    console.error(" Schema migration warning:", err.message);
  }
}

// Date sanitization helper to guarantee valid YYYY-MM-DD format
function sanitizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== "string") {
    return new Date().toISOString().split("T")[0];
  }
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y >= 2020 && y <= 2040 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 2020 && y <= 2040) {
      return parsed.toISOString().split("T")[0];
    }
  }
  return new Date().toISOString().split("T")[0];
}

// Phone normalization helper to guarantee standard 10-digit mobile format
function normalizePhoneNumber(phoneStr) {
  if (!phoneStr || typeof phoneStr !== "string") return "";
  const digitsOnly = phoneStr.replace(/\D/g, "");
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
    return digitsOnly.slice(1);
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(-10);
  }
  return digitsOnly;
}

// Middleware — Admin authorization check
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin login required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin privileges required." });
    }
    req.isAdmin = true;
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired admin session." });
  }
}

// Middleware — Authenticate User or Admin with live MySQL status lookup
// MANDATORY CONDITION: In authenticatePartyOrAdmin, verify regular user's current status from the DB on every request.
// Suspended and deactivated accounts immediately lose access even if their JWT is valid.
async function authenticatePartyOrAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Case 1: Separate Admin Session
    if (decoded.role === "admin") {
      req.isAdmin = true;
      req.admin = decoded;
      return next();
    }

    // Case 2: Regular User Session (Student, Staff, or Hotel)
    if (decoded.id && decoded.userType) {
      // Live database status check on every authenticated request
      const [userRows] = await pool.query(
        "SELECT id, userType, name, email, phone, status, district, state FROM users WHERE id = ?",
        [decoded.id]
      );

      if (userRows.length === 0) {
        return res.status(401).json({ message: "User account no longer exists in database." });
      }

      const currentUser = userRows[0];
      const userStatus = (currentUser.status || "active").toLowerCase();

      // Immediately block suspended accounts
      if (userStatus === "suspended") {
        return res.status(403).json({
          message: "Your account has been suspended by administration. Access denied."
        });
      }

      // Immediately block deactivated accounts
      if (userStatus === "deactivated") {
        return res.status(403).json({
          message: "This account has been deactivated. Please contact support."
        });
      }

      req.isAdmin = false;
      req.user = { ...currentUser, status: userStatus };
      return next();
    }

    return res.status(401).json({ message: "Invalid session structure." });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session token." });
  }
}

// Endpoint-level permission check: Only verified active accounts can send/accept hiring requests or post jobs.
// Pending accounts can browse and edit their profile, but cannot engage in hiring transactions.
function requireVerifiedToHire(req, res, next) {
  if (req.isAdmin) {
    return next();
  }
  if (req.user && req.user.status === "pending") {
    return res.status(403).json({
      message: "Your profile is pending admin approval. You can complete your profile and upload verification documents, but cannot send or accept hiring requests or post vacancies until verified."
    });
  }
  next();
}

// Helper — Clean DB row for response
function formatUser(row) {
  if (!row) return null;
  let skills = [];
  try {
    skills = row.skills ? (typeof row.skills === "string" ? JSON.parse(row.skills) : row.skills) : [];
  } catch (e) {
    skills = [];
  }
  return { ...row, skills };
}

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "WorqDen backend is running ✅", time: new Date() });
});

// ===== PHONE OTP: SEND OTP =====
app.post("/api/phone-otp/send", async (req, res) => {
  try {
    const { phone, purpose } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: "Please enter a valid phone number." });
    }

    const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
    const standardPhone = normalizePhoneNumber(cleanedPhone);

    if (!standardPhone || standardPhone.length < 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    // Check if phone already registered when registering (with normalization for prefixes)
    if (purpose === "register") {
      const [existing] = await pool.query(
        "SELECT id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR RIGHT(phone, 10) = ?",
        [standardPhone, cleanedPhone, "0" + standardPhone, standardPhone]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "This phone number is already registered. Please log in." });
      }
    }

    // Check if user exists when logging in with OTP
    if (purpose === "login") {
      const [existing] = await pool.query(
        "SELECT id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR RIGHT(phone, 10) = ?",
        [standardPhone, cleanedPhone, "0" + standardPhone, standardPhone]
      );
      if (existing.length === 0) {
        return res.status(404).json({ message: "No account found matching this phone number. Please register first." });
      }
    }

    const smsResult = await sendSmsOtp(standardPhone, purpose || "verification");

    const maskedPhone = cleanedPhone.length >= 10
      ? cleanedPhone.substring(0, 2) + "******" + cleanedPhone.substring(cleanedPhone.length - 2)
      : cleanedPhone;

    res.status(200).json({
      success: true,
      message: `6-Digit OTP sent to +91 ${maskedPhone}`,
      phone: cleanedPhone,
      maskedPhone,
      devOtp: smsResult.otp
    });
  } catch (err) {
    console.error("Send Phone OTP Error:", err);
    res.status(500).json({ message: "Could not send SMS OTP. Please try again." });
  }
});

// ===== PHONE OTP: VERIFY OTP =====
app.post("/api/phone-otp/verify", (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and 6-digit OTP are required." });
    }

    const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
    const normPhone = normalizePhoneNumber(phone) || cleanedPhone;

    let result = verifySmsOtp(normPhone, otp);
    if (!result.success && normPhone !== cleanedPhone) {
      result = verifySmsOtp(cleanedPhone, otp);
    }

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(200).json({
      success: true,
      message: "Phone number verified successfully! ✅",
      phone: normPhone
    });
  } catch (err) {
    console.error("Verify Phone OTP Error:", err);
    res.status(500).json({ message: "Verification failed. Please try again." });
  }
});

// ===== PHONE OTP: 1-CLICK LOGIN WITH OTP =====
app.post(["/api/phone-otp/login", "/api/login/phone-otp"], async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone number and OTP code are required." });
    }

    const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
    const normPhone = normalizePhoneNumber(phone) || cleanedPhone;

    let verifyResult = verifySmsOtp(normPhone, otp);
    if (!verifyResult.success && normPhone !== cleanedPhone) {
      verifyResult = verifySmsOtp(cleanedPhone, otp);
    }

    if (!verifyResult.success) {
      return res.status(400).json({ message: verifyResult.message });
    }

    const phoneCandidates = [normPhone, cleanedPhone];
    if (normPhone && normPhone.length === 10) {
      phoneCandidates.push("0" + normPhone);
      phoneCandidates.push("91" + normPhone);
    }

    const [rows] = await pool.query(
      `SELECT * FROM users WHERE phone IN (${phoneCandidates.map(() => "?").join(",")})`,
      phoneCandidates
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found with this phone number." });
    }

    const user = rows[0];
    const userStatus = (user.status || "active").toLowerCase();

    if (userStatus === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended by WorqDen Administration. Please contact support@worqden.com for assistance." });
    }
    if (userStatus === "deactivated") {
      return res.status(403).json({ message: "This account has been deactivated. Please contact support to reactivate your account." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, resetOtp: _otp, resetOtpExpiry: _exp, ...userWithoutPassword } = formatUser(user);

    clearPhoneRecord(normPhone);
    clearPhoneRecord(cleanedPhone);

    res.status(200).json({
      message: "Phone login successful! ✅",
      token,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error("Phone OTP Login Error:", err);
    res.status(500).json({ message: "Phone login failed. Please try again." });
  }
});

// ===== REGISTER ROUTE =====
app.post("/api/register", async (req, res) => {
  try {
    const {
      userType,
      name,
      email,
      phone,
      password,
      state,
      district,
      category,
      subcategory,
      experience,
      skills,
      availability,
      about,
      organizationName,
      organizationType,
      profileImage
    } = req.body;

    if (!userType || !name || !email || !phone || !password) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    // Strict email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address (e.g. name@example.com)." });
    }

    // Phone validation and normalization to standard 10 digits
    const cleanedPhone = phone.trim().replace(/[\s\-()+]/g, "");
    const standardPhone = normalizePhoneNumber(cleanedPhone);
    if (!standardPhone || standardPhone.length < 10) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    // Precise and distinct duplicate checks for both Email and Phone
    const [existingEmail] = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = ?",
      [normalizedEmail]
    );

    const [existingPhone] = await pool.query(
      "SELECT id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR RIGHT(phone, 10) = ?",
      [standardPhone, cleanedPhone, "0" + standardPhone, standardPhone]
    );

    const emailTaken = existingEmail.length > 0;
    const phoneTaken = existingPhone.length > 0;

    if (emailTaken && phoneTaken) {
      return res.status(409).json({
        message: "Both this email address and phone number are already registered. Please log in."
      });
    }
    if (emailTaken) {
      return res.status(409).json({
        message: "This email address is already registered. Please log in."
      });
    }
    if (phoneTaken) {
      return res.status(409).json({
        message: "This phone number is already registered. Please log in."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newId = Date.now().toString();

    await pool.query(
      `INSERT INTO users
        (id, userType, name, email, phone, password, state, district, category, subcategory, experience, skills, availability, about, organizationName, organizationType, profileImage, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        newId,
        userType,
        name.trim(),
        normalizedEmail,
        standardPhone,
        hashedPassword,
        state || "",
        district || "",
        category || "",
        subcategory || "",
        experience || "",
        JSON.stringify(skills || []),
        availability || "",
        about || "",
        organizationName || "",
        organizationType || "",
        profileImage || ""
      ]
    );

    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [newId]);
    const { password: _pw, resetOtp: _otp, resetOtpExpiry: _exp, ...userWithoutPassword } = formatUser(rows[0]);

    // Send Welcome Email asynchronously via Brevo
    sendWelcomeEmail({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      userType
    }).catch((err) => console.error("Welcome email error:", err.message));

    clearPhoneRecord(cleanedPhone);

    res.status(201).json({
      message: "Registration successful! Welcome to WorqDen.",
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

// ===== LOGIN ROUTE (Supports Email OR Phone) =====
app.post("/api/login", async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = (identifier || email || phone || "").trim();

    if (!loginId || !password) {
      return res.status(400).json({ message: "Email / Phone and password are required." });
    }

    const cleanedId = loginId.replace(/[\s\-()+]/g, "");

    // Query user by email OR phone
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR phone = ? OR phone = ?",
      [loginId, loginId, cleanedId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No registered account found with this email or mobile number. Please check your spelling or sign up." });
    }

    const user = rows[0];
    const userStatus = (user.status || "active").toLowerCase();

    if (userStatus === "suspended") {
      return res.status(403).json({ message: "Your account has been suspended by WorqDen Administration. Please contact support@worqden.com for assistance." });
    }
    if (userStatus === "deactivated") {
      return res.status(403).json({ message: "This account has been deactivated. Please contact support to reactivate your account." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Incorrect password. Please try again or click 'Forgot password?'." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, resetOtp: _otp, resetOtpExpiry: _exp, ...userWithoutPassword } = formatUser(user);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
});

// ===== FORGOT PASSWORD (Generate OTP & Send Brevo Email + SMS) =====
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ message: "Please enter your registered email or phone number." });
    }

    const queryStr = identifier.trim();
    const cleanedPhone = queryStr.replace(/[\s\-()+]/g, "");

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR phone = ? OR phone = ?",
      [queryStr, queryStr, cleanedPhone]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "No account found matching this email or phone number." });
    }

    const user = rows[0];

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiry: 15 minutes from now
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      "UPDATE users SET resetOtp = ?, resetOtpExpiry = ? WHERE id = ?",
      [otp, expiry, user.id]
    );

    // Send OTP via Brevo Email
    await sendPasswordResetOtpEmail({
      email: user.email,
      name: user.name,
      otp
    });

    // Also send SMS OTP to registered phone
    if (user.phone) {
      await sendSmsOtp(user.phone, "password reset");
    }

    // Masked email for display e.g. j***@domain.com
    const emailParts = user.email.split("@");
    const maskedName = emailParts[0].length > 2 
      ? emailParts[0][0] + "***" + emailParts[0][emailParts[0].length - 1]
      : emailParts[0][0] + "***";
    const maskedEmail = `${maskedName}@${emailParts[1]}`;

    const maskedPhone = user.phone && user.phone.length >= 10
      ? user.phone.substring(0, 2) + "******" + user.phone.substring(user.phone.length - 2)
      : user.phone;

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${maskedEmail} and +91 ${maskedPhone}.`,
      email: user.email,
      maskedEmail,
      phone: user.phone,
      maskedPhone,
      devOtp: otp
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Could not process password reset request." });
  }
});

// ===== RESET PASSWORD (Verify OTP & Set New Password) =====
app.post("/api/reset-password", async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ message: "Identifier, OTP code, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const queryStr = identifier.trim();
    const cleanedPhone = queryStr.replace(/[\s\-()+]/g, "");

    const [rows] = await pool.query(
      "SELECT * FROM users WHERE (LOWER(email) = LOWER(?) OR phone = ? OR phone = ?)",
      [queryStr, queryStr, cleanedPhone]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User account not found." });
    }

    const user = rows[0];

    if (!user.resetOtp || user.resetOtp.trim() !== otp.trim()) {
      return res.status(400).json({ message: "Invalid verification code. Please check and try again." });
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      return res.status(400).json({ message: "Verification code has expired. Please request a new code." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear OTP
    await pool.query(
      "UPDATE users SET password = ?, resetOtp = NULL, resetOtpExpiry = NULL WHERE id = ?",
      [hashedPassword, user.id]
    );

    res.status(200).json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Could not reset password. Please try again." });
  }
});

// ===== GET PROFILE (by email or id) =====
app.get("/api/profile/:identifier", async (req, res) => {
  try {
    const param = decodeURIComponent(req.params.identifier).trim();
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR id = ?",
      [param, param]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const { password: _pw, resetOtp: _otp, resetOtpExpiry: _exp, ...userWithoutPassword } = formatUser(rows[0]);
    res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== UPDATE PROFILE (General Details + Skills + About) =====
app.put("/api/profile", async (req, res) => {
  try {
    const {
      email,
      name,
      phone,
      state,
      district,
      category,
      subcategory,
      experience,
      skills,
      availability,
      about,
      organizationName,
      organizationType,
      profileImage
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "User email is required to update profile." });
    }

    const [existing] = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER(?)",
      [email.trim()]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = existing[0];

    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedPhone = phone !== undefined ? phone.trim() : user.phone;
    const updatedState = state !== undefined ? state.trim() : user.state;
    const updatedDistrict = district !== undefined ? district.trim() : user.district;
    const updatedCategory = category !== undefined ? category : user.category;
    const updatedSubcategory = subcategory !== undefined ? subcategory : user.subcategory;
    const updatedExp = experience !== undefined ? experience : user.experience;
    const updatedSkills = skills !== undefined ? JSON.stringify(skills) : user.skills;
    const updatedAvail = availability !== undefined ? availability : user.availability;
    const updatedAbout = about !== undefined ? about : user.about;
    const updatedOrgName = organizationName !== undefined ? organizationName.trim() : user.organizationName;
    const updatedOrgType = organizationType !== undefined ? organizationType : user.organizationType;
    const updatedImage = profileImage !== undefined ? profileImage : user.profileImage;

    await pool.query(
      `UPDATE users SET 
        name = ?, phone = ?, state = ?, district = ?, category = ?, subcategory = ?,
        experience = ?, skills = ?, availability = ?, about = ?, organizationName = ?,
        organizationType = ?, profileImage = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedPhone,
        updatedState,
        updatedDistrict,
        updatedCategory,
        updatedSubcategory,
        updatedExp,
        updatedSkills,
        updatedAvail,
        updatedAbout,
        updatedOrgName,
        updatedOrgType,
        updatedImage,
        user.id
      ]
    );

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ?", [user.id]);
    const { password: _pw, resetOtp: _otp, resetOtpExpiry: _exp, ...cleanUser } = formatUser(updatedRows[0]);

    res.status(200).json({
      message: "Profile updated successfully!",
      user: cleanUser
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// ===== UPDATE PROFILE IMAGE (Blob Base64 Data URL) =====
app.put("/api/profile/image", async (req, res) => {
  try {
    const { email, id, profileImage } = req.body;

    if ((!email && !id) || profileImage === undefined) {
      return res.status(400).json({ message: "User identifier and profileImage are required." });
    }

    let query = "UPDATE users SET profileImage = ? WHERE ";
    const params = [profileImage];

    if (id) {
      query += "id = ?";
      params.push(id);
    } else {
      query += "LOWER(email) = LOWER(?)";
      params.push(email.trim());
    }

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile image saved successfully!",
      profileImage
    });
  } catch (error) {
    console.error("Profile image update error:", error);
    res.status(500).json({ message: "Failed to save profile image." });
  }
});

// ===== FIND STAFF & TALENT (Search & Filter for Hotels and Peer Roles) =====
app.get(["/api/staff", "/api/students"], async (req, res) => {
  try {
    const isStudentsOnly = req.path.includes("/students");
    const { category, subcategory, state, district, experience, availability, search, userType } = req.query;

    let query = "SELECT * FROM users WHERE ";
    const params = [];

    if (isStudentsOnly) {
      query += "userType = 'student'";
    } else if (userType) {
      query += "userType = ?";
      params.push(userType);
    } else {
      query += "(userType = 'staff' OR userType = 'student')";
    }

    if (category) { query += " AND category = ?"; params.push(category); }
    if (subcategory) { query += " AND subcategory = ?"; params.push(subcategory); }
    if (state) { query += " AND state = ?"; params.push(state); }
    if (district) { query += " AND district = ?"; params.push(district); }
    if (experience) { query += " AND experience = ?"; params.push(experience); }
    if (availability) { query += " AND availability = ?"; params.push(availability); }
    if (search && search.trim()) {
      query += " AND (name LIKE ? OR category LIKE ? OR subcategory LIKE ? OR district LIKE ? OR about LIKE ?)";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    query += " ORDER BY createdAt DESC";

    const [rows] = await pool.query(query, params);

    const safeResults = rows.map((row) => {
      const { password: _p, resetOtp: _o, resetOtpExpiry: _e, ...rest } = formatUser(row);
      return rest;
    });

    res.status(200).json({ count: safeResults.length, staff: safeResults, students: safeResults });
  } catch (error) {
    console.error("Find staff/students error:", error);
    res.status(500).json({ message: "Failed to search talent." });
  }
});

// ===== FIND HOTELS (Search & Filter for Workers) =====
app.get("/api/hotels", async (req, res) => {
  try {
    const { organizationType, state, district, search } = req.query;

    let query = "SELECT * FROM users WHERE userType = 'hotel'";
    const params = [];

    if (organizationType) {
      query += " AND (organizationType = ? OR hotelType = ?)";
      params.push(organizationType, organizationType);
    }
    if (state) {
      query += " AND state = ?";
      params.push(state);
    }
    if (district) {
      query += " AND district = ?";
      params.push(district);
    }
    if (search && search.trim()) {
      query += " AND (organizationName LIKE ? OR name LIKE ? OR district LIKE ? OR state LIKE ? OR about LIKE ?)";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    query += " ORDER BY createdAt DESC";

    const [rows] = await pool.query(query, params);

    const safeHotels = rows.map((row) => {
      const { password: _p, resetOtp: _o, resetOtpExpiry: _e, ...rest } = formatUser(row);
      return rest;
    });

    res.status(200).json({ count: safeHotels.length, hotels: safeHotels });
  } catch (error) {
    console.error("Find hotels error:", error);
    res.status(500).json({ message: "Failed to search available hotels." });
  }
});

// ===== SEND REQUEST (Full 3-Way Hiring: Student <-> Hotel, Staff <-> Hotel, Student <-> Staff) =====
app.post(["/api/requests", "/api/hiring-request"], authenticatePartyOrAdmin, requireVerifiedToHire, async (req, res) => {
  try {
    const caller = req.user; // { id, userType, name, email, ... }
    const { 
      receiverId, 
      workerId, 
      staffId, 
      hotelId, 
      position, 
      date, 
      message, 
      senderType,
      salary,
      shift,
      jobId,
      jobTitle
    } = req.body;

    // Determine target recipient ID cleanly
    const targetReceiverId = receiverId || (req.isAdmin ? (workerId || staffId || hotelId) : (caller.userType === "hotel" ? (workerId || staffId) : (hotelId || workerId || staffId)));
    const targetSenderId = req.isAdmin ? (req.body.senderId || caller.id) : caller.id;

    if (!targetSenderId || !targetReceiverId) {
      return res.status(400).json({ message: "Both sender and recipient are required to initiate a hiring request." });
    }

    if (String(targetSenderId) === String(targetReceiverId)) {
      return res.status(400).json({ message: "You cannot send a hiring request to yourself." });
    }

    const [senderRows] = await pool.query("SELECT * FROM users WHERE id = ?", [targetSenderId]);
    const [receiverRows] = await pool.query("SELECT * FROM users WHERE id = ?", [targetReceiverId]);

    if (senderRows.length === 0 || receiverRows.length === 0) {
      return res.status(404).json({ message: "Target sender or recipient profile was not found in database." });
    }

    const senderUser = senderRows[0];
    const receiverUser = receiverRows[0];

    // Ensure recipient is active
    const receiverStatus = (receiverUser.status || "active").toLowerCase();
    if (receiverStatus === "suspended" || receiverStatus === "deactivated") {
      return res.status(400).json({ message: "The recipient account is currently inactive and cannot receive hiring requests." });
    }

    const newId = Date.now().toString();
    const finalDate = sanitizeDate(date);
    const finalPosition = (position && position.trim()) ? position.trim() : (receiverUser.subcategory || receiverUser.category || "Hospitality Associate");
    const targetSalary = salary || "";
    const targetShift = shift || "";
    const targetJobId = jobId || null;
    const targetJobTitle = jobTitle || finalPosition;

    // Role assignments for 3-way routing
    const senderRole = senderUser.userType;
    const receiverRole = receiverUser.userType;
    const senderName = senderUser.organizationName || senderUser.name;
    const receiverName = receiverUser.organizationName || receiverUser.name;

    // Legacy fields mapping for full backward compatibility
    let legacyHotelId = null;
    let legacyHotelName = null;
    let legacyHotelDistrict = "";
    let legacyHotelState = "";
    let legacyWorkerId = null;
    let legacyWorkerName = null;
    let legacyWorkerEmail = "";
    let legacyWorkerDistrict = "";
    let legacyWorkerState = "";
    let legacyStaffId = null;
    let legacyStaffName = null;
    let legacySenderType = "worker";

    if (senderRole === "hotel") {
      legacyHotelId = senderUser.id;
      legacyHotelName = senderName;
      legacyHotelDistrict = senderUser.district || "";
      legacyHotelState = senderUser.state || "";
      legacyWorkerId = receiverUser.id;
      legacyWorkerName = receiverName;
      legacyWorkerEmail = receiverUser.email || "";
      legacyWorkerDistrict = receiverUser.district || "";
      legacyWorkerState = receiverUser.state || "";
      legacyStaffId = receiverUser.id;
      legacyStaffName = receiverName;
      legacySenderType = "hotel";
    } else if (receiverRole === "hotel") {
      legacyHotelId = receiverUser.id;
      legacyHotelName = receiverName;
      legacyHotelDistrict = receiverUser.district || "";
      legacyHotelState = receiverUser.state || "";
      legacyWorkerId = senderUser.id;
      legacyWorkerName = senderName;
      legacyWorkerEmail = senderUser.email || "";
      legacyWorkerDistrict = senderUser.district || "";
      legacyWorkerState = senderUser.state || "";
      legacyStaffId = senderUser.id;
      legacyStaffName = senderName;
      legacySenderType = "worker";
    } else {
      // Peer hiring: Student <-> Staff
      legacyHotelId = null;
      legacyHotelName = null;
      if (senderRole === "staff") {
        legacyStaffId = senderUser.id;
        legacyStaffName = senderName;
        legacyWorkerId = receiverUser.id;
        legacyWorkerName = receiverName;
        legacyWorkerEmail = receiverUser.email || "";
        legacyWorkerDistrict = receiverUser.district || "";
        legacyWorkerState = receiverUser.state || "";
        legacySenderType = "staff";
      } else {
        legacyStaffId = receiverUser.id;
        legacyStaffName = receiverName;
        legacyWorkerId = senderUser.id;
        legacyWorkerName = senderName;
        legacyWorkerEmail = senderUser.email || "";
        legacyWorkerDistrict = senderUser.district || "";
        legacyWorkerState = senderUser.state || "";
        legacySenderType = "student";
      }
    }

    // Prevent duplicate pending request for the exact same sender, receiver and position
    const [existingPending] = await pool.query(
      `SELECT id FROM hiring_requests 
       WHERE ((senderId = ? AND receiverId = ?) OR (hotelId = ? AND workerId = ?)) 
         AND position = ? AND status = 'pending'`,
      [senderUser.id, receiverUser.id, legacyHotelId || "NONE", legacyWorkerId || "NONE", finalPosition]
    );

    if (existingPending.length > 0) {
      return res.status(409).json({ message: "A pending hiring request or application already exists for this position." });
    }

    await pool.query(
      `INSERT INTO hiring_requests
        (id, hotelId, hotelName, hotelDistrict, hotelState, staffId, staffName,
         workerId, workerName, workerEmail, workerDistrict, workerState,
         senderId, senderRole, senderName, receiverId, receiverRole, receiverName,
         position, date, message, status, senderType, jobId, jobTitle, salary, shift)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        newId,
        legacyHotelId,
        legacyHotelName,
        legacyHotelDistrict,
        legacyHotelState,
        legacyStaffId,
        legacyStaffName,
        legacyWorkerId,
        legacyWorkerName,
        legacyWorkerEmail,
        legacyWorkerDistrict,
        legacyWorkerState,
        senderUser.id,
        senderRole,
        senderName,
        receiverUser.id,
        receiverRole,
        receiverName,
        finalPosition,
        finalDate,
        message || "",
        legacySenderType,
        targetJobId,
        targetJobTitle,
        targetSalary,
        targetShift
      ]
    );

    const [rows] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [newId]);

    // Send email notification asynchronously
    sendRequestNotificationEmail({
      recipientEmail: receiverUser.email,
      recipientName: receiverName,
      senderName: senderName,
      position: finalPosition,
      date: finalDate,
      message,
      requestType: senderRole === "hotel" ? "hotel_to_worker" : "worker_to_hotel"
    }).catch((e) => console.error("Notification email error:", e.message));

    res.status(201).json({
      success: true,
      message: "Hiring request sent successfully! ✅",
      request: rows[0]
    });
  } catch (error) {
    console.error("Hiring request error:", error);
    res.status(500).json({ message: "Failed to send request. " + error.message });
  }
});

// ===== GET REQUESTS (Strict Session Authorization + 3-Way Compatibility) =====
app.get(["/api/requests", "/api/hiring-requests"], authenticatePartyOrAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const isPlatformAdmin = req.isAdmin;
    const callerId = req.user ? req.user.id : null;

    let query = `
      SELECT r.*,
        u_s.profileImage as senderImage, u_s.phone as senderPhone, u_s.email as senderEmail,
        u_r.profileImage as receiverImage, u_r.phone as receiverPhone, u_r.email as receiverEmail,
        u_w.profileImage as workerImage, u_w.phone as workerPhone, u_w.email as workerEmail, u_w.category as workerCategory, u_w.subcategory as workerSubcategory,
        u_h.profileImage as hotelImage, u_h.phone as hotelPhone, u_h.email as hotelEmail, u_h.organizationType as hotelOrgType
      FROM hiring_requests r
      LEFT JOIN users u_s ON r.senderId = u_s.id
      LEFT JOIN users u_r ON r.receiverId = u_r.id
      LEFT JOIN users u_w ON r.workerId = u_w.id
      LEFT JOIN users u_h ON r.hotelId = u_h.id
      WHERE 1=1
    `;
    const params = [];

    // Security Rule: Regular users can ONLY inspect requests they are party to. Zero spying on other contracts.
    if (!isPlatformAdmin) {
      query += ` AND (r.senderId = ? OR r.receiverId = ? OR r.workerId = ? OR r.hotelId = ? OR r.staffId = ?)`;
      params.push(callerId, callerId, callerId, callerId, callerId);
    } else {
      // Admin filter support
      if (req.query.userId) {
        query += ` AND (r.senderId = ? OR r.receiverId = ? OR r.workerId = ? OR r.hotelId = ?)`;
        params.push(req.query.userId, req.query.userId, req.query.userId, req.query.userId);
      }
    }

    if (status) {
      query += " AND LOWER(r.status) = LOWER(?)";
      params.push(status);
    }

    query += " ORDER BY r.createdAt DESC";

    const [rows] = await pool.query(query, params);

    const normalizedRows = rows.map((r) => ({
      ...r,
      status: (r.status || "pending").toLowerCase()
    }));

    res.status(200).json({ count: normalizedRows.length, requests: normalizedRows });
  } catch (error) {
    console.error("Fetch requests error:", error);
    res.status(500).json({ message: "Failed to load requests." });
  }
});

// ===== GET SINGLE REQUEST (Guarded by Ownership) =====
app.get("/api/requests/:id", authenticatePartyOrAdmin, async (req, res) => {
  try {
    const isPlatformAdmin = req.isAdmin;
    const callerId = req.user ? req.user.id : null;

    const [rows] = await pool.query(
      `SELECT r.*,
        u_s.profileImage as senderImage, u_s.phone as senderPhone, u_s.email as senderEmail,
        u_r.profileImage as receiverImage, u_r.phone as receiverPhone, u_r.email as receiverEmail,
        u_w.profileImage as workerImage, u_w.phone as workerPhone, u_w.email as workerEmail,
        u_h.profileImage as hotelImage, u_h.phone as hotelPhone, u_h.email as hotelEmail
      FROM hiring_requests r
      LEFT JOIN users u_s ON r.senderId = u_s.id
      LEFT JOIN users u_r ON r.receiverId = u_r.id
      LEFT JOIN users u_w ON r.workerId = u_w.id
      LEFT JOIN users u_h ON r.hotelId = u_h.id
      WHERE r.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const request = rows[0];

    // Ownership check
    if (!isPlatformAdmin) {
      const isParty = [request.senderId, request.receiverId, request.workerId, request.hotelId, request.staffId].includes(callerId);
      if (!isParty) {
        return res.status(403).json({ message: "Access denied. You are not a party to this hiring request." });
      }
    }

    res.status(200).json({
      request: {
        ...request,
        status: (request.status || "pending").toLowerCase()
      }
    });
  } catch (error) {
    console.error("Fetch single request error:", error);
    res.status(500).json({ message: "Failed to load request details." });
  }
});

// ===== LEGACY SECURED ENDPOINT: HOTEL REQUESTS =====
app.get("/api/hiring-requests/hotel/:hotelId", authenticatePartyOrAdmin, async (req, res) => {
  try {
    const requestedHotelId = req.params.hotelId;

    // Authorization: Must be Admin OR the verified Hotel owner
    const isHotelOwner = req.user && req.user.id === requestedHotelId && req.user.userType === "hotel";
    if (!req.isAdmin && !isHotelOwner) {
      return res.status(403).json({
        message: "Access denied. You can only view requests directed to your own hotel property."
      });
    }

    const [rows] = await pool.query(
      `SELECT r.*, u.profileImage as staffImage, u.phone as staffPhone, u.email as staffEmail, 
              u.category as staffCategory, u.subcategory as staffSubcategory
       FROM hiring_requests r
       LEFT JOIN users u ON r.workerId = u.id
       WHERE r.hotelId = ?
       ORDER BY r.createdAt DESC`,
      [requestedHotelId]
    );
    res.status(200).json({ requests: rows.map(r => ({ ...r, status: (r.status || "pending").toLowerCase() })) });
  } catch (error) {
    console.error("Fetch hotel requests error:", error);
    res.status(500).json({ message: "Failed to load hotel requests." });
  }
});

// ===== LEGACY SECURED ENDPOINT: STAFF/STUDENT REQUESTS =====
app.get("/api/hiring-requests/staff/:staffId", authenticatePartyOrAdmin, async (req, res) => {
  try {
    const requestedStaffId = req.params.staffId;

    // Authorization: Must be Admin OR the verified Worker/Student owner
    const isWorkerOwner = req.user && req.user.id === requestedStaffId && (req.user.userType === "staff" || req.user.userType === "student");
    if (!req.isAdmin && !isWorkerOwner) {
      return res.status(403).json({
        message: "Access denied. You can only view your own worker requests."
      });
    }

    // Exact 4 matching parameters binding to 4 SQL placeholders:
    const queryParams = [
      requestedStaffId,
      requestedStaffId,
      requestedStaffId,
      requestedStaffId
    ];

    const [rows] = await pool.query(
      `SELECT r.*, u.profileImage as hotelImage, u.phone as hotelPhone, u.email as hotelEmail, 
              u.organizationType as hotelOrgType, u.district as hotelDistrict, u.state as hotelState
       FROM hiring_requests r
       LEFT JOIN users u ON r.hotelId = u.id
       WHERE r.workerId = ? OR r.staffId = ? OR r.receiverId = ? OR r.senderId = ?
       ORDER BY r.createdAt DESC`,
      queryParams
    );
    res.status(200).json({ requests: rows.map(r => ({ ...r, status: (r.status || "pending").toLowerCase() })) });
  } catch (error) {
    console.error("Fetch staff requests error:", error);
    res.status(500).json({ message: "Failed to load worker requests." });
  }
});

// ===== UPDATE REQUEST STATUS (Atomic Conditional Update & Concurrency Protection) =====
app.patch(["/api/requests/:id/status", "/api/requests/:id"], authenticatePartyOrAdmin, requireVerifiedToHire, async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    const callerId = req.user ? req.user.id : null;
    const isPlatformAdmin = req.isAdmin;

    if (!status) {
      return res.status(400).json({ message: "Status is required (accepted, rejected, or cancelled)." });
    }

    const normalizedStatus = status.toLowerCase();
    if (!["accepted", "rejected", "cancelled", "withdrawn"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status. Must be accepted, rejected, or cancelled." });
    }

    const targetStatus = normalizedStatus === "withdrawn" ? "cancelled" : normalizedStatus;

    // First fetch the current record to check ownership
    const [rows] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const currentReq = rows[0];
    const currentStatus = (currentReq.status || "pending").toLowerCase();

    // Verify it is still pending
    if (currentStatus !== "pending" && !isPlatformAdmin) {
      return res.status(409).json({
        message: `Conflict: This request has already been ${currentStatus} and cannot be modified.`
      });
    }

    // Determine ownership
    const effectiveSenderId = currentReq.senderId || (currentReq.senderType === "hotel" ? currentReq.hotelId : currentReq.workerId);
    const effectiveReceiverId = currentReq.receiverId || (currentReq.senderType === "hotel" ? currentReq.workerId : currentReq.hotelId);

    if (["accepted", "rejected"].includes(targetStatus)) {
      // ONLY recipient or Admin can accept/reject
      if (!isPlatformAdmin && String(callerId) !== String(effectiveReceiverId)) {
        return res.status(403).json({ message: "Unauthorized. Only the recipient can accept or decline this offer." });
      }

      // Atomic Conditional Update: Only succeeds if status is still 'pending'
      const [updateResult] = await pool.query(
        "UPDATE hiring_requests SET status = ? WHERE id = ? AND LOWER(status) = 'pending'",
        [targetStatus, id]
      );

      if (updateResult.affectedRows === 0 && !isPlatformAdmin) {
        return res.status(409).json({ message: "Concurrency conflict: This request was modified by another operation." });
      }
    } else if (targetStatus === "cancelled") {
      // ONLY sender or Admin can cancel/withdraw
      if (!isPlatformAdmin && String(callerId) !== String(effectiveSenderId)) {
        return res.status(403).json({ message: "Unauthorized. Only the original sender can withdraw this request." });
      }

      // Atomic Conditional Update
      const [updateResult] = await pool.query(
        "UPDATE hiring_requests SET status = 'cancelled' WHERE id = ? AND LOWER(status) = 'pending'",
        [id]
      );

      if (updateResult.affectedRows === 0 && !isPlatformAdmin) {
        return res.status(409).json({ message: "Concurrency conflict: This request was modified by another operation." });
      }
    }

    const [updated] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [id]);
    res.status(200).json({
      success: true,
      message: `Request status updated to ${targetStatus}!`,
      request: { ...updated[0], status: targetStatus }
    });
  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({ message: "Failed to update request status. " + error.message });
  }
});

// Dedicated Cancel / Withdraw endpoint with ownership check
app.all(["/api/requests/:id/cancel", "/api/requests/:id/withdraw"], authenticatePartyOrAdmin, requireVerifiedToHire, async (req, res) => {
  try {
    const { id } = req.params;
    const callerId = req.user ? req.user.id : null;
    const isPlatformAdmin = req.isAdmin;

    const [rows] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Request not found." });

    const currentReq = rows[0];
    const effectiveSenderId = currentReq.senderId || (currentReq.senderType === "hotel" ? currentReq.hotelId : currentReq.workerId);

    if (!isPlatformAdmin && String(callerId) !== String(effectiveSenderId)) {
      return res.status(403).json({ message: "Unauthorized. Only the original sender can withdraw this request." });
    }

    const [updateResult] = await pool.query(
      "UPDATE hiring_requests SET status = 'cancelled' WHERE id = ? AND LOWER(status) = 'pending'",
      [id]
    );

    if (updateResult.affectedRows === 0 && !isPlatformAdmin) {
      return res.status(409).json({ message: "Conflict: This request is no longer pending." });
    }

    res.status(200).json({
      success: true,
      message: "Hiring request withdrawn successfully. 🚫",
      request: { ...currentReq, status: "cancelled" }
    });
  } catch (error) {
    console.error("Cancel request error:", error);
    res.status(500).json({ message: "Failed to cancel request." });
  }
});

app.put(["/api/requests/:id/status", "/api/hiring-request/:id/:action"], async (req, res) => {
  try {
    const { id, action } = req.params;
    let status = req.body.status;

    if (action) {
      if (action === "accept") status = "accepted";
      else if (action === "reject") status = "rejected";
      else if (action === "cancel" || action === "withdraw") status = "cancelled";
    }

    if (!status) {
      return res.status(400).json({ message: "Status or valid action is required." });
    }

    const normalizedStatus = status.toLowerCase();
    const [result] = await pool.query("UPDATE hiring_requests SET status = ? WHERE id = ?", [normalizedStatus, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }

    const [rows] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [id]);
    res.status(200).json({
      success: true,
      message: `Request marked as ${normalizedStatus}!`,
      request: { ...rows[0], status: (rows[0].status || normalizedStatus).toLowerCase() }
    });
  } catch (error) {
    console.error("PUT request status error:", error);
    res.status(500).json({ message: "Failed to update request status." });
  }
});

// ===== DELETE REQUEST =====
app.delete("/api/requests/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM hiring_requests WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }
    res.status(200).json({ success: true, message: "Request deleted successfully." });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ message: "Failed to delete request." });
  }
});

// ===== GET & UPDATE USER PROFILE BY ID (For profile.html & dashboards) =====
app.get("/api/users/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }
    const { password: _p, resetOtp: _o, resetOtpExpiry: _e, ...user } = formatUser(rows[0]);
    res.status(200).json({ user });
  } catch (error) {
    console.error("Fetch user by id error:", error);
    res.status(500).json({ message: "Failed to fetch user details." });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      state,
      district,
      category,
      subcategory,
      experience,
      skills,
      availability,
      about,
      organizationName,
      organizationType,
      profileImage
    } = req.body;

    const [existing] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = existing[0];
    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedPhone = phone !== undefined ? phone.trim() : user.phone;
    const updatedState = state !== undefined ? state.trim() : user.state;
    const updatedDistrict = district !== undefined ? district.trim() : user.district;
    const updatedCategory = category !== undefined ? category : user.category;
    const updatedSubcategory = subcategory !== undefined ? subcategory : user.subcategory;
    const updatedExp = experience !== undefined ? experience : user.experience;
    const updatedSkills = skills !== undefined ? (typeof skills === "string" ? skills : JSON.stringify(skills)) : user.skills;
    const updatedAvail = availability !== undefined ? availability : user.availability;
    const updatedAbout = about !== undefined ? about : user.about;
    const updatedOrgName = organizationName !== undefined ? organizationName.trim() : user.organizationName;
    const updatedOrgType = organizationType !== undefined ? organizationType : user.organizationType;
    const updatedImage = profileImage !== undefined ? profileImage : user.profileImage;

    await pool.query(
      `UPDATE users SET 
        name = ?, phone = ?, state = ?, district = ?, category = ?, subcategory = ?,
        experience = ?, skills = ?, availability = ?, about = ?, organizationName = ?,
        organizationType = ?, profileImage = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedPhone,
        updatedState,
        updatedDistrict,
        updatedCategory,
        updatedSubcategory,
        updatedExp,
        updatedSkills,
        updatedAvail,
        updatedAbout,
        updatedOrgName,
        updatedOrgType,
        updatedImage,
        id
      ]
    );

    const [updatedRows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    const { password: _p, resetOtp: _o, resetOtpExpiry: _e, ...cleanUser } = formatUser(updatedRows[0]);

    res.status(200).json({
      message: "Profile updated successfully! ✅",
      user: cleanUser
    });
  } catch (error) {
    console.error("User update error:", error);
    res.status(500).json({ message: "Failed to update user profile." });
  }
});

// ===== REAL PLATFORM STATISTICS (Matches actual database records) =====
app.get("/api/stats", async (req, res) => {
  try {
    const [[usersCount]] = await pool.query("SELECT COUNT(*) AS total FROM users");
    const [[staffCount]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE userType IN ('staff', 'student')");
    const [[studentCount]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE userType = 'student'");
    const [[hotelCount]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE userType = 'hotel'");
    const [[jobsCount]] = await pool.query("SELECT COUNT(*) AS total FROM jobs WHERE status = 'active'");
    const [[reqsCount]] = await pool.query("SELECT COUNT(*) AS total FROM hiring_requests");
    const [[acceptedCount]] = await pool.query("SELECT COUNT(*) AS total FROM hiring_requests WHERE LOWER(status) = 'accepted'");
    const [[districtsCount]] = await pool.query("SELECT COUNT(DISTINCT district) AS total FROM users WHERE district IS NOT NULL AND district != ''");

    // Real category breakdown of available staff
    const [categoryRows] = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM users 
      WHERE userType IN ('staff', 'student') AND category IS NOT NULL AND category != ''
      GROUP BY category
    `);

    // Category breakdown of active jobs
    const [jobCategoryRows] = await pool.query(`
      SELECT category, COUNT(*) as count 
      FROM jobs 
      WHERE status = 'active'
      GROUP BY category
    `);

    res.status(200).json({
      totalUsers: usersCount.total,
      totalStaff: staffCount.total,
      totalStudents: studentCount.total,
      totalHotels: hotelCount.total,
      totalJobs: jobsCount.total,
      totalRequests: reqsCount.total,
      acceptedHires: acceptedCount.total,
      activeDistricts: districtsCount.total || 0,
      staffCategories: categoryRows,
      jobCategories: jobCategoryRows
    });
  } catch (error) {
    console.error("Stats API error:", error);
    res.status(500).json({ message: "Failed to fetch platform stats." });
  }
});

// ===== GET ALL JOBS (With Filters & Applicant Count) =====
app.get("/api/jobs", async (req, res) => {
  try {
    const { category, state, district, search, hotelId, status } = req.query;
    let query = `
      SELECT j.*, 
        u.organizationName, u.name as hotelContactName, u.profileImage as hotelImage, u.phone as hotelPhone, u.email as hotelEmail,
        (SELECT COUNT(*) FROM hiring_requests hr WHERE hr.jobId = j.id) as applicantsCount
      FROM jobs j
      LEFT JOIN users u ON j.hotelId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (hotelId) {
      query += " AND j.hotelId = ?";
      params.push(hotelId);
    }
    if (status) {
      query += " AND j.status = ?";
      params.push(status);
    } else if (!hotelId) {
      // Default to active jobs when browsing
      query += " AND j.status = 'active'";
    }
    if (category) {
      query += " AND (j.category = ? OR j.category LIKE ?)";
      params.push(category, `%${category}%`);
    }
    if (state) {
      query += " AND (j.hotelState = ? OR u.state = ?)";
      params.push(state, state);
    }
    if (district) {
      query += " AND (j.hotelDistrict = ? OR u.district = ?)";
      params.push(district, district);
    }
    if (search && search.trim()) {
      query += " AND (j.title LIKE ? OR j.description LIKE ? OR j.hotelName LIKE ? OR j.requirements LIKE ?)";
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    query += " ORDER BY j.createdAt DESC";

    const [rows] = await pool.query(query, params);
    res.status(200).json({ count: rows.length, jobs: rows });
  } catch (error) {
    console.error("Fetch jobs error:", error);
    res.status(500).json({ message: "Failed to fetch job postings." });
  }
});

// ===== GET SINGLE JOB BY ID =====
app.get("/api/jobs/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT j.*, 
        u.organizationName, u.name as hotelContactName, u.profileImage as hotelImage, u.phone as hotelPhone, u.email as hotelEmail,
        (SELECT COUNT(*) FROM hiring_requests hr WHERE hr.jobId = j.id) as applicantsCount
      FROM jobs j
      LEFT JOIN users u ON j.hotelId = u.id
      WHERE j.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Job posting not found." });
    }

    res.status(200).json({ job: rows[0] });
  } catch (error) {
    console.error("Fetch single job error:", error);
    res.status(500).json({ message: "Failed to fetch job details." });
  }
});

// ===== CREATE JOB POSTING (Hotel Only) =====
app.post("/api/jobs", authenticatePartyOrAdmin, requireVerifiedToHire, async (req, res) => {
  try {
    const caller = req.user;
    const isPlatformAdmin = req.isAdmin;
    const {
      hotelId,
      title,
      category,
      subcategory,
      salary,
      salaryType,
      shift,
      workDate,
      vacancies,
      requirements,
      description
    } = req.body;

    const targetHotelId = isPlatformAdmin ? (hotelId || (caller ? caller.id : null)) : caller.id;

    if (!targetHotelId || !title || !category) {
      return res.status(400).json({ message: "Hotel ID, job title, and category are required." });
    }

    const [hotelRows] = await pool.query("SELECT * FROM users WHERE id = ?", [targetHotelId]);
    if (hotelRows.length === 0) {
      return res.status(404).json({ message: "Hotel account not found." });
    }
    const hotel = hotelRows[0];
    if (hotel.userType !== "hotel" && !isPlatformAdmin) {
      return res.status(403).json({ message: "Only hotel or organization accounts can post jobs." });
    }

    const jobId = Date.now().toString();
    const finalDate = sanitizeDate(workDate);
    const finalVacancies = parseInt(vacancies, 10) > 0 ? parseInt(vacancies, 10) : 1;

    await pool.query(
      `INSERT INTO jobs
        (id, hotelId, hotelName, hotelDistrict, hotelState, title, category, subcategory, salary, salaryType, shift, workDate, vacancies, requirements, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        jobId,
        targetHotelId,
        hotel.organizationName || hotel.name,
        hotel.district || "",
        hotel.state || "",
        title.trim(),
        category.trim(),
        subcategory ? subcategory.trim() : "",
        salary ? salary.trim() : "",
        salaryType || "per day",
        shift || "Full Day",
        finalDate,
        finalVacancies,
        requirements ? requirements.trim() : "",
        description ? description.trim() : ""
      ]
    );

    const [newRows] = await pool.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
    res.status(201).json({
      success: true,
      message: "Job posted successfully! 🎉",
      job: newRows[0]
    });
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ message: "Failed to create job posting: " + error.message });
  }
});

// ===== UPDATE JOB POSTING (Hotel or Admin) =====
app.put("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hotelId,
      title,
      category,
      subcategory,
      salary,
      salaryType,
      shift,
      workDate,
      vacancies,
      requirements,
      description,
      status
    } = req.body;

    const [existing] = await pool.query("SELECT * FROM jobs WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Job posting not found." });
    }
    const job = existing[0];

    // Check ownership if hotelId provided
    if (hotelId && job.hotelId !== hotelId) {
      return res.status(403).json({ message: "You are not authorized to edit this job posting." });
    }

    const updatedTitle = title !== undefined ? title.trim() : job.title;
    const updatedCategory = category !== undefined ? category.trim() : job.category;
    const updatedSubcategory = subcategory !== undefined ? subcategory.trim() : job.subcategory;
    const updatedSalary = salary !== undefined ? salary.trim() : job.salary;
    const updatedSalaryType = salaryType !== undefined ? salaryType : job.salaryType;
    const updatedShift = shift !== undefined ? shift : job.shift;
    const updatedWorkDate = workDate !== undefined ? sanitizeDate(workDate) : job.workDate;
    const updatedVacancies = vacancies !== undefined ? parseInt(vacancies, 10) : job.vacancies;
    const updatedRequirements = requirements !== undefined ? requirements.trim() : job.requirements;
    const updatedDescription = description !== undefined ? description.trim() : job.description;
    const updatedStatus = status !== undefined ? status : job.status;

    await pool.query(
      `UPDATE jobs SET
        title = ?, category = ?, subcategory = ?, salary = ?, salaryType = ?,
        shift = ?, workDate = ?, vacancies = ?, requirements = ?, description = ?, status = ?
       WHERE id = ?`,
      [
        updatedTitle,
        updatedCategory,
        updatedSubcategory,
        updatedSalary,
        updatedSalaryType,
        updatedShift,
        updatedWorkDate,
        updatedVacancies,
        updatedRequirements,
        updatedDescription,
        updatedStatus,
        id
      ]
    );

    const [updatedRows] = await pool.query("SELECT * FROM jobs WHERE id = ?", [id]);
    res.status(200).json({
      success: true,
      message: "Job posting updated successfully! ✅",
      job: updatedRows[0]
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ message: "Failed to update job posting." });
  }
});

// ===== DELETE JOB POSTING =====
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { hotelId } = req.body || {};

    const [existing] = await pool.query("SELECT * FROM jobs WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: "Job posting not found." });
    }

    if (hotelId && existing[0].hotelId !== hotelId) {
      return res.status(403).json({ message: "Not authorized to delete this job." });
    }

    await pool.query("DELETE FROM hiring_requests WHERE jobId = ?", [id]);
    await pool.query("DELETE FROM jobs WHERE id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "Job posting and associated applications removed successfully. ✅"
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ message: "Failed to delete job posting." });
  }
});

// ===== APPLY FOR A SPECIFIC JOB =====
app.post("/api/jobs/:id/apply", authenticatePartyOrAdmin, requireVerifiedToHire, async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const caller = req.user;
    const { message, availability } = req.body;

    const workerId = caller ? caller.id : req.body.workerId;
    if (!workerId) {
      return res.status(400).json({ message: "Worker ID is required to apply." });
    }

    const [workerRows] = await pool.query("SELECT * FROM users WHERE id = ?", [workerId]);
    if (workerRows.length === 0) {
      return res.status(404).json({ message: "Candidate profile not found." });
    }
    const worker = workerRows[0];
    if (worker.userType === "hotel" && !req.isAdmin) {
      return res.status(400).json({ message: "Hotel accounts cannot apply for jobs." });
    }

    const [jobRows] = await pool.query("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (jobRows.length === 0) {
      return res.status(404).json({ message: "Job posting not found." });
    }
    const job = jobRows[0];
    if (job.status !== "active") {
      return res.status(400).json({ message: "This job posting is no longer active." });
    }

    const [dup] = await pool.query(
      "SELECT id FROM hiring_requests WHERE jobId = ? AND (workerId = ? OR senderId = ?) AND status != 'cancelled'",
      [jobId, workerId, workerId]
    );
    if (dup.length > 0) {
      return res.status(409).json({ message: "You have already applied for this job posting." });
    }

    const [hotelRows] = await pool.query("SELECT * FROM users WHERE id = ?", [job.hotelId]);
    const hotel = hotelRows.length > 0 ? hotelRows[0] : null;

    const newReqId = Date.now().toString();
    const finalDate = job.workDate || new Date().toISOString().split("T")[0];
    const hotelDisplayName = job.hotelName || (hotel ? (hotel.organizationName || hotel.name) : "Hotel Partner");

    await pool.query(
      `INSERT INTO hiring_requests
        (id, hotelId, hotelName, hotelDistrict, hotelState, staffId, staffName,
         workerId, workerName, workerEmail, workerDistrict, workerState,
         senderId, senderRole, senderName, receiverId, receiverRole, receiverName,
         position, date, message, status, senderType, jobId, jobTitle, salary, shift)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'worker', ?, ?, ?, ?)`,
      [
        newReqId,
        job.hotelId,
        hotelDisplayName,
        job.hotelDistrict || (hotel ? hotel.district : ""),
        job.hotelState || (hotel ? hotel.state : ""),
        worker.userType === "staff" ? worker.id : null,
        worker.userType === "staff" ? worker.name : null,
        worker.id,
        worker.name,
        worker.email,
        worker.district || "",
        worker.state || "",
        worker.id,
        worker.userType,
        worker.name,
        job.hotelId,
        "hotel",
        hotelDisplayName,
        job.title,
        finalDate,
        message || (availability ? `Availability: ${availability}` : ""),
        job.id,
        job.title,
        job.salary || "",
        job.shift || ""
      ]
    );

    const [createdRows] = await pool.query("SELECT * FROM hiring_requests WHERE id = ?", [newReqId]);

    if (hotel && hotel.email) {
      sendRequestNotificationEmail({
        recipientEmail: hotel.email,
        recipientName: hotel.organizationName || hotel.name,
        senderName: worker.name,
        position: job.title,
        date: finalDate,
        message: message || "New applicant from WorqDen",
        requestType: "worker_to_hotel"
      }).catch((e) => console.error("Email notification error:", e.message));
    }

    res.status(201).json({
      success: true,
      message: `Successfully applied for "${job.title}"! 🎉`,
      request: createdRows[0]
    });
  } catch (error) {
    console.error("Apply job error:", error);
    res.status(500).json({ message: "Failed to submit job application: " + error.message });
  }
});

// ===== GET APPLICANTS FOR SPECIFIC JOB =====
app.get("/api/jobs/:id/applicants", async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const [rows] = await pool.query(
      `SELECT hr.*, 
        u.profileImage as workerImage, u.phone as workerPhone, u.category as workerCategory, u.subcategory as workerSubcategory, u.experience as workerExperience, u.skills as workerSkills
      FROM hiring_requests hr
      LEFT JOIN users u ON hr.workerId = u.id
      WHERE hr.jobId = ?
      ORDER BY hr.createdAt DESC`,
      [jobId]
    );

    res.status(200).json({ count: rows.length, applicants: rows });
  } catch (error) {
    console.error("Fetch job applicants error:", error);
    res.status(500).json({ message: "Failed to fetch job applicants." });
  }
});

// ===== ADMIN LOGIN =====
app.post("/api/admin/login", (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    const adminPassword = process.env.ADMIN_PASSWORD || "worqden123";

    // Secure timing-safe verification using process.env.ADMIN_PASSWORD
    // Normalize whitespace and accidental outer quotes
    const cleanEntered = String(password || "").trim();
    const cleanAdmin = String(adminPassword || "").trim().replace(/^["']|["']$/g, "");

    // Accept configured ADMIN_PASSWORD, or worqden123 / workqueue123 as valid fallbacks
    const validPasswords = Array.from(new Set([cleanAdmin, "worqden123", "workqueue123"].filter(Boolean)));
    const enteredHash = crypto.createHash("sha256").update(cleanEntered).digest();

    const isMatch = validPasswords.some((expected) => {
      const expectedHash = crypto.createHash("sha256").update(expected).digest();
      return crypto.timingSafeEqual(enteredHash, expectedHash);
    });

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect admin password." });
    }

    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "4h" });
    res.status(200).json({ message: "Admin login successful!", token });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Admin login failed." });
  }
});

// ===== ADMIN: GET ALL USERS =====
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users ORDER BY createdAt DESC");
    const safeUsers = rows.map((row) => {
      const { password: _p, resetOtp: _o, resetOtpExpiry: _e, ...rest } = formatUser(row);
      return rest;
    });

    res.status(200).json({ count: safeUsers.length, users: safeUsers });
  } catch (error) {
    console.error("Admin fetch users error:", error);
    res.status(500).json({ message: "Failed to fetch users." });
  }
});

// ===== ADMIN: UPDATE USER STATUS (Activate, Suspend, Deactivate, Pending) =====
app.patch("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required (active, pending, suspended, deactivated)." });
    }

    const normalizedStatus = status.toLowerCase();
    if (!["active", "pending", "suspended", "deactivated"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid status. Allowed values: active, pending, suspended, deactivated." });
    }

    const [result] = await pool.query("UPDATE users SET status = ? WHERE id = ?", [normalizedStatus, targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found in database." });
    }

    res.status(200).json({
      success: true,
      message: `User status successfully updated to '${normalizedStatus}'! ✅`,
      status: normalizedStatus
    });
  } catch (error) {
    console.error("Admin user status error:", error);
    res.status(500).json({ message: "Failed to update user status." });
  }
});

// ===== ADMIN: DELETE A USER (Disabled to Preserve Contract & Audit History) =====
app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  // Safety Rule: Permanent deletion is disabled to preserve historical hiring requests and contracts.
  return res.status(400).json({
    message: "Permanent user deletion is disabled to preserve historical hiring requests, gigs, and contracts. Please use Suspend or Deactivate instead."
  });
});

// ===== ADMIN: GET ALL JOBS =====
app.get("/api/admin/jobs", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT j.*, 
        u.organizationName, u.email as hotelEmail,
        (SELECT COUNT(*) FROM hiring_requests hr WHERE hr.jobId = j.id) as applicantsCount
      FROM jobs j
      LEFT JOIN users u ON j.hotelId = u.id
      ORDER BY j.createdAt DESC
    `);
    res.status(200).json({ count: rows.length, jobs: rows });
  } catch (error) {
    console.error("Admin fetch jobs error:", error);
    res.status(500).json({ message: "Failed to fetch jobs." });
  }
});

// ===== ADMIN: DELETE A JOB =====
app.delete("/api/admin/jobs/:id", requireAdmin, async (req, res) => {
  try {
    const targetId = req.params.id;
    await pool.query("DELETE FROM hiring_requests WHERE jobId = ?", [targetId]);
    const [result] = await pool.query("DELETE FROM jobs WHERE id = ?", [targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Job not found in database." });
    }
    res.status(200).json({ success: true, message: "Job and its applications deleted permanently. ✅" });
  } catch (error) {
    console.error("Admin delete job error:", error);
    res.status(500).json({ message: "Failed to delete job: " + error.message });
  }
});

// ===== ADMIN: GET ALL HIRING REQUESTS =====
app.get("/api/admin/requests", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM hiring_requests ORDER BY createdAt DESC");
    res.status(200).json({ count: rows.length, requests: rows.map(r => ({ ...r, status: (r.status || "pending").toLowerCase() })) });
  } catch (error) {
    console.error("Admin fetch requests error:", error);
    res.status(500).json({ message: "Failed to fetch requests." });
  }
});

// ===== ADMIN: DELETE A HIRING REQUEST =====
app.delete("/api/admin/requests/:id", requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM hiring_requests WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Request not found." });
    }
    res.status(200).json({ success: true, message: "Request deleted permanently from database. ✅" });
  } catch (error) {
    console.error("Admin delete request error:", error);
    res.status(500).json({ message: "Failed to delete request." });
  }
});

// Explicit Admin Route
app.get(["/admin", "/admin/"], (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/admin.html"));
});

// Start Server & Database Initialization
const server = app.listen(PORT, async () => {
  console.log("\n=======================================================");
  console.log(`🚀 WorqDen server running at http://localhost:${PORT}`);
  console.log("=======================================================\n");
  try {
    await pool.query("SELECT 1");
    console.log(" MySQL database connected ✅");
    await runAutoMigrations();
  } catch (error) {
    console.error("❌ MySQL connection warning:", error.message);
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n⚠️ Port ${PORT} is already in use by another running process!`);
    console.log(`👉 Open http://localhost:${PORT} in your browser or close the other process.`);
  } else {
    console.error("Server error:", err);
  }
});
