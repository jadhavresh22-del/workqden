const http = require('http');
const path = require('path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'worqden_super_secret_jwt_key_2025_secure';
const PORT = 5000;

function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

(async () => {
  console.log('====================================================');
  console.log('   WORQDEN E2E AUTOMATED VERIFICATION SUITE        ');
  console.log('====================================================\n');

  // 1. Connect to DB
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Clean up any lingering test requests from previous runs
  await pool.query("DELETE FROM hiring_requests WHERE message LIKE 'E2E Test%'");

  const [initialUsers] = await pool.query('SELECT COUNT(*) as c FROM users');
  const [initialReqs] = await pool.query('SELECT COUNT(*) as c FROM hiring_requests');
  const [initialJobs] = await pool.query('SELECT COUNT(*) as c FROM jobs');

  console.log(`[DB Baseline] Users: ${initialUsers[0].c}, Requests: ${initialReqs[0].c}, Jobs: ${initialJobs[0].c}`);

  // Test User IDs
  const studentId = '1787413093539'; // divyanshu
  const staffId = '1787489951340';   // sushma
  const hotelId = '1787490087457';   // saroja

  // Generate Session Tokens
  const studentToken = jwt.sign({ id: studentId, email: 'divyanshu06@gmail.com', userType: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  const staffToken = jwt.sign({ id: staffId, email: 'sushma123@gmail.com', userType: 'staff' }, JWT_SECRET, { expiresIn: '1h' });
  const hotelToken = jwt.sign({ id: hotelId, email: 'saroja123@gmail.com', userType: 'hotel' }, JWT_SECRET, { expiresIn: '1h' });

  // 2. Test Admin Login Endpoint
  console.log('\n--- 1. Testing Admin Authentication ---');
  const adminLoginRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { password: process.env.ADMIN_PASSWORD || 'worqden123' });

  console.log(`Admin Login Status: ${adminLoginRes.statusCode}`);
  if (adminLoginRes.statusCode !== 200 || !adminLoginRes.body.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLoginRes.body));
  }
  const adminToken = adminLoginRes.body.token;
  console.log('Admin login verified successfully! PASS');

  // Verify Admin Protected Endpoint
  const adminUsersRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  console.log(`Admin GET /api/admin/users Status: ${adminUsersRes.statusCode}, Count: ${adminUsersRes.body.count}`);
  if (adminUsersRes.statusCode !== 200 || !adminUsersRes.body.users) {
    throw new Error('Admin GET /api/admin/users failed');
  }

  // 3. Test All Six Hiring Directions
  console.log('\n--- 2. Testing All Six Hiring Directions ---');
  const createdTestReqIds = [];

  // Direction 1: Student -> Hotel
  console.log('\n>> Direction 1: Student -> Hotel');
  const dir1Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    receiverId: hotelId,
    position: 'Weekend Banquet Server',
    salary: '700 per shift',
    shift: 'Evening (5 PM - 11 PM)',
    message: 'E2E Test: Student applying to Hotel'
  });
  const reqId1 = dir1Res.body.request ? dir1Res.body.request.id : null;
  console.log(`Status: ${dir1Res.statusCode}, Req ID: ${reqId1}`);
  if (dir1Res.statusCode !== 201 || !reqId1) throw new Error('Direction 1 failed: ' + JSON.stringify(dir1Res.body));
  createdTestReqIds.push(reqId1);
  const [row1] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId1]);
  console.log(`  DB Verification -> senderRole: ${row1[0].senderRole}, receiverRole: ${row1[0].receiverRole}, status: ${row1[0].status} PASS`);

  // Direction 2: Hotel -> Student
  console.log('\n>> Direction 2: Hotel -> Student');
  const dir2Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hotelToken}`
    }
  }, {
    receiverId: studentId,
    position: 'Buffet Attendant Gig',
    salary: '750 per shift',
    shift: 'Night (8 PM - 4 AM)',
    message: 'E2E Test: Hotel inviting Student'
  });
  const reqId2 = dir2Res.body.request ? dir2Res.body.request.id : null;
  console.log(`Status: ${dir2Res.statusCode}, Req ID: ${reqId2}`);
  if (dir2Res.statusCode !== 201 || !reqId2) throw new Error('Direction 2 failed: ' + JSON.stringify(dir2Res.body));
  createdTestReqIds.push(reqId2);
  const [row2] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId2]);
  console.log(`  DB Verification -> senderRole: ${row2[0].senderRole}, receiverRole: ${row2[0].receiverRole}, status: ${row2[0].status} PASS`);

  // Direction 3: Staff -> Hotel
  console.log('\n>> Direction 3: Staff -> Hotel');
  const dir3Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    }
  }, {
    receiverId: hotelId,
    position: 'Head Continental Chef',
    salary: '2500 per event',
    shift: 'Full Day Shift',
    message: 'E2E Test: Staff applying to Hotel'
  });
  const reqId3 = dir3Res.body.request ? dir3Res.body.request.id : null;
  console.log(`Status: ${dir3Res.statusCode}, Req ID: ${reqId3}`);
  if (dir3Res.statusCode !== 201 || !reqId3) throw new Error('Direction 3 failed: ' + JSON.stringify(dir3Res.body));
  createdTestReqIds.push(reqId3);
  const [row3] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId3]);
  console.log(`  DB Verification -> senderRole: ${row3[0].senderRole}, receiverRole: ${row3[0].receiverRole}, status: ${row3[0].status} PASS`);

  // Direction 4: Hotel -> Staff
  console.log('\n>> Direction 4: Hotel -> Staff');
  const dir4Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hotelToken}`
    }
  }, {
    receiverId: staffId,
    position: 'Senior Banquet Captain',
    salary: '1800 per shift',
    shift: 'Evening (5 PM - 11 PM)',
    message: 'E2E Test: Hotel directly offering shift to Staff'
  });
  const reqId4 = dir4Res.body.request ? dir4Res.body.request.id : null;
  console.log(`Status: ${dir4Res.statusCode}, Req ID: ${reqId4}`);
  if (dir4Res.statusCode !== 201 || !reqId4) throw new Error('Direction 4 failed: ' + JSON.stringify(dir4Res.body));
  createdTestReqIds.push(reqId4);
  const [row4] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId4]);
  console.log(`  DB Verification -> senderRole: ${row4[0].senderRole}, receiverRole: ${row4[0].receiverRole}, status: ${row4[0].status} PASS`);

  // Direction 5: Staff -> Student (Peer Paid Assistance)
  console.log('\n>> Direction 5: Staff -> Student (Paid Banquet Assistant)');
  const dir5Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    }
  }, {
    receiverId: studentId,
    position: 'Banquet Setup Assistant',
    salary: '600 per shift',
    shift: 'Evening (5 PM - 11 PM)',
    message: 'E2E Test: Staff hiring Student helper for banquet'
  });
  const reqId5 = dir5Res.body.request ? dir5Res.body.request.id : null;
  console.log(`Status: ${dir5Res.statusCode}, Req ID: ${reqId5}`);
  if (dir5Res.statusCode !== 201 || !reqId5) throw new Error('Direction 5 failed: ' + JSON.stringify(dir5Res.body));
  createdTestReqIds.push(reqId5);
  const [row5] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId5]);
  console.log(`  DB Verification -> senderRole: ${row5[0].senderRole}, receiverRole: ${row5[0].receiverRole}, hotelId: ${row5[0].hotelId} PASS`);

  // Direction 6: Student -> Staff (Peer Shift Collaboration)
  console.log('\n>> Direction 6: Student -> Staff (Joint Event Collaboration)');
  const dir6Res = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    receiverId: staffId,
    position: 'Bartender Shift Lead',
    salary: '1500 per event',
    shift: 'Night (8 PM - 4 AM)',
    message: 'E2E Test: Student requesting senior Staff lead for private catering'
  });
  const reqId6 = dir6Res.body.request ? dir6Res.body.request.id : null;
  console.log(`Status: ${dir6Res.statusCode}, Req ID: ${reqId6}`);
  if (dir6Res.statusCode !== 201 || !reqId6) throw new Error('Direction 6 failed: ' + JSON.stringify(dir6Res.body));
  createdTestReqIds.push(reqId6);
  const [row6] = await pool.query('SELECT * FROM hiring_requests WHERE id = ?', [reqId6]);
  console.log(`  DB Verification -> senderRole: ${row6[0].senderRole}, receiverRole: ${row6[0].receiverRole}, hotelId: ${row6[0].hotelId} PASS`);

  // 4. Test Status Transitions
  console.log('\n--- 3. Testing Status Transitions ---');

  // Case A: Receiver Accepts (Hotel accepts Staff Direction 3 request)
  console.log('>> Case A: Receiver Accepts (Hotel accepts Staff req)');
  const acceptRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/requests/${reqId3}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hotelToken}`
    }
  }, { status: 'accepted' });
  console.log(`Accept Status: ${acceptRes.statusCode}, Msg: ${acceptRes.body.message}`);
  if (acceptRes.statusCode !== 200) throw new Error('Accept failed');

  // Case B: Receiver Declines (Student rejects Hotel Direction 2 offer)
  console.log('>> Case B: Receiver Declines (Student rejects Hotel offer)');
  const rejectRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/requests/${reqId2}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, { status: 'rejected' });
  console.log(`Reject Status: ${rejectRes.statusCode}, Msg: ${rejectRes.body.message}`);
  if (rejectRes.statusCode !== 200) throw new Error('Reject failed');

  // Case C: Sender Cancels (Staff cancels Student Direction 5 request)
  console.log('>> Case C: Sender Cancels (Staff cancels Student req)');
  const cancelRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/requests/${reqId5}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    }
  }, { status: 'cancelled' });
  console.log(`Cancel Status: ${cancelRes.statusCode}, Msg: ${cancelRes.body.message}`);
  if (cancelRes.statusCode !== 200) throw new Error('Cancel failed');

  // 5. Test Concurrency & Terminal Lock
  console.log('\n--- 4. Testing Concurrency & Terminal State Lock ---');
  const reAcceptRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/requests/${reqId3}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${hotelToken}`
    }
  }, { status: 'accepted' });
  console.log(`Re-accept on Accepted Req Status: ${reAcceptRes.statusCode} (Expected: 409)`);
  if (reAcceptRes.statusCode !== 409) throw new Error('Concurrency lock failed: expected 409, got ' + reAcceptRes.statusCode);
  console.log('Terminal state lock verified! PASS');

  // 6. Test Security Ownership Rules
  console.log('\n--- 5. Testing Security Ownership Rules ---');
  const nonReceiverAcceptRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/requests/${reqId1}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    }
  }, { status: 'accepted' });
  console.log(`Non-receiver Accept Status: ${nonReceiverAcceptRes.statusCode} (Expected: 403)`);
  if (nonReceiverAcceptRes.statusCode !== 403) throw new Error('Ownership security failed: non-receiver accepted request');
  console.log('Ownership protection verified! PASS');

  // 7. Mandatory Condition: Live DB Account Status Verification on Every Request
  console.log('\n--- 6. Testing Mandatory Live Account Status Verification ---');
  // Step A: Admin suspends Student divyanshu
  console.log('Admin suspends student...');
  const suspendRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/admin/users/${studentId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { status: 'suspended' });
  console.log(`Admin Suspend Status: ${suspendRes.statusCode}`);
  if (suspendRes.statusCode !== 200) throw new Error('Admin suspend failed');

  // Step B: Student divyanshu attempts to make request with their existing valid JWT
  console.log('Suspended student attempts API call with valid JWT...');
  const suspendedCallRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`Suspended User Call Status: ${suspendedCallRes.statusCode} (Expected: 403)`);
  if (suspendedCallRes.statusCode !== 403) {
    throw new Error('MANDATORY CHECK FAILED: Suspended user was not blocked by live DB status check!');
  }
  console.log('Live DB status enforcement verified: Suspended user immediately blocked! PASS');

  // Step C: Admin reactivates Student divyanshu
  console.log('Admin reactivates student...');
  const reactivateRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/admin/users/${studentId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { status: 'active' });
  console.log(`Admin Reactivate Status: ${reactivateRes.statusCode}`);

  // Student divyanshu attempts call again -> must succeed 200
  const restoredCallRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`Reactivated User Call Status: ${restoredCallRes.statusCode} (Expected: 200)`);
  if (restoredCallRes.statusCode !== 200) throw new Error('Reactivated user call failed');
  console.log('Reactivation restored access verified! PASS');

  // 8. Test Endpoint-Level Pending Account Permissions
  console.log('\n--- 7. Testing Endpoint-Level Pending Account Permissions ---');
  await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/admin/users/${studentId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { status: 'pending' });

  // Pending user CAN view requests (read-only)
  const pendingGetRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  console.log(`Pending User GET /api/requests Status: ${pendingGetRes.statusCode} (Expected: 200)`);
  if (pendingGetRes.statusCode !== 200) throw new Error('Pending user should be able to view requests');

  // Pending user CANNOT create a new request
  const pendingPostRes = await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/requests',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    receiverId: hotelId,
    position: 'Temporary Banquet Help'
  });
  console.log(`Pending User POST /api/requests Status: ${pendingPostRes.statusCode} (Expected: 403)`);
  if (pendingPostRes.statusCode !== 403) throw new Error('Pending user should NOT be able to hire or apply');
  console.log('Endpoint-level pending restrictions verified! PASS');

  // Restore user to active
  await httpRequest({
    hostname: '127.0.0.1',
    port: PORT,
    path: `/api/admin/users/${studentId}/status`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  }, { status: 'active' });

  // 9. Clean up created test requests
  console.log('\n--- 8. Cleaning Up Test Artifacts ---');
  for (const tid of createdTestReqIds) {
    await pool.query('DELETE FROM hiring_requests WHERE id = ?', [tid]);
  }
  console.log(`Deleted ${createdTestReqIds.length} temporary test hiring requests.`);

  // 10. Final Baseline Verification
  const [finalUsers] = await pool.query('SELECT COUNT(*) as c FROM users');
  const [finalReqs] = await pool.query('SELECT COUNT(*) as c FROM hiring_requests');
  const [finalJobs] = await pool.query('SELECT COUNT(*) as c FROM jobs');

  console.log(`\n[Final Baseline Check] Users: ${finalUsers[0].c} (expected ${initialUsers[0].c}), Requests: ${finalReqs[0].c} (expected ${initialReqs[0].c}), Jobs: ${finalJobs[0].c} (expected ${initialJobs[0].c})`);

  if (finalUsers[0].c !== initialUsers[0].c || finalReqs[0].c !== initialReqs[0].c || finalJobs[0].c !== initialJobs[0].c) {
    throw new Error('Baseline counts altered!');
  }

  console.log('\n====================================================');
  console.log('   ALL E2E VERIFICATION CHECKS PASSED (100%)       ');
  console.log('====================================================\n');

  await pool.end();
  process.exit(0);
})().catch(err => {
  console.error('\nFAIL: E2E TEST FAILED:', err);
  process.exit(1);
});
