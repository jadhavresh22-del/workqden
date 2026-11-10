const http = require('http');

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
  // Test with brand new email and phone
  const testEmail = `testbrandnew_${Date.now()}@example.com`;
  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  console.log(`Testing registration with: email=${testEmail}, phone=${testPhone}`);

  const res = await postJSON('/api/register', {
    userType: 'student',
    name: 'Test Brand New',
    email: testEmail,
    phone: testPhone,
    password: 'password123',
    state: 'Maharashtra',
    district: 'Pune'
  });

  console.log('Response Status:', res.status);
  console.log('Response Body:', res.data);
})();
