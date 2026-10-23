const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join('C:', 'mcp', 'profile-rank-engine', 'artifacts', 'local-scheduler.log');

function log(msg) {
  const line = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
}

const SHIFTS = [
  { name: 'morning', hour: 8, minute: 45 },
  { name: 'afternoon', hour: 14, minute: 15 },
  { name: 'evening', hour: 18, minute: 45 }
];

let lastExecutedDate = {};

log('Dual-Engine Local Rank Booster Scheduler Daemon started.');

setInterval(() => {
  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
  const [h, m] = istTimeStr.split(':').map(Number);

  for (const shift of SHIFTS) {
    if (h === shift.hour && m >= shift.minute && m <= shift.minute + 10) {
      if (lastExecutedDate[shift.name] !== istDateStr) {
        lastExecutedDate[shift.name] = istDateStr;
        log(`Triggering scheduled shift: ${shift.name.toUpperCase()} (Target: ${shift.hour}:${shift.minute})...`);

        try {
          log(`[DISPATCH] Triggering GitHub Actions cloud runner for shift: ${shift.name}...`);
          execSync(`gh workflow run 391763205 -f mode=${shift.name}`, {
            cwd: 'C:\\mcp\\profile-rank-engine',
            stdio: 'inherit'
          });
          log(`[DISPATCH] GitHub Actions workflow dispatched successfully.`);
        } catch (err) {
          log(`[DISPATCH-ERROR] Failed to dispatch via GitHub CLI: ${err?.message || err}`);
        }
      }
    }
  }
}, 30 * 1000);
