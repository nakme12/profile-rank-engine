import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { refreshState } from './session-utils';

const LINKEDIN_PROFILE_URL = 'https://www.linkedin.com/me/';
const AUTH_STATE_PATH = path.resolve(process.env.LI_AUTH_STATE_PATH ?? 'auth/linkedin-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[LinkedIn-Engine] ${new Date().toISOString()} ${msg}`);
}

export async function updateLinkedin(): Promise<boolean> {
  log('Starting LinkedIn profile rank boost...');
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
    await page.goto(LINKEDIN_PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

    // Check if login page or session expired
    if (page.url().includes('login')) {
      throw new Error('LinkedIn session expired. Please re-run setup-session.');
    }

    log(`Loaded LinkedIn profile URL: ${page.url()}`);

    // Wait for page to load completely
    await page.waitForTimeout(3000);

    // Try to find and click the "Add profile section" or "Edit" buttons
    // LinkedIn profile editing is more complex - try to interact with sections

    // Scroll down to load more content
    await page.evaluate(() => {
      window.scrollBy(0, 500);
    });
    await page.waitForTimeout(2000);

    // Try to find edit buttons - LinkedIn uses specific classes
    const editButtons = page.locator('button[aria-label*="edit"], span[aria-label*="edit"], .pv-profile-section__edit-button');
    
    // Try to update headline if editable
    try {
      const headlineEditable = await page.locator('.text-heading-xxlarge.inline.t-26.t-bold.inline-block').first();
      if (await headlineEditable.isVisible().catch(() => false)) {
        // Check if we can edit
        const editBtn = page.locator('button[aria-label*="edit"]').first();
        if (await editBtn.isVisible().catch(() => false)) {
          await editBtn.click();
          await page.waitForTimeout(1000);
          // Try to fill headline
          const headlineInput = page.locator('textarea').first();
          if (await headlineInput.isVisible().catch(() => false)) {
            await headlineInput.fill("Full Stack Developer | MERN Stack | React.js | Node.js | TypeScript | 1.5+ Years Exp");
            await page.waitForTimeout(1000);
            // Save
            const saveBtn = page.locator('button[aria-label*="save"]').first();
            if (await saveBtn.isVisible().catch(() => false)) {
              await saveBtn.click();
              log('LinkedIn headline updated');
            }
          }
        }
      }
    } catch (e: any) {
      log(`Headline update note: ${e.message}`);
    }

    // Scroll and interact with about section
    await page.evaluate(() => {
      window.scrollBy(0, 800);
    });
    await page.waitForTimeout(2000);

    // Try to click "More...", "See all", or interaction buttons
    const interactionBtns = page.locator('button:visible').filter({ hasNot: page.locator('span:has-text("Save")') });
    const btnCount = await interactionBtns.count();
    log(`Found ${btnCount} visible buttons on profile`);

    // Refresh session state
    await refreshState(context, AUTH_STATE_PATH, log);

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'linkedin-success.png') });
    log('✅ LinkedIn Profile activity check completed!');
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
  updateLinkedin().then(() => process.exit(0)).catch(() => process.exit(1));
}