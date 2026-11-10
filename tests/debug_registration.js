const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

(async () => {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [cols] = await pool.query("SHOW FULL COLUMNS FROM users");
  console.log("=== USERS COLUMNS ===");
  cols.forEach(c => console.log(`${c.Field} | ${c.Type} | Null:${c.Null} | Key:${c.Key} | Default:${c.Default}`));

  const [indexes] = await pool.query("SHOW INDEX FROM users");
  console.log("\n=== USERS INDEXES ===");
  indexes.forEach(i => console.log(`${i.Key_name} on ${i.Column_name} (Non_unique: ${i.Non_unique})`));

  const [allUsers] = await pool.query("SELECT id, name, email, phone, userType FROM users");
  console.log("\n=== ALL USERS DATA ===");
  allUsers.forEach(u => console.log(`[${u.id}] email: '${u.email}', phone: '${u.phone}', type: '${u.userType}', name: '${u.name}'`));

  await pool.end();
})();
