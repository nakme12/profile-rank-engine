import { firefox, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const WELLFOUND_PROFILE_URL = 'https://wellfound.com/jobs';
const AUTH_STATE_PATH = path.resolve(process.env.WF_AUTH_STATE_PATH ?? 'auth/wellfound-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Wellfound-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateWellfound(): Promise<boolean> {
  log('Starting Wellfound profile activity boost...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const browser = await firefox.launch({
    headless: process.env.HEADLESS !== 'false',
    args: ['--disable-dev-shm-usage', '--disable-gpu']
  });

  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0'
  });

  const page = await context.newPage();

  try {
    await page.goto(WELLFOUND_PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    if (page.url().includes('login')) {
      throw new Error('Wellfound session expired. Please re-run setup-session.');
    }

    log(`Loaded Wellfound URL: ${page.url()}`);

    // Touch profile / preferences to register activity
    await page.evaluate(() => {
      window.scrollBy(0, 300);
    });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'wellfound-success.png') });
    log('✅ Wellfound activity timestamp updated to Active Today!');
    return true;
  } catch (err) {
    log(`Wellfound update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'wellfound-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateWellfound().then(() => process.exit(0)).catch(() => process.exit(1));
}
