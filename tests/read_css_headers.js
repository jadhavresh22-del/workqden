const fs = require('fs');
const lines = fs.readFileSync('frontend/style.css', 'utf8').split('\n');
lines.forEach((l, idx) => {
  if (l.includes('=====')) {
    console.log(`Line ${idx + 1}: ${lines[idx + 1] ? lines[idx + 1].trim() : ''}`);
  }
});
