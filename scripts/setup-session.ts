import { firefox, chromium, type BrowserContext } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const platform = process.argv[2] || 'naukri';

const PLATFORM_URLS: Record<string, string> = {
  naukri: 'https://www.naukri.com/nlogin/login',
  instahyre: 'https://www.instahyre.com/login/',
  cutshort: 'https://cutshort.io/login',
  hirist: 'https://www.hirist.tech/login',
  foundit: 'https://www.foundit.in/login',
  wellfound: 'https://wellfound.com/login',
  linkedin: 'https://www.linkedin.com/login'
};

async function main() {
  const url = PLATFORM_URLS[platform.toLowerCase()];
  if (!url) {
    console.error(`Unknown platform: ${platform}. Use: ${Object.keys(PLATFORM_URLS).join(' | ')}`);
    process.exit(1);
  }

  const statePath = path.resolve(`auth/${platform.toLowerCase()}-state.json`);
  await fs.mkdir(path.dirname(statePath), { recursive: true });

  console.log(`\n==================================================`);
  console.log(`Setting up authenticated session for: ${platform.toUpperCase()}`);
  console.log(`Browser will open. Please log in normally (solve any OTP/CAPTCHA).`);
  console.log(`==================================================\n`);

  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });

  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const rl = readline.createInterface({ input, output });
  await rl.question(`Log into ${platform} in the browser window, then press [ENTER] here... `);
  await rl.close();

  await context.storageState({ path: statePath });
  console.log(`\n✅ Authenticated session successfully saved to: ${statePath}`);
  console.log(`This file will be used for daily automated updates without OTP.`);

  await context.close();
  await browser.close();
}

main().catch(err => {
  console.error('Session setup error:', err);
  process.exit(1);
});
