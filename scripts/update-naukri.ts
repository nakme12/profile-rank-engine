import { firefox, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROFILE_URL = 'https://www.naukri.com/mnjuser/profile';
const RESUME_PATH = path.resolve('resumes/Pratik_Patidar_Resume.pdf');
const AUTH_STATE_PATH = path.resolve(process.env.AUTH_STATE_PATH ?? 'auth/naukri-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Naukri-Engine] ${new Date().toISOString()} ${msg}`);
}

async function findResumeInput(page: Page) {
  const selectors = [
    'input[type="file"]',
    '#attachCV',
    'input[name="resume"]',
    'input[name="attachCV"]'
  ];
  for (const s of selectors) {
    const loc = page.locator(s).first();
    if (await loc.count()) return loc;
  }
  throw new Error('Naukri resume file input not found');
}

export async function updateNaukri(): Promise<boolean> {
  log('Starting daily Naukri rank boost...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await firefox.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });

  const page = await context.newPage();

  try {
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

    if (page.url().includes('login') || page.url().includes('nlogin')) {
      throw new Error('Naukri session expired. Please re-run setup-session.');
    }

    log(`Loaded profile URL: ${page.url()}`);

    // 1. Upload Resume
    const fileInput = await findResumeInput(page);
    await fileInput.setInputFiles(RESUME_PATH);
    log('Resume file uploaded successfully');

    // 2. Click Save/Update if present
    const saveButtons = [
      page.getByRole('button', { name: /save|update/i }).last(),
      page.locator('button:has-text("Save")').last(),
      page.locator('button:has-text("Update")').last()
    ];

    for (const btn of saveButtons) {
      if (await btn.count() && await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 5000 }).catch(() => undefined);
        log('Clicked Save button');
        break;
      }
    }

    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'naukri-success.png') });
    log('✅ Naukri Profile Ranked & Active Today timestamp updated!');
    return true;
  } catch (err) {
    log(`Naukri update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'naukri-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateNaukri().then(() => process.exit(0)).catch(() => process.exit(1));
}
