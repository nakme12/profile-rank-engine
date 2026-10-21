import { updateNaukri } from './update-naukri';
import { updateWellfound } from './update-wellfound';
import { updateInstahyre } from './update-instahyre';

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING UNIFIED MULTI-PLATFORM PROFILE RANK BOOST`);
  console.log(`Target: Naukri | Instahyre | Wellfound`);
  console.log(`======================================================\n`);

  const results: Record<string, string> = {};

  // 1. Naukri
  try {
    await updateNaukri();
    results['Naukri'] = '✅ Success (Resume re-uploaded & active)';
  } catch (e: any) {
    results['Naukri'] = `❌ Failed: ${e.message}`;
  }

  // 2. Instahyre
  try {
    await updateInstahyre();
    results['Instahyre'] = '✅ Success (Candidate status refreshed)';
  } catch (e: any) {
    results['Instahyre'] = `❌ Failed: ${e.message}`;
  }

  // 3. Wellfound
  try {
    await updateWellfound();
    results['Wellfound'] = '✅ Success (Activity & preferences pinged)';
  } catch (e: any) {
    results['Wellfound'] = `❌ Failed: ${e.message}`;
  }

  console.log(`\n======================================================`);
  console.log(`📊 FINAL SUMMARY OF DAILY RANK UPDATE:`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Unified updater error:', err);
  process.exit(1);
});
