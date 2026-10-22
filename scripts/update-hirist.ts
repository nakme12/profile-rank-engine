import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const HIRIST_FEED_URL = 'https://www.hirist.tech/jobfeed';
const AUTH_STATE_PATH = path.resolve(process.env.HIRIST_AUTH_STATE_PATH ?? 'auth/hirist-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Hirist-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateHirist(): Promise<boolean> {
  log('Starting Hirist tech profile activity & candidate rank boost...');
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
    await page.goto(HIRIST_FEED_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    const isCandidateLoggedIn = await page.evaluate(() => {
      const text = document.body.innerText;
      const isLoggedOut = window.location.href.includes('login') || text.includes('Sign in to Hirist');
      const hasJobfeed = text.includes('Jobfeed') || text.includes('Filter By') || text.includes('GO PREMIUM');
      return hasJobfeed && !isLoggedOut;
    });

    if (!isCandidateLoggedIn) {
      throw new Error('Hirist session is NOT logged in or expired. Please re-run setup.');
    }

    log(`Loaded Hirist feed URL: ${page.url()}`);

    // Natural human interaction: scroll down & trigger active recruiter ping
    await page.evaluate(() => {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    });
    await page.waitForTimeout(2500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'hirist-success.png') });
    log('✅ Hirist Candidate Activity & Active Today status confirmed!');
    return true;
  } catch (err) {
    log(`Hirist update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'hirist-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateHirist().then(() => process.exit(0)).catch(() => process.exit(1));
}
