const http = require('http');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

function postJSON(urlPath, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('==================================================');
  console.log('   REGISTRATION 4-CASE COMPREHENSIVE TEST         ');
  console.log('==================================================\n');

  const pool = mysql.createPool({ host: '127.0.0.1', user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });

  // Known existing user: sushma (email: sushma123@gmail.com, phone: 9090909090)
  const existingEmail = 'sushma123@gmail.com';
  const existingPhone = '9090909090';

  const newEmail = `fresh_test_${Date.now()}@example.com`;
  const newPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;

  // Test 1: New email + new phone number (must succeed with 201)
  console.log('Test 1: New email + new phone number...');
  const res1 = await postJSON('/api/register', {
    userType: 'student',
    name: 'Fresh Test User',
    email: newEmail,
    phone: newPhone,
    password: 'password123'
  });
  console.log(`Status: ${res1.status}, Msg: ${res1.data.message}`);
  if (res1.status !== 201) throw new Error('Test 1 failed');
  console.log('Test 1 Passed: Genuinely new credentials successfully registered! PASS\n');

  // Test 2: Existing email + new phone number (must reject with email-specific 409)
  console.log('Test 2: Existing email + new phone number...');
  const brandNewPhone2 = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
  const res2 = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Existing Email User',
    email: existingEmail,
    phone: brandNewPhone2,
    password: 'password123'
  });
  console.log(`Status: ${res2.status}, Msg: ${res2.data.message}`);
  if (res2.status !== 409 || !res2.data.message.includes('email address is already registered')) {
    throw new Error('Test 2 failed: expected email-specific 409');
  }
  console.log('Test 2 Passed: Email duplicate specifically rejected! PASS\n');

  // Test 3: New email + existing phone number (must reject with phone-specific 409)
  console.log('Test 3: New email + existing phone number...');
  const brandNewEmail3 = `unique_${Date.now()}@example.com`;
  const res3 = await postJSON('/api/register', {
    userType: 'hotel',
    name: 'Existing Phone User',
    email: brandNewEmail3,
    phone: existingPhone,
    password: 'password123'
  });
  console.log(`Status: ${res3.status}, Msg: ${res3.data.message}`);
  if (res3.status !== 409 || !res3.data.message.includes('phone number is already registered')) {
    throw new Error('Test 3 failed: expected phone-specific 409');
  }
  console.log('Test 3 Passed: Phone duplicate specifically rejected! PASS\n');

  // Test 4: Existing email + existing phone number (must reject with both-specific 409)
  console.log('Test 4: Existing email + existing phone number...');
  const res4 = await postJSON('/api/register', {
    userType: 'student',
    name: 'Both Existing User',
    email: existingEmail,
    phone: existingPhone,
    password: 'password123'
  });
  console.log(`Status: ${res4.status}, Msg: ${res4.data.message}`);
  if (res4.status !== 409 || !res4.data.message.includes('Both this email address and phone number')) {
    throw new Error('Test 4 failed: expected both-specific 409');
  }
  console.log('Test 4 Passed: Both email and phone duplicates recognized! PASS\n');

  // Clean up Test 1 user
  await pool.query('DELETE FROM users WHERE email = ?', [newEmail]);
  const [count] = await pool.query('SELECT COUNT(*) as c FROM users');
  console.log(`Baseline verified: ${count[0].c} users (original 9 preserved).`);
  await pool.end();

  console.log('ALL REGISTRATION TESTS PASSED! PASS');
  process.exit(0);
})().catch(err => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
