const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

(async () => {
  const pool = mysql.createPool({ host: "127.0.0.1", user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await pool.query("DELETE FROM users WHERE email LIKE '%newemail%' OR email LIKE '%testbrandnew%' OR email LIKE '%totallynew%'");
  const [rows] = await pool.query("SELECT COUNT(*) as c FROM users");
  console.log("Current user count:", rows[0].c);
  await pool.end();
})();
