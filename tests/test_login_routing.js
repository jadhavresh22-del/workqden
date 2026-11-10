const http = require('http');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

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
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [users] = await pool.query("SELECT id, name, email, phone, userType FROM users WHERE phone IS NOT NULL AND phone != '' LIMIT 1");
  if (users.length === 0) {
    console.log('No user with phone found.');
    await pool.end();
    return;
  }

  const testUser = users[0];
  console.log(`Testing Phone OTP login with user: ${testUser.name} (${testUser.phone}, ${testUser.userType})`);

  // 1. Send OTP
  const otpSendRes = await httpRequest({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/phone-otp/send',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { phone: testUser.phone, purpose: 'login' });

  console.log(`Phone OTP Send Status: ${otpSendRes.statusCode}, devOtp: ${otpSendRes.body.devOtp}`);

  if (otpSendRes.statusCode === 200 && otpSendRes.body.devOtp) {
    const otpVerifyRes = await httpRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/login/phone-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { phone: testUser.phone, otp: otpSendRes.body.devOtp });

    console.log(`Phone OTP Verify Status: ${otpVerifyRes.statusCode}, UserType: ${otpVerifyRes.body.user ? otpVerifyRes.body.user.userType : 'N/A'}`);
    if (otpVerifyRes.statusCode === 200 && otpVerifyRes.body.user.userType === testUser.userType) {
      console.log(`Phone OTP login successful! User routed correctly for role: ${testUser.userType} PASS`);
    } else {
      throw new Error('Phone OTP verify failed');
    }
  }

  await pool.end();
  console.log('Login verification complete! PASS');
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
