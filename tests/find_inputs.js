const fs = require('fs');
const content = fs.readFileSync('frontend/register.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('id="email"') || line.includes('id="phone"') || line.includes('name="email"') || line.includes('name="phone"')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
