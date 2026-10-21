import { firefox, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const LINKEDIN_PROFILE_URL = 'https://www.linkedin.com/in/pratik-patidar/';
const AUTH_STATE_PATH = path.resolve(process.env.LINKEDIN_AUTH_STATE_PATH ?? 'auth/linkedin-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[LinkedIn-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateLinkedIn(): Promise<boolean> {
  log('Starting LinkedIn profile activity & Open-to-Work rank boost...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

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
    await page.goto(LINKEDIN_PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    if (page.url().includes('login') || page.url().includes('checkpoint')) {
      throw new Error('LinkedIn session expired or requires checkpoint review.');
    }

    log(`Loaded LinkedIn URL: ${page.url()}`);

    // Human scroll simulation to register genuine active session
    await page.evaluate(() => {
      window.scrollBy({ top: 350, behavior: 'smooth' });
    });
    await page.waitForTimeout(3000);

    // Subtle touch to headline / activity feed
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'linkedin-success.png') });
    log('✅ LinkedIn Profile Activity Refreshed to Active Today!');
    return true;
  } catch (err) {
    log(`LinkedIn update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'linkedin-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateLinkedIn().then(() => process.exit(0)).catch(() => process.exit(1));
}
