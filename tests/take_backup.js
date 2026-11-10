const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const dumpExe = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe';
const backupDir = path.join(__dirname, '../backend/backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const backupPath = path.join(backupDir, 'worqden_pre_styling_fix_backup.sql');
const cmd = `"${dumpExe}" -u root worqden > "${backupPath}"`;

exec(cmd, { env: { ...process.env, MYSQL_PWD: 'reshma' } }, (err, stdout, stderr) => {
  if (err) {
    console.error("Backup failed:", err.message);
    process.exit(1);
  }
  const stats = fs.statSync(backupPath);
  console.log(`Backup completed successfully! Size: ${stats.size} bytes at ${backupPath}`);
  process.exit(0);
});
