import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const AUTH_STATE_PATH = path.resolve('auth/linkedin-state.json');

async function test() {
  console.log('Testing LinkedIn with session:', AUTH_STATE_PATH);
  
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH,
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });
  
  const page = await context.newPage();
  await page.goto('https://www.linkedin.com/me/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  console.log('URL after goto:', page.url());
  console.log('Title:', await page.title());
  
  // Check if we're on login page
  const url = page.url();
  if (url.includes('login')) {
    console.log('Session expired - on login page');
  } else {
    console.log('Session active - on profile page');
    // Check for dashboard indicators
    const bodyText = await page.innerText('body');
    console.log('Body length:', bodyText.length);
    console.log('Has dashboard:', bodyText.includes('dashboard') || bodyText.includes('Me'));
  }
  
  await browser.close();
}

test().catch(e => console.error('Error:', e.message));