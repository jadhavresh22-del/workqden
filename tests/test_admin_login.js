const http = require('http');
const path = require('path');
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
  const adminPass = process.env.ADMIN_PASSWORD;

  // Test 1: exact password
  console.log('Testing Admin login with exact password...');
  const res1 = await postJSON('/api/admin/login', { password: adminPass });
  console.log('Test 1 Status:', res1.status, res1.data.message);

  // Test 2: password with trailing space
  console.log('\nTesting Admin login with trailing space...');
  const res2 = await postJSON('/api/admin/login', { password: adminPass + ' ' });
  console.log('Test 2 Status:', res2.status, res2.data.message);

  // Test 3: wrong password
  console.log('\nTesting Admin login with wrong password...');
  const res3 = await postJSON('/api/admin/login', { password: 'wrongpassword123' });
  console.log('Test 3 Status:', res3.status, res3.data.message);
})();
