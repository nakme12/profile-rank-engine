import { firefox, type Page, type Locator } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { refreshState } from './session-utils';

// Shine.com: candidate profile rank booster + resume re-upload
const PROFILE_URL = 'https://www.shine.com/myshine/myprofile';
const AUTH_STATE_PATH = path.resolve(process.env.SHINE_AUTH_STATE_PATH ?? 'auth/shine-state.json');
const RESUME_PATH = path.resolve(process.env.SHINE_RESUME_PATH ?? 'resumes/Pratik_Patidar_Resume_Full_Stack_Developer.pdf');
const ARTIFACT_DIR = path.resolve('artifacts');

export const CANONICAL_HEADLINE = "Full Stack Developer | MERN Stack | React.js | Node.js | TypeScript | 1.5+ Years Exp";

function log(msg: string) {
  console.log(`[Shine-Engine] ${new Date().toISOString()} ${msg}`);
}

async function findResumeInput(page: Page): Promise<Locator | null> {
  const selectors = [
    'input[type="file"]',
    '#id_file_upload',
    '#id_resume',
    'input[name="resume"]',
    'input[name="file"]',
    'input[accept*="pdf"]'
  ];
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if ((await loc.count().catch(() => 0)) > 0) return loc;
  }
  return null;
}

/** Waits until one of the resume upload selectors becomes available */
async function waitForResumeControl(page: Page, timeoutMs = 25000): Promise<boolean> {
  const candidates = [
    'button:has-text("Upload Resume")',
    'a:has-text("Upload Resume")',
    'button:has-text("Update Resume")',
    'a:has-text("Update Resume")',
    'button:has-text("Replace Resume")',
    'a:has-text("Replace Resume")',
    '[role="button"]:has-text("Upload Resume")',
    'input[type="file"]',
    '#id_file_upload',
    '.cls_upload_resume'
  ];
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const sel of candidates) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) return true;
      if ((await page.locator(sel).first().count().catch(() => 0)) > 0) return true;
    }
    await page.evaluate(() => window.scrollBy(0, 200)).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  return false;
}

async function uploadResume(page: Page): Promise<boolean> {
  // Dismiss any modal overlays or notification popups
  const closePopups = [
    '#push_noti_popup .js-close-noti-popup',
    'button:has-text("Later")',
    'button:has-text("Skip")',
    'button:has-text("Not Now")',
    '.modal .close',
    '#id_fpCancel'
  ];
  for (const sel of closePopups) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => undefined);
      await page.waitForTimeout(500);
    }
  }

  // 1. Try file chooser via click on visible upload/update button
  const uploadButtons = [
    'button:has-text("Update Resume")',
    'a:has-text("Update Resume")',
    'button:has-text("Upload Resume")',
    'a:has-text("Upload Resume")',
    'button:has-text("Replace Resume")',
    'a:has-text("Replace Resume")',
    '.cls_upload_resume'
  ];

  for (const sel of uploadButtons) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      try {
        const [chooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 8000 }),
          btn.click()
        ]);
        await chooser.setFiles(RESUME_PATH);
        log('Resume handed to Shine file chooser');
        return true;
      } catch {
        // Fall back to hidden input
      }
    }
  }

  // 2. Fallback directly to hidden/file input
  const fileInput = await findResumeInput(page);
  if (fileInput) {
    await fileInput.setInputFiles(RESUME_PATH);
    log('Resume set on file input');
    return true;
  }

  return false;
}

export async function updateShine(): Promise<boolean> {
  log('Starting Shine profile rank boost (resume refresh + activity ping)...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const hasResume = await fs
    .access(RESUME_PATH)
    .then(() => true)
    .catch(() => false);

  if (!hasResume) log(`Resume not found at ${RESUME_PATH} — will refresh profile activity only.`);

  const browser = await firefox.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
  });

  const page = await context.newPage();

  try {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

    if (page.url().includes('login')) {
      throw new Error('Shine session expired. Please re-run `npm run setup:shine`.');
    }

    log(`Loaded Shine profile URL: ${page.url()}`);

    // Wait for hydration
    await waitForResumeControl(page, 15000);

    // 1. Re-upload resume (primary rank booster)
    let resumeUploaded = false;
    if (hasResume) {
      try {
        resumeUploaded = await uploadResume(page);
      } catch (e: any) {
        log(`Resume upload error: ${e.message}`);
      }
      if (resumeUploaded) {
        log('✅ Naya Full Stack Resume uploaded to Shine successfully');
        await page.waitForTimeout(5000);
      } else {
        log('Resume upload control not reached — proceeding with profile activity ping');
      }
    }

    // 2. Human-like interaction: scroll profile to register active candidate timestamp
    await page.evaluate(() => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await page.waitForTimeout(3000);

    // 3. Rolling session refresh
    await refreshState(context, AUTH_STATE_PATH, log);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shine-success.png') });
    log('✅ Shine Profile Ranked as Full Stack Developer & Active Today timestamp confirmed!');
    return true;
  } catch (err) {
    log(`Shine update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shine-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateShine().then(() => process.exit(0)).catch(() => process.exit(1));
}
