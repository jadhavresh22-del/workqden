const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.join(__dirname, '../backend/.env');
const envRaw = fs.readFileSync(envPath, 'utf8');

console.log("=== .env File Analysis ===");
const lines = envRaw.split('\n');
lines.forEach((l, idx) => {
  if (l.startsWith('ADMIN_PASSWORD')) {
    const parts = l.split('=');
    const val = parts.slice(1).join('=');
    console.log(`Line ${idx + 1}: key = ADMIN_PASSWORD`);
    console.log(`Length: ${val.length}`);
    console.log(`Ends with \\r: ${val.endsWith('\r')}`);
    console.log(`Starts with quote: ${val.startsWith('"') || val.startsWith("'")}`);
    console.log(`Trimmed length: ${val.trim().length}`);
    for (let i = 0; i < val.length; i++) {
      console.log(`Char ${i}: code ${val.charCodeAt(i)}`);
    }
  }
});

dotenv.config({ path: envPath });
const loaded = process.env.ADMIN_PASSWORD;
console.log("\n=== Loaded in process.env ===");
console.log(`Loaded length: ${loaded ? loaded.length : 0}`);
console.log(`Loaded ends with \\r: ${loaded ? loaded.endsWith('\r') : false}`);
console.log(`Loaded char codes:`, loaded ? Array.from(loaded).map(c => c.charCodeAt(0)) : []);
