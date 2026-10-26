import { firefox, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

// One-time profile photo updater across job portals.
// Usage: npx tsx scripts/update-profile-pic.ts [naukri|wellfound|instahyre|all]

const PHOTO_PATH = path.resolve(process.env.PROFILE_PHOTO ?? 'assets/profile.jpeg');
const ARTIFACT_DIR = path.resolve('artifacts');

function log(msg: string) {
  console.log(`[Photo] ${new Date().toISOString()} ${msg}`);
}

async function shot(page: Page, name: string) {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `photo-${name}.png`) }).catch(() => undefined);
}

async function firstVisible(page: Page, selector: string) {
  const all = page.locator(selector);
  const count = await all.count();
  for (let i = 0; i < count; i++) {
    const loc = all.nth(i);
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

async function clickAny(page: Page, selectors: string[], timeoutMs = 6000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const s of selectors) {
      const loc = await firstVisible(page, s);
      if (loc) {
        await loc.click({ timeout: 5000 }).catch(() => undefined);
        return true;
      }
    }
    await page.waitForTimeout(500);
  }
  return false;
}

type Result = { ok: boolean; note: string };

async function updateNaukri(page: Page): Promise<Result> {
  await page.goto('https://www.naukri.com/mnjuser/profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(3000);

  if (/nlogin|login/i.test(page.url())) return { ok: false, note: 'session expired' };

  // Open the photo uploader (real user flow), then hand the image over
  await clickAny(page, ['.photoTrigger', '#photoTrigger', '[class*="photoTrigger"]'], 8000);
  await page.waitForTimeout(1500);

  const input = await firstVisible(page, 'input#fileUpload[accept*="image"]');
  if (!input) return { ok: false, note: 'image input not found after opening uploader' };

  await input.setInputFiles(PHOTO_PATH);
  log('Naukri: image submitted to #fileUpload');
  await page.waitForTimeout(4000);
  await shot(page, 'naukri-crop');

  const confirmed = await clickAny(page, [
    '#photoCropper button:has-text("Save")',
    '#photoCropper button:has-text("Apply")',
    '#photoCropper button:has-text("Done")',
    '[class*="crop"] button:has-text("Save")',
    'button:has-text("Save Photo")',
    'button:has-text("Apply")',
    'button:has-text("Save")'
  ], 10000);
  log(`Naukri: crop confirm clicked=${confirmed}`);
  await page.waitForTimeout(5000);
  await shot(page, 'naukri-final');

  const pending = await page.evaluate(() => /Approval Pending/i.test(document.body.innerText || ''));
  return {
    ok: true,
    note: pending ? 'uploaded ✔ (Naukri approval pending)' : confirmed ? 'photo uploaded + confirmed' : 'photo uploaded (no confirm button found)'
  };
}

async function updateWellfound(page: Page): Promise<Result> {
  await page.goto('https://wellfound.com/profile/edit', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  if (/login/i.test(page.url())) return { ok: false, note: 'session expired' };

  const before = await page.evaluate(() => {
    const img = document.querySelector('img[src*="photos.wellfound.com"]');
    return img ? img.getAttribute('src') : '';
  });

  const uploadBtn = await firstVisible(page, 'button:has-text("Upload a new photo"), label:has-text("Upload a new photo")');
  const input = page.locator('input[type="file"][accept*="image"]').first();

  if (uploadBtn) {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null),
      uploadBtn.click({ timeout: 5000 }).catch(() => undefined)
    ]);
    if (chooser) await chooser.setFiles(PHOTO_PATH);
    else if (await input.count()) await input.setInputFiles(PHOTO_PATH);
    log(`Wellfound: image submitted (chooser=${!!chooser})`);
  } else if (await input.count()) {
    await input.setInputFiles(PHOTO_PATH);
    log('Wellfound: image submitted via input');
  } else {
    return { ok: false, note: 'no photo control on profile/edit' };
  }

  // Upload is immediate (GraphQL mutation) — profile page shows a fresh "last updated" date
  await page.waitForTimeout(7000);
  const after = await page.evaluate(() => {
    const img = document.querySelector('img[src*="photos.wellfound.com"]');
    return img ? img.getAttribute('src') : '';
  });
  await shot(page, 'wellfound-final');

  const changed = before !== after;
  return { ok: true, note: changed ? 'photo saved (avatar URL refreshed)' : 'photo submitted (verify screenshot)' };
}

