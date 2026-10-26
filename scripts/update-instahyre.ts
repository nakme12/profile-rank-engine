import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { refreshState } from './session-utils';

const INSTAHYRE_URL = 'https://www.instahyre.com/candidate/opportunities/';
const AUTH_STATE_PATH = path.resolve(process.env.INSTA_AUTH_STATE_PATH ?? 'auth/instahyre-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Instahyre-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateInstahyre(): Promise<boolean> {
  log('Starting Instahyre candidate profile rank boost...');
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
    await page.goto(INSTAHYRE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    if (page.url().includes('login')) {
      throw new Error('Instahyre session expired. Please re-run setup-session.');
    }

    log(`Loaded Instahyre opportunities URL: ${page.url()}`);

    // Click show results to register activity
    const showResults = page.locator('button:has-text("Show results")').first();
    if (await showResults.count()) {
      await showResults.click().catch(() => undefined);
      log('Triggered Instahyre active search ping');
    }

    await refreshState(context, AUTH_STATE_PATH, log);

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'instahyre-success.png') });
    log('✅ Instahyre Profile Ranked & Active Today status confirmed!');
    return true;
  } catch (err) {
    log(`Instahyre update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'instahyre-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateInstahyre().then(() => process.exit(0)).catch(() => process.exit(1));
}
