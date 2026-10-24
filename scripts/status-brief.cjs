const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getStatusSummary() {
  const rootDir = path.join(__dirname, '..');
  const stateFile = path.join(rootDir, 'artifacts', 'scheduler-state.json');

  console.log('================================================================================');
  console.log('🤖 PROFILE RANK ENGINE — AGENT BRIEFING & LIVE REPOSITORY STATUS');
  console.log('================================================================================');

  // 1. Local Scheduler Process Status
  let daemonPid = 'Not running';
  try {
    const psOut = execSync('powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like \\"*local-cron-daemon*\\" } | Select-Object -ExpandProperty ProcessId"', { encoding: 'utf8' }).trim();
    if (psOut) daemonPid = psOut.split('\n')[0].trim();
  } catch (e) {}
  console.log(`• Local Background Daemon: ${daemonPid !== 'Not running' ? `ACTIVE (PID: ${daemonPid})` : 'INACTIVE'}`);

  // 2. Scheduler State File
  if (fs.existsSync(stateFile)) {
    try {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      const executions = Object.keys(state.lastExecuted || {});
      console.log(`• Recorded Shift Executions Today: ${executions.length > 0 ? executions.join(', ') : 'None'}`);
    } catch (e) {}
  }

  // 3. Last GitHub Actions Runs
  let lastRunId = null;
  try {
    const ghList = execSync('gh run list -w "Daily Multi-Platform Profile Rank Booster" -L 3', { encoding: 'utf8' }).trim();
    console.log('\n--- 🕒 Recent Workflow Executions (Cloud) ---');
    console.log(ghList);

    const idOut = execSync('gh run list -w "Daily Multi-Platform Profile Rank Booster" -L 1 --json databaseId -q ".[0].databaseId"', { encoding: 'utf8' }).trim();
    if (idOut) lastRunId = idOut;
  } catch (e) {
    console.log('• Could not query GitHub CLI (or offline).');
  }

  // 4. Last Updated Profiles Breakdown (clean extraction)
  if (lastRunId) {
    try {
      const viewLog = execSync(`gh run view ${lastRunId} --log`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
      const lines = viewLog.split('\n');
      const filtered = lines.filter(l => l.includes('✅ Success') || l.includes('FINAL SUMMARY OF RANK UPDATE'));
      if (filtered.length > 0) {
        console.log(`\n--- 📊 Last Live Update Summary (Run ID: ${lastRunId}) ---`);
        filtered.forEach(line => {
          const cleanLine = line.replace(/.*?(?=FINAL SUMMARY|"\w+":)/, '').replace(/\r/g, '').trim();
          if (cleanLine) console.log('  ' + cleanLine);
        });
      }
    } catch (e) {}
  }

  console.log('================================================================================');
}

getStatusSummary();