async function updateInstahyre(page: Page): Promise<Result> {
  await page.goto('https://www.instahyre.com/candidate/profile/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  if (/login/i.test(page.url())) return { ok: false, note: 'session expired' };

  // #image-input is hidden — Playwright can still set files on it directly
  const input = page.locator('#image-input, input[type="file"][accept*="image"]').first();
  if (!(await input.count())) return { ok: false, note: '#image-input not found' };

  await input.setInputFiles(PHOTO_PATH).catch(async () => {
    // Some builds need the avatar click first to mount the input handler
    await clickAny(page, ['[class*="profile"] img', '[class*="avatar"]'], 3000);
    await input.setInputFiles(PHOTO_PATH);
  });
  log('Instahyre: image submitted to #image-input');
  await page.waitForTimeout(7000);
  await shot(page, 'instahyre-crop');

  // Confirmation is optimistic: PUT /api/v1/profiles/profile_image/<id> fires automatically
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.waitForTimeout(5000);
  const updated = await page.evaluate(() => /Last updated:?\s*\w{3}\s+\d{1,2},\s*2026/i.test(document.body.innerText || ''));
  await shot(page, 'instahyre-final');
  return { ok: true, note: updated ? 'photo saved + verified on profile' : 'photo uploaded (verify screenshot)' };
}

const HANDLERS: Record<string, { label: string; auth: string; run: (p: Page) => Promise<Result> }> = {
  naukri: { label: 'Naukri', auth: 'auth/naukri-state.json', run: updateNaukri },
  wellfound: { label: 'Wellfound', auth: 'auth/wellfound-state.json', run: updateWellfound },
  instahyre: { label: 'Instahyre', auth: 'auth/instahyre-state.json', run: updateInstahyre },
  foundit: {
    label: 'Foundit',
    auth: 'auth/foundit-state.json',
    run: async () => ({ ok: false, note: 'web UI me photo upload control nahi (app-only) — skipped' })
  },
  hirist: {
    label: 'Hirist',
    auth: 'auth/hirist-state.json',
    run: async () => ({ ok: false, note: 'web UI me photo upload control nahi (app-only) — skipped' })
  },
  cutshort: {
    label: 'Cutshort',
    auth: 'auth/cutshort-state.json',
    run: async () => ({ ok: false, note: 'web UI me photo upload control nahi (talent-card edit only) — skipped' })
  }
};

async function main() {
  const arg = (process.argv[2] ?? 'all').toLowerCase();
  const keys = arg === 'all' ? Object.keys(HANDLERS) : [arg];

  const unknown = keys.filter((k) => !HANDLERS[k]);
  if (unknown.length) {
    console.error(`Unknown platform: ${unknown.join(', ')}. Supported: ${Object.keys(HANDLERS).join(' | ')} | all`);
    process.exit(1);
  }

  const stat = await fs.stat(PHOTO_PATH).catch(() => null);
  if (!stat) {
    console.error(`Photo not found: ${PHOTO_PATH}`);
    process.exit(1);
  }
  log(`Using photo ${PHOTO_PATH} (${stat.size} bytes)`);

  const browser = await firefox.launch({ headless: process.env.HEADLESS !== 'false' });
  const results: Record<string, string> = {};

  for (const key of keys) {
    const h = HANDLERS[key];
    const context = await browser.newContext({
      storageState: h.auth,
      viewport: { width: 1440, height: 1000 },
      locale: 'en-IN'
    });
    const page = await context.newPage();
    try {
      const r = await h.run(page);
      results[h.label] = r.ok ? `✅ ${r.note}` : `❌ ${r.note}`;
    } catch (e: any) {
      results[h.label] = `❌ Failed: ${e.message.split('\n')[0]}`;
      await shot(page, `${key}-error`);
    } finally {
      await context.close();
    }
  }

  await browser.close();
  console.log('\n============ PROFILE PHOTO UPDATE ============');
  console.log(JSON.stringify(results, null, 2));
  console.log('==============================================\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(`[Photo] Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
