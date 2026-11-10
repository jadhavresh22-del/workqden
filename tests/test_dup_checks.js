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
  // Existing users: sushma has email sushma123@gmail.com and phone 9090909090
  // saroja has email saroja123@gmail.com and phone 8884888801

  console.log('--- Testing Current Duplicate Behavior ---');

  // Case A: Existing email + new phone
  const resA = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Existing Email',
    email: 'sushma123@gmail.com',
    phone: '9988776655',
    password: 'password123'
  });
  console.log('Case A (Existing Email + New Phone):', resA.status, resA.data.message);

  // Case B: New email + existing phone
  const resB = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Existing Phone',
    email: 'totallynewemail123@example.com',
    phone: '9090909090',
    password: 'password123'
  });
  console.log('Case B (New Email + Existing Phone):', resB.status, resB.data.message);

  // Case C: Existing email (sushma) + existing phone (saroja)
  const resC = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Both Existing',
    email: 'sushma123@gmail.com',
    phone: '8884888801',
    password: 'password123'
  });
  console.log('Case C (Both Existing from different users):', resC.status, resC.data.message);

  // Case D: Existing email + existing phone of SAME user (sushma)
  const resD = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Both Existing Same User',
    email: 'sushma123@gmail.com',
    phone: '9090909090',
    password: 'password123'
  });
  console.log('Case D (Both Existing Same User):', resD.status, resD.data.message);

  // Case E: Phone with +91 or leading 0 check (e.g. +91 9090909090 or 09090909090)
  const resE = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Phone with +91',
    email: 'newemail9999@example.com',
    phone: '+91 9090909090',
    password: 'password123'
  });
  console.log('Case E (Phone with +91):', resE.status, resE.data.message);

  // Case F: Phone in DB has leading 0 (06360970301) vs user entering 10 digits (6360970301)
  const resF = await postJSON('/api/register', {
    userType: 'staff',
    name: 'Test Phone leading zero match',
    email: 'newemail8888@example.com',
    phone: '6360970301',
    password: 'password123'
  });
  console.log('Case F (Phone matching 10 digits against 06360970301 in DB):', resF.status, resF.data.message);
})();
