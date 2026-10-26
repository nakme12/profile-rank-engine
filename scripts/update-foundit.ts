import { firefox, type Locator, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { refreshState } from './session-utils';

// Foundit (ex-Monster India): profile refresh + resume re-upload
// NOTE: selectors are defensive/best-effort. First live run should be verified via artifacts/foundit-success.png
const PROFILE_URLS = [
  'https://www.foundit.in/seeker/profile',
  'https://www.foundit.in/seeker/dashboard',
  'https://www.foundit.in/seeker/home'
];

const RESUME_PATH = path.resolve(process.env.FOUNDIT_RESUME_PATH ?? 'resumes/Pratik_Patidar_Resume.pdf');
const AUTH_STATE_PATH = path.resolve(process.env.FOUNDIT_AUTH_STATE_PATH ?? 'auth/foundit-state.json');
const ARTIFACT_DIR = path.resolve('artifacts');

export const CANONICAL_HEADLINE = "Full Stack Developer | MERN Stack | React.js | Node.js | TypeScript | 1.5+ Years Exp";

function log(msg: string) {
  console.log(`[Foundit-Engine] ${new Date().toISOString()} ${msg}`);
}

async function isLoggedOut(page: Page): Promise<boolean> {
  if (/\/login|\/signin|\/register/i.test(page.url())) return true;

  return page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    const hasLoginCta = /\bLogin\b/i.test(text) && /\bRegister\b/i.test(text);
    const hasSeekerArea = /My Profile|Profile Completeness|Applied Jobs|Recommended Jobs|Search Jobs/i.test(text);
    return hasLoginCta && !hasSeekerArea;
  });
}

async function openProfile(page: Page): Promise<string> {
  for (const url of PROFILE_URLS) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    } catch (e: any) {
      log(`Could not load ${url}: ${e.message}`);
      continue;
    }

    // Session expired is terminal: retrying other URLs will not help.
    if (await isLoggedOut(page)) {
      throw new Error('Foundit session expired. Please re-run: npx tsx scripts/setup-session.ts foundit');
    }

    return page.url();
  }

  throw new Error('Foundit seeker profile page could not be opened');
}

async function findResumeInput(page: Page): Promise<Locator | null> {
  const selectors = [
    'input[name="resume"]',
    'input[type="file"][accept*="pdf"]',
    'input[type="file"]',
    '#fileUpload',
    'input[name="file"]',
    'input[id*="resume" i]',
    'input[id*="upload" i]'
  ];

  for (const s of selectors) {
    const loc = page.locator(s).first();
    if (await loc.count()) return loc;
  }
  return null;
}

/** Returns the first *visible* match (Foundit renders duplicate desktop/mobile controls, one hidden). */
async function firstVisible(page: Page, selector: string): Promise<Locator | null> {
  const all = page.locator(selector);
  const count = await all.count();
  for (let i = 0; i < count; i++) {
    const loc = all.nth(i);
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

/** Waits until one of the selectors becomes visible (Foundit hydrates the resume card late). */
async function waitForVisible(page: Page, selectors: string[], timeoutMs: number): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const s of selectors) {
      const loc = await firstVisible(page, s);
      if (loc) return loc;
    }
    await page.waitForTimeout(1000);
  }
  return null;
}

async function dismissCookieBanner(page: Page) {
  const banner = page.locator('button:has-text("Okay")').first();
  if (await banner.isVisible().catch(() => false)) {
    await banner.click({ timeout: 5000 }).catch(() => undefined);
    log('Dismissed cookie banner');
    await page.waitForTimeout(500);
  }
}

/**
 * Naukri-style resume refresh:
 *  1. Preferred path — click the real "Replace resume" control and hand the PDF to the file chooser
 *  2. Fallback — set the file directly on Foundit's hidden input[name="resume"]
 */
