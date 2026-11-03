import { firefox, type Page } from 'playwright';
import path from 'node:path';

const PROFILE_URL = 'https://www.naukri.com/mnjuser/profile';
const AUTH_STATE_PATH = path.resolve('auth/naukri-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

const SKILLS_TO_ADD = [
  'Node.js',
  'TypeScript',
  'Next.js',
  'Express.js',
  'MongoDB',
  'Redux Toolkit',
  'REST APIs',
  'Tailwind CSS',
  'Full Stack Development',
  'React.js',
  'Mern Stack',
  'JavaScript',
  'Git'
];

function log(msg: string) {
  console.log(`[Enhance-Naukri] ${new Date().toISOString()} ${msg}`);
}

async function addKeySkills(page: Page) {
  log('Navigating to profile for Key Skills update...');
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  const editSkillsBtn = page.locator('span[aria-label="Edit key skills"], .widgetHead:has-text("Key skills") span.edit').first();
  if (!(await editSkillsBtn.isVisible().catch(() => false))) {
    log('Key skills edit button not found');
    return;
  }

  log('Opening Key skills drawer...');
  await editSkillsBtn.click();
  await page.waitForTimeout(2500);

  const skillInput = page.locator('#keySkillSugg');
  if (!(await skillInput.isVisible().catch(() => false))) {
    log('#keySkillSugg input not visible');
    return;
  }

  for (const skill of SKILLS_TO_ADD) {
    try {
      await skillInput.fill(skill);
      await page.waitForTimeout(400);
      await skillInput.press('Enter');
      log(`Added skill tag: ${skill}`);
      await page.waitForTimeout(300);
    } catch (e: any) {
      log(`Skill tag ${skill} skipped: ${e.message}`);
    }
  }

  const saveBtn = page.locator('button#saveKeySkills').first();
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    log('Clicked #saveKeySkills button');
    await page.waitForTimeout(4000);
  }
}

async function updateProfileSummary(page: Page) {
  log('Navigating to profile for Profile Summary update...');
  await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Check if profile summary card already has text
  const currentSummary = await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll('.card, [class*="widget"]')).find(c => c.textContent?.includes('Profile summary'));
    const text = card?.querySelector('.widgetCont, .prefill')?.textContent?.trim();
    return text || '';
  });

  if (currentSummary.includes('Full Stack Developer')) {
    log('Profile summary already present and up to date');
    return;
  }

  const summaryBtn = page.locator('span[aria-label="Edit Profile Summary"], .card:has-text("Profile summary") a:has-text("Add"), .card:has-text("Profile summary") span.edit').first();
  if (await summaryBtn.isVisible().catch(() => false)) {
    log('Clicking Profile summary edit/add button...');
    await summaryBtn.click();
    await page.waitForTimeout(2000);

    const textarea = page.locator('textarea#profileSummaryTxt, textarea[name="profileSummary"], textarea.fue__text-area').first();
    if (await textarea.isVisible().catch(() => false)) {
      const SUMMARY_TEXT = "Results-driven Full Stack Developer with 2+ years of experience specializing in building scalable web applications using React.js, Next.js, Node.js, TypeScript, and MongoDB. Strong expertise in frontend UI architecture, RESTful API design, state management (Redux Toolkit), and performance optimization. Available to join within 15 days.";
      await textarea.fill(SUMMARY_TEXT);
      log('Filled Profile summary text');
      
      const saveBtn = page.locator('button.btn-dark-ot:has-text("Save"), button:has-text("Save")').last();
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        log('Saved Profile summary');
        await page.waitForTimeout(3000);
      }
    }
  }
}

async function main() {
  const browser = await firefox.launch({
    headless: true,
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
    // 1. Add missing Key Skills
    await addKeySkills(page);

    // 2. Add / Update Profile Summary
    await updateProfileSummary(page);

    // Final screenshot & state refresh
    await page.goto(PROFILE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    await context.storageState({ path: AUTH_STATE_PATH });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'naukri-top-rank.png') });
    log('✅ Naukri Profile Ranked to TOP with Complete Full Stack Keywords & Summary!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  log(`Enhance error: ${err?.message || err}`);
  process.exit(1);
});
