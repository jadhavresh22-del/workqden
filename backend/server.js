require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change_this_admin_password";

// Simple middleware — admin routes ke liye token check karta hai
function requireAdmin(req, res, next) {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Admin login required." });
  }

  const token = authHeader.split(" ")[1];

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Not authorized." });
    }

    next();

  } catch (error) {

    return res.status(401).json({ message: "Invalid or expired admin session." });

  }

}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const USERS_FILE = path.join(__dirname, "users.json");
const REQUESTS_FILE = path.join(__dirname, "hiring_requests.json");

function readUsers() {
  const data = fs.readFileSync(USERS_FILE, "utf-8");
  return JSON.parse(data);
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readRequests() {
  const data = fs.readFileSync(REQUESTS_FILE, "utf-8");
  return JSON.parse(data);
}

function writeRequests(requests) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2));
}

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "WorqDen backend is running ✅" });
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
      organizationType
    } = req.body;

    if (!userType || !name || !email || !phone || !password) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const users = readUsers();

    const existingUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now().toString(),
      userType,
      name,
      email,
      phone,
      password: hashedPassword,
      state: state || "",
      district: district || "",
      category: category || "",
      subcategory: subcategory || "",
      experience: experience || "",
      skills: skills || [],
      availability: availability || "",
      about: about || "",
      organizationName: organizationName || "",
      organizationType: organizationType || "",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const { password: _pw, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "Registration successful!",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== LOGIN ROUTE =====
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const users = readUsers();

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    // Same generic message for "no user" and "wrong password"
    // — isse koi guess nahi kar sakta ki email exist karta hai ya nahi
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Token banao — isme sirf id, email, userType daalte hain (password kabhi nahi)
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _pw, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Login successful!",
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== GET PROFILE (by email) =====
app.get("/api/profile/:email", (req, res) => {
  try {
    const users = readUsers();

    const user = users.find(
      (u) => u.email.toLowerCase() === req.params.email.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { password: _pw, ...userWithoutPassword } = user;

    res.status(200).json({ user: userWithoutPassword });

  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== FIND STAFF (search + filters) =====
app.get("/api/staff", (req, res) => {
  try {
    const { category, subcategory, state, district, experience, availability } = req.query;

    const users = readUsers();

    let results = users.filter(
      (u) => u.userType === "staff" || u.userType === "student"
    );

    if (category) {
      results = results.filter((u) => u.category === category);
    }

    if (subcategory) {
      results = results.filter((u) => u.subcategory === subcategory);
    }

    if (state) {
      results = results.filter((u) => u.state === state);
    }

    if (district) {
      results = results.filter((u) => u.district === district);
    }

    if (experience) {
      results = results.filter((u) => u.experience === experience);
    }

    if (availability) {
      results = results.filter((u) => u.availability === availability);
    }

    // Password kabhi bhejte nahi
    const safeResults = results.map(({ password, ...rest }) => rest);

    res.status(200).json({ count: safeResults.length, staff: safeResults });

  } catch (error) {
    console.error("Find staff error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== SEND HIRING REQUEST (hotel -> worker) =====
app.post("/api/hiring-request", (req, res) => {
  try {
    const { hotelId, staffId, position, date, message } = req.body;

    if (!hotelId || !staffId) {
      return res.status(400).json({ message: "hotelId and staffId are required." });
    }

    const users = readUsers();

    const hotel = users.find((u) => u.id === hotelId);
    const staff = users.find((u) => u.id === staffId);

    if (!hotel || !staff) {
      return res.status(404).json({ message: "Hotel or staff member not found." });
    }

    const requests = readRequests();

    const newRequest = {
      id: Date.now().toString(),
      hotelId,
      hotelName: hotel.organizationName || hotel.name,
      staffId,
      staffName: staff.name,
      position: position || staff.subcategory || staff.category || "",
      date: date || "",
      message: message || "",
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    requests.push(newRequest);
    writeRequests(requests);

    res.status(201).json({ message: "Hiring request sent!", request: newRequest });

  } catch (error) {
    console.error("Hiring request error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== GET REQUESTS SENT BY A HOTEL =====
app.get("/api/hiring-requests/hotel/:hotelId", (req, res) => {
  try {
    const requests = readRequests();

    const hotelRequests = requests.filter(
      (r) => r.hotelId === req.params.hotelId
    );

    res.status(200).json({ requests: hotelRequests });

  } catch (error) {
    console.error("Fetch hotel requests error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== GET REQUESTS RECEIVED BY A WORKER/STUDENT =====
app.get("/api/hiring-requests/staff/:staffId", (req, res) => {
  try {
    const requests = readRequests();

    const staffRequests = requests.filter(
      (r) => r.staffId === req.params.staffId
    );

    res.status(200).json({ requests: staffRequests });

  } catch (error) {
    console.error("Fetch staff requests error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== ACCEPT / REJECT A REQUEST =====
app.put("/api/hiring-request/:id/:action", (req, res) => {
  try {
    const { id, action } = req.params;

    if (action !== "accept" && action !== "reject") {
      return res.status(400).json({ message: "Invalid action." });
    }

    const requests = readRequests();

    const requestIndex = requests.findIndex((r) => r.id === id);

    if (requestIndex === -1) {
      return res.status(404).json({ message: "Request not found." });
    }

    requests[requestIndex].status = action === "accept" ? "Accepted" : "Rejected";

    writeRequests(requests);

    res.status(200).json({
      message: `Request ${requests[requestIndex].status.toLowerCase()}.`,
      request: requests[requestIndex]
    });

  } catch (error) {
    console.error("Accept/reject error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== ADMIN LOGIN =====
app.post("/api/admin/login", (req, res) => {
  try {

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required." });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Incorrect admin password." });
    }

    const token = jwt.sign(
      { role: "admin" },
      JWT_SECRET,
      { expiresIn: "4h" }
    );

    res.status(200).json({ message: "Admin login successful!", token });

  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== ADMIN: GET ALL USERS =====
app.get("/api/admin/users", requireAdmin, (req, res) => {
  try {

    const users = readUsers();

    const safeUsers = users.map(({ password, ...rest }) => rest);

    res.status(200).json({ count: safeUsers.length, users: safeUsers });

  } catch (error) {
    console.error("Admin fetch users error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== ADMIN: DELETE A USER =====
app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
  try {

    const users = readUsers();

    const filteredUsers = users.filter((u) => u.id !== req.params.id);

    if (filteredUsers.length === users.length) {
      return res.status(404).json({ message: "User not found." });
    }

    writeUsers(filteredUsers);

    res.status(200).json({ message: "User deleted." });

  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

// ===== ADMIN: GET ALL HIRING REQUESTS =====
app.get("/api/admin/requests", requireAdmin, (req, res) => {
  try {

    const requests = readRequests();

    res.status(200).json({ count: requests.length, requests });

  } catch (error) {
    console.error("Admin fetch requests error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`WorqDen server running at http://localhost:${PORT}`);
});
