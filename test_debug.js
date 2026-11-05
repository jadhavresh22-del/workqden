const mysql = require('mysql2/promise');
require('dotenv').config({path: 'backend/.env'});

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [existingPendingWaiter] = await pool.query(
    "SELECT id, position, jobId, status FROM hiring_requests WHERE hotelId = ? AND workerId = ? AND position = ? AND status = 'pending'",
    ['1787490087457', '1793349621244', 'Waiter']
  );
  console.log('Existing pending for Waiter:', existingPendingWaiter);

  const [allReqs] = await pool.query(
    "SELECT id, hotelId, workerId, position, jobId, status, createdAt FROM hiring_requests WHERE workerId = '1793349621244'"
  );
  console.log('All reqs for sakshi:', allReqs);

  await pool.end();
})();