async function uploadResume(page: Page): Promise<boolean> {
  const replaceBtn = await waitForVisible(
    page,
    [
      'button:has-text("Replace resume")',
      'a:has-text("Replace resume")',
      '[role="button"]:has-text("Replace resume")',
      'button:has-text("Update resume")'
    ],
    20_000
  );

  if (replaceBtn) {
    const uploadDone = page
      .waitForResponse(
        (r) => /resume|upload/i.test(r.url()) && ['POST', 'PUT', 'PATCH'].includes(r.request().method()),
        { timeout: 25_000 }
      )
      .catch(() => null);

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10_000 }).catch(() => null),
      replaceBtn.click({ timeout: 5000 }).catch(() => undefined)
    ]);

    if (chooser) {
      await chooser.setFiles(RESUME_PATH);
      log('Resume handed to "Replace resume" file chooser');
      const resp = await uploadDone;
      if (resp) log(`Upload response: HTTP ${resp.status()} ${resp.url().slice(0, 90)}`);
      else log('No upload response captured (may still have succeeded — check screenshot)');
      return true;
    }
    log('Replace resume clicked but no file chooser appeared — trying hidden input');
  }

  const fileInput = await findResumeInput(page);
  if (!fileInput) return false;

  await fileInput.setInputFiles(RESUME_PATH);
  log('Resume set on hidden input[name="resume"]');
  return true;
}

export async function updateFoundit(): Promise<boolean> {
  log('Starting Foundit profile rank boost (resume refresh + activity ping)...');
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });

  const hasResume = await fs
    .access(RESUME_PATH)
    .then(() => true)
    .catch(() => false);
  if (!hasResume) log(`Resume not found at ${RESUME_PATH} — will only refresh profile activity.`);

  const hasState = await fs
    .access(AUTH_STATE_PATH)
    .then(() => true)
    .catch(() => false);
  if (!hasState) {
    throw new Error(
      `Foundit session state not found (${AUTH_STATE_PATH}). Please run: npx tsx scripts/setup-session.ts foundit`
    );
  }

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
    const loadedUrl = await openProfile(page);
    log(`Loaded Foundit profile URL: ${loadedUrl}`);

    await dismissCookieBanner(page);

    // 1. Re-upload resume (primary rank signal — same flow as Naukri)
    let resumeUploaded = false;
    if (hasResume) {
      try {
        resumeUploaded = await uploadResume(page);
      } catch (e: any) {
        log(`Resume upload failed: ${e.message}`);
      }
      if (!resumeUploaded) log('Resume control not found on this page — profile visit only (check screenshot)');
    }

    // 2. Click Save/Update if present
    const saveButtons = [
      page.getByRole('button', { name: /save|update|upload/i }).last(),
      page.locator('button:has-text("Save")').last(),
      page.locator('button:has-text("Update")').last()
    ];

    for (const btn of saveButtons) {
      if ((await btn.count()) && (await btn.isVisible().catch(() => false))) {
        await btn.click({ timeout: 5000 }).catch(() => undefined);
        log('Clicked Save/Update button');
        break;
      }
    }

    // 2b. Upload confirmation / resume parsing (Foundit shows an "Okay" dialog while parsing)
    if (resumeUploaded) {
      const confirmBtn = page.getByRole('button', { name: /^(okay|ok|confirm)$/i }).last();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click({ timeout: 5000 }).catch(() => undefined);
        log('Confirmed resume upload dialog');
      }
      await page.waitForTimeout(8000);
      log('Waited for resume parsing to complete');
    }

    // 3. Optional headline refresh (skipped silently if UI not editable)
    try {
      const headlineField = page
        .locator('textarea[placeholder*="headline" i], input[placeholder*="headline" i], textarea#resumeHeadline')
        .first();

      if (await headlineField.isVisible().catch(() => false)) {
        await headlineField.fill(CANONICAL_HEADLINE);
        const saveHeadlineBtn = page.locator('button:has-text("Save")').first();
        if (await saveHeadlineBtn.isVisible().catch(() => false)) {
          await saveHeadlineBtn.click().catch(() => undefined);
        }
        log(`Updated Foundit headline to: "${CANONICAL_HEADLINE}"`);
      }
    } catch (e: any) {
      log(`Headline update skipped/optional: ${e.message}`);
    }

    // 4. Human-like activity: scroll profile so portal logs a fresh visit
    await refreshState(context, AUTH_STATE_PATH, log);
    await page.evaluate(() => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await page.waitForTimeout(3000);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'foundit-success.png') });
    log('✅ Foundit profile refreshed & activity timestamp updated!');
    return true;
  } catch (err) {
    log(`Foundit update error: ${err}`);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'foundit-error.png') }).catch(() => undefined);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  updateFoundit()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`[Foundit-Engine] Fatal: ${err?.message ?? err}`);
      process.exit(1);
    });
}
