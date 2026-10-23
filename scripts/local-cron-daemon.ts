import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const logFile = path.join('C:', 'mcp', 'profile-rank-engine', 'artifacts', 'local-scheduler.log');

function log(msg: string) {
  const line = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logFile, line);
  } catch (e) {}
}

// Scheduled Slots in 24-hour format (IST):
// 1. Morning Shift: 08:45 AM
// 2. Afternoon Shift: 02:15 PM
// 3. Evening Shift: 06:45 PM
const SHIFTS = [
  { name: 'morning', hour: 8, minute: 45 },
  { name: 'afternoon', hour: 14, minute: 15 },
  { name: 'evening', hour: 18, minute: 45 }
];

let lastExecutedDate: { [shift: string]: string } = {};

log('Dual-Engine Local Rank Booster Scheduler Daemon started.');

setInterval(() => {
  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' }); // HH:MM:SS
  const [h, m] = istTimeStr.split(':').map(Number);

  for (const shift of SHIFTS) {
    // Check if current time matches scheduled window (+/- 5 mins) and hasn't run today
    if (h === shift.hour && m >= shift.minute && m <= shift.minute + 10) {
      if (lastExecutedDate[shift.name] !== istDateStr) {
        lastExecutedDate[shift.name] = istDateStr;
        log(`Triggering scheduled shift: ${shift.name.toUpperCase()} (Target: ${shift.hour}:${shift.minute})...`);
        
        try {
          // 1. Trigger GitHub Actions via gh CLI
          log(`[DISPATCH] Triggering GitHub Actions cloud runner for shift: ${shift.name}...`);
          execSync(`gh workflow run 391763205 -f mode=${shift.name}`, {
            cwd: 'C:\\mcp\\profile-rank-engine',
            stdio: 'inherit'
          });
          log(`[DISPATCH] GitHub Actions workflow dispatched successfully.`);
        } catch (err: any) {
          log(`[DISPATCH-ERROR] Failed to dispatch via GitHub CLI: ${err?.message || err}`);
        }
      }
    }
  }
}, 30 * 1000); // Check every 30 seconds
