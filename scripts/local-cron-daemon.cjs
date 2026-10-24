const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'artifacts', 'local-scheduler.log');
const stateFile = path.join(__dirname, '..', 'artifacts', 'scheduler-state.json');

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

function loadState() {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (e) {}
  return { lastExecuted: {}, pendingQueues: [] };
}

function saveState(state) {
  try {
    const dir = path.dirname(stateFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {}
}

let state = loadState();

log('Dual-Engine Local Rank Booster Scheduler Daemon (with Offline Queue & Catch-up) started.');

// Check for any missed shifts when laptop was closed/offline
function checkMissedShifts() {
  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
  const [currentH, currentM] = istTimeStr.split(':').map(Number);
  const currentTotalMin = currentH * 60 + currentM;

  for (const shift of SHIFTS) {
    const shiftTotalMin = shift.hour * 60 + shift.minute;
    const executionKey = `${istDateStr}_${shift.name}`;

    // If shift time has passed today and it was never executed
    if (currentTotalMin >= shiftTotalMin && !state.lastExecuted[executionKey]) {
      log(`[CATCH-UP] Detected missed shift while offline/closed: ${shift.name.toUpperCase()} (was due at ${shift.hour}:${shift.minute}).`);
      triggerShift(shift.name, executionKey);
      break; // Run one catchup at a time to prevent duplicate simultaneous jobs
    }
  }
}

function triggerShift(shiftName, executionKey) {
  try {
    log(`[DISPATCH] Triggering GitHub Actions cloud runner for shift: ${shiftName}...`);
    execSync(`gh workflow run 391763205 -f mode=${shiftName}`, {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    log(`[DISPATCH] GitHub Actions workflow dispatched successfully for ${shiftName}.`);
    state.lastExecuted[executionKey] = new Date().toISOString();
    saveState(state);
  } catch (err) {
    log(`[DISPATCH-OFFLINE] Network/GitHub unreachable or offline: ${err?.message || err}. Queued for retry when online.`);
  }
}

// Initial catchup check on startup
checkMissedShifts();

setInterval(() => {
  const now = new Date();
  const istDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' });
  const [h, m] = istTimeStr.split(':').map(Number);
  const currentTotalMin = h * 60 + m;

  for (const shift of SHIFTS) {
    const shiftTotalMin = shift.hour * 60 + shift.minute;
    const executionKey = `${istDateStr}_${shift.name}`;

    // Trigger on time OR catch up if missed within today
    if (currentTotalMin >= shiftTotalMin && !state.lastExecuted[executionKey]) {
      log(`Triggering shift: ${shift.name.toUpperCase()} (Target: ${shift.hour}:${shift.minute})...`);
      triggerShift(shift.name, executionKey);
      break;
    }
  }
}, 30 * 1000);
