import { updateNaukri } from './update-naukri';
import { updateWellfound } from './update-wellfound';
import { updateInstahyre } from './update-instahyre';
import { updateCutshort } from './update-cutshort';
import { updateHirist } from './update-hirist';

// Mode from CLI argument or environment: 'morning' | 'afternoon' | 'evening' | 'all'
const targetMode = process.argv[2] ?? process.env.BOOST_MODE ?? 'all';

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING MULTI-PLATFORM PROFILE RANK BOOST`);
  console.log(`Execution Mode: ${targetMode.toUpperCase()}`);
  console.log(`Rule: Strictly 2 updates per platform daily at their best timezone`);
  console.log(`======================================================\n`);

  const results: Record<string, string> = {};

  // 1. NAUKRI (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
  if (['all', 'morning', 'afternoon'].includes(targetMode)) {
    try {
      await updateNaukri();
      results['Naukri'] = '✅ Success (Resume & headline refreshed)';
    } catch (e: any) {
      results['Naukri'] = `❌ Failed: ${e.message}`;
    }
  }

  // 2. INSTAHYRE (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
  if (['all', 'morning', 'afternoon'].includes(targetMode)) {
    try {
      await updateInstahyre();
      results['Instahyre'] = '✅ Success (Candidate status refreshed)';
    } catch (e: any) {
      results['Instahyre'] = `❌ Failed: ${e.message}`;
    }
  }

  // 3. CUTSHORT (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
  if (['all', 'morning', 'afternoon'].includes(targetMode)) {
    try {
      await updateCutshort();
      results['Cutshort'] = '✅ Success (Active Candidate status refreshed)';
    } catch (e: any) {
      results['Cutshort'] = `❌ Failed: ${e.message}`;
    }
  }

  // 4. HIRIST (2 times: Morning ~9 AM & Afternoon ~2:30 PM)
  if (['all', 'morning', 'afternoon'].includes(targetMode)) {
    try {
      await updateHirist();
      results['Hirist'] = '✅ Success (Jobfeed activity refreshed)';
    } catch (e: any) {
      results['Hirist'] = `❌ Failed: ${e.message}`;
    }
  }

  // 5. WELLFOUND (2 times: Afternoon ~2:30 PM & Evening ~7:00 PM for US/Remote founders)
  if (['all', 'afternoon', 'evening'].includes(targetMode)) {
    try {
      await updateWellfound();
      results['Wellfound'] = '✅ Success (Activity & preferences refreshed)';
    } catch (e: any) {
      results['Wellfound'] = `❌ Failed: ${e.message}`;
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 FINAL SUMMARY OF RANK UPDATE (${targetMode.toUpperCase()}):`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Unified updater error:', err);
  process.exit(1);
});
