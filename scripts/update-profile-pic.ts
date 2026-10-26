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

/**
 * Foundit: the web profile UI renders no photo control, so the internal avatar API is used.
 * Reverse-engineered with REA from the shipped Next.js bundles
 * (evidence ev_ea5523b4fb0f7294d5543d6987a33c879ac5c9f0b3a457b76a0b9b3170388be8):
 *
 *   POST /falcon/api/users/v1/me/upload-avatar
 *   multipart/form-data, single part "file" (png/jpg/jpeg, <= 6 MB)
 *   auth:  Authorization: Bearer <JWT>
 *          where JWT = Buffer.from(cookie MSSOAT, 'base64').toString('utf8').split('::')[0]
 *   action mapping in the bundle: "add" -> POST, "edit" -> PUT, "delete" -> DELETE
 */
async function updateFoundit(page: Page): Promise<Result> {
  await page.goto('https://www.foundit.in/seeker/profile', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);

  // Cookie banner can sit on top of the page
  await page.locator('button:has-text("Okay")').first().click({ timeout: 3000 }).catch(() => undefined);

  if (/\/rio\/login|nlogin/i.test(page.url())) return { ok: false, note: 'session expired' };

  const avatarSrc = () =>
    page.evaluate(() => {
      const img = document.querySelector('[class*="profile_avatar"] img, img[alt*="profile" i]') as HTMLImageElement | null;
      return img ? img.src : '';
    });

  const before = await avatarSrc();

  // Derive the bearer token exactly like the site's own request wrapper does
  const cookies = await page.context().cookies('https://www.foundit.in');
  const mssoat = cookies.find((c) => c.name === 'MSSOAT')?.value ?? '';
  if (!mssoat) return { ok: false, note: 'MSSOAT cookie missing — session needs a fresh login' };

  const jwt = Buffer.from(decodeURIComponent(mssoat), 'base64').toString('utf8').split('::')[0];
  if (jwt.split('.').length !== 3) return { ok: false, note: 'MSSOAT did not decode to a JWT — session needs a refresh' };

  const ext = path.extname(PHOTO_PATH).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';

  const res = await page.request.post('https://www.foundit.in/falcon/api/users/v1/me/upload-avatar', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      'x-language-code': 'EN',
      Origin: 'https://www.foundit.in',
      Referer: 'https://www.foundit.in/seeker/profile'
    },
    multipart: {
      file: { name: `photo${ext}`, mimeType: mime, buffer: await fs.readFile(PHOTO_PATH) }
    },
    timeout: 60000
  });

  const body = (await res.text()).slice(0, 200);
  log(`Foundit: POST upload-avatar -> HTTP ${res.status()} ${body}`);
  await shot(page, 'foundit-upload');

  if (!res.ok()) return { ok: false, note: `upload-avatar HTTP ${res.status()}: ${body}` };

  // Avatar is served from /falcon/api/users/v1/me/download-avatar/<uuid> — the uuid changes on upload
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  await page.waitForTimeout(7000);
  const after = await avatarSrc();
  await shot(page, 'foundit-final');

  const changed = Boolean(before && after && before !== after) || (Boolean(after) && !before);
  return { ok: true, note: changed ? 'photo saved (avatar URL refreshed)' : 'photo saved (API confirmed)' };
}

const HANDLERS: Record<string, { label: string; auth: string; run: (p: Page) => Promise<Result> }> = {
  naukri: { label: 'Naukri', auth: 'auth/naukri-state.json', run: updateNaukri },
  wellfound: { label: 'Wellfound', auth: 'auth/wellfound-state.json', run: updateWellfound },
  instahyre: { label: 'Instahyre', auth: 'auth/instahyre-state.json', run: updateInstahyre },
  foundit: { label: 'Foundit', auth: 'auth/foundit-state.json', run: updateFoundit },
  hirist: {
    label: 'Hirist',
    auth: 'auth/hirist-state.json',
    run: async () => ({ ok: false, note: 'web UI me photo upload control nahi (app-only) — skipped' })
  },
  cutshort: {
    label: 'Cutshort',
    auth: 'auth/cutshort-state.json',
    // REA finding: the app uploads via POST /getuploadurl/profile_picture (S3 presigned URL),
    // then stores the returned URL through the user-update mutation. The route that hosts the
    // "Profile picture" field is not reachable from /settings (404) or /profile/edit, so the
    // exact confirm call is still unknown.
    run: async () => ({
      ok: false,
      note: 'not wired yet — bundle shows POST /getuploadurl/profile_picture (S3) but the confirm endpoint is unknown'
    })
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
