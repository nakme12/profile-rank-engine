import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { refreshState } from './session-utils';

const CUTSHORT_DASHBOARD_URL = 'https://cutshort.io/profile/candidate-dashboard';
const AUTH_STATE_PATH = path.resolve(process.env.CUTSHORT_AUTH_STATE_PATH ?? 'auth/cutshort-state.json');
const RESUME_PATH = path.resolve('resumes/Pratik_Patidar_Resume_Full_Stack_Developer.pdf');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Cutshort-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateCutshort(): Promise<boolean> {
  log('Starting Cutshort candidate activity & rank boost...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await firefox.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN'
  });

  const page = await context.newPage();

  try {
    await page.goto(CUTSHORT_DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Strict login verification
    const isCandidateLoggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      const isLoggedOut = text.includes('Sign up') && text.includes('Log in');
      const hasDashboardIndicators = text.includes('Dashboard') || text.includes('Profile') || text.includes('Applications');
      return hasDashboardIndicators && !isLoggedOut;
    });

    if (!isCandidateLoggedIn || page.url().includes('login')) {
      throw new Error('Cutshort session is NOT logged in or expired. Please re-run session setup.');
    }

    log(`Loaded Cutshort candidate dashboard URL: ${page.url()}`);

    // Natural human interaction: scroll & trigger active ping
    await page.evaluate(() => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await page.waitForTimeout(2000);

    // Full Stack Resume Re-upload
    try {
      const updateResumeBtn = page.locator('text=/update resume/i').first();
      if (await updateResumeBtn.count()) {
        log('Found "Update resume" button, clicking...');
        await updateResumeBtn.click().catch(() => undefined);
        await page.waitForTimeout(2000);

        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count()) {
          await fileInput.setInputFiles(RESUME_PATH);
          log('Uploaded Full Stack Developer resume to Cutshort');
          await page.waitForTimeout(6000);
        }
      }
    } catch (uploadErr: any) {
      log(`Cutshort resume upload warning (dashboard ping succeeded): ${uploadErr?.message || uploadErr}`);
    }

    await refreshState(context, AUTH_STATE_PATH, log);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cutshort-success.png') });
    log('✅ Cutshort Profile Activity & Full Stack resume refreshed!');
    return true;
  } catch (err) {
    log(`Cutshort update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cutshort-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateCutshort().then(() => process.exit(0)).catch(() => process.exit(1));
}
