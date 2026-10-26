import { updateNaukri } from './update-naukri';
import { updateWellfound } from './update-wellfound';
import { updateInstahyre } from './update-instahyre';
import { updateCutshort } from './update-cutshort';
import { updateHirist } from './update-hirist';
import { updateFoundit } from './update-foundit';
import { sendTelegramMessage } from './notify-telegram';
import { PLATFORMS, stateExists, type PlatformKey } from './session-utils';

// Mode from CLI argument or environment: 'morning' | 'afternoon' | 'evening' | 'all'
const targetMode = process.argv[2] ?? process.env.BOOST_MODE ?? 'all';

function log(msg: string) {
  console.log(`[Orchestrator] ${new Date().toISOString()} ${msg}`);
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING MULTI-PLATFORM PROFILE RANK BOOST`);
  console.log(`Execution Mode: ${targetMode.toUpperCase()}`);
  console.log(`Rule: Strictly 2 updates per platform daily at their best timezone`);
  console.log(`======================================================\n`);

  const results: Record<string, string> = {};

  // Runs one platform, but skips it cleanly when no saved session exists
  // (e.g. a platform that has not been logged in yet) instead of reporting a hard failure.
  const run = async (key: PlatformKey, label: string, successMsg: string, fn: () => Promise<unknown>) => {
    if (!(await stateExists(PLATFORMS[key]))) {
      log(`${label}: no saved session — skipping`);
      results[label] = `⏭️ Skipped (no session: auth/${key}-state.json)`;
      return;
    }
    try {
      await fn();
      results[label] = successMsg;
    } catch (e: any) {
      results[label] = `❌ Failed: ${e.message}`;
    }
  };

  const indiaShift = ['all', 'morning', 'afternoon'].includes(targetMode);
  const wellfoundShift = ['all', 'afternoon', 'evening'].includes(targetMode);

  if (indiaShift) {
    // 1. NAUKRI (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
    await run('naukri', 'Naukri', '✅ Success (Resume & headline refreshed)', updateNaukri);

    // 2. INSTAHYRE (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
    await run('instahyre', 'Instahyre', '✅ Success (Candidate status refreshed)', updateInstahyre);

    // 3. CUTSHORT (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
    await run('cutshort', 'Cutshort', '✅ Success (Active Candidate status refreshed)', updateCutshort);

    // 4. HIRIST (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
    await run('hirist', 'Hirist', '✅ Success (Jobfeed activity refreshed)', updateHirist);

    // 5. FOUNDIT (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
    await run('foundit', 'Foundit', '✅ Success (Resume & profile refreshed)', updateFoundit);
  }

  // 6. WELLFOUND (2 times: Afternoon ~2:30 PM & Evening ~7:00 PM for US/Remote founders)
  if (wellfoundShift) {
    await run('wellfound', 'Wellfound', '✅ Success (Activity & preferences refreshed)', updateWellfound);
  }

  console.log(`\n======================================================`);
  console.log(`📊 FINAL SUMMARY OF RANK UPDATE (${targetMode.toUpperCase()}):`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`======================================================\n`);

  // Send Telegram Notification
  const summaryLines = Object.entries(results).map(([k, v]) => `• *${k}*: ${v}`).join('\n');
  const telegramMsg = `🚀 *Profile Rank Booster Status*\n*Shift*: \`${targetMode.toUpperCase()}\`\n*Time*: \`${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST\`\n\n${summaryLines}`;
  await sendTelegramMessage(telegramMsg);

  console.log('✅ Rank booster run completed successfully. Exiting.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unified updater error:', err);
  process.exit(1);
});
