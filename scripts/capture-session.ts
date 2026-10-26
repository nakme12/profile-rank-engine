import { chromium, firefox, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  PLATFORMS,
  PLATFORM_KEYS,
  isLoggedIn,
  resolveStatePath,
  saveStateForOrigin,
  type PlatformConfig,
  type PlatformKey
} from './session-utils';

const CDP_URL = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const POLL_MS = 5000;

function log(msg: string) {
  console.log(`[Capture] ${new Date().toISOString()} ${msg}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const platform = (args[0] ?? '').toLowerCase() as PlatformKey;
  const useCdp = args.includes('--cdp');
  const timeoutArg = args.find((a) => a.startsWith('--timeout='));
  const timeoutMin = timeoutArg
    ? Number(timeoutArg.split('=')[1])
    : Number(process.env.CAPTURE_TIMEOUT_MIN ?? 15);
  return { platform, useCdp, timeoutMin };
}

/**
 * Polls `attempt()` until it returns a saved file path.
 * `attempt` returns null while the user has not finished logging in.
 */
async function pollUntilSaved(attempt: () => Promise<string | null>, timeoutMin: number): Promise<string> {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMin * 60_000;
  let lastNotice = 0;

  while (Date.now() < deadline) {
    try {
      const saved = await attempt();
      if (saved) {
        const secs = Math.round((Date.now() - startedAt) / 1000);
        log(`Login detected after ${secs}s. Session saved -> ${saved}`);
        return saved;
      }
    } catch (e: any) {
      log(`Poll warning: ${e?.message ?? e}`);
    }

    if (Date.now() - lastNotice > 30_000) {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 60_000));
      log(`Waiting for login... (${left} min left)`);
      lastNotice = Date.now();
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  throw new Error(`Login not detected within ${timeoutMin} minutes`);
}

/** Any tab in the browser that already sits behind the auth wall. */
function findLoggedInTab(context: BrowserContext, cfg: PlatformConfig): Page | null {
  for (const candidate of context.pages()) {
    const url = candidate.url();
    if (!url || url.startsWith('devtools://') || url.startsWith('chrome')) continue;
    if (cfg.loggedInUrlPatterns.some((p) => url.includes(p))) return candidate;
  }
  return null;
}


async function captureViaCdp(platform: PlatformKey, timeoutMin: number) {
  const cfg = PLATFORMS[platform];
  const target = resolveStatePath(cfg);
  const origin = new URL(cfg.profileUrl).origin;

  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  if (!context) throw new Error('No browser context over CDP. Is Brave running with --remote-debugging-port=9222?');

  log(`Connected to existing browser over CDP (${CDP_URL})`);
  const page = await context.newPage();
  const probe = await context.newPage();

  const saveFrom = async (source: Page): Promise<string> => {
    const info = await saveStateForOrigin(context, source, origin, target);
    log(`Saved ${info.cookieCount} cookies + ${info.localStorageCount} localStorage keys`);
    return info.file;
  };

  // Probe the protected profile URL: the only reliable proof of a live session.
  // Runs in its own tab so the user's tab is never disturbed.
  const probeLoggedIn = async (): Promise<boolean> => {
    try {
      await probe.goto(cfg.profileUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await probe.waitForTimeout(2_000);
      return await isLoggedIn(probe, cfg);
    } catch {
      return false;
    }
  };

  try {
    if (await probeLoggedIn()) {
      log(`${cfg.label}: live session confirmed on the profile page — saving now.`);
      return await saveFrom(probe);
    }

    log(`${cfg.label}: no live session yet. Login tab khol diya hai.`);
    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await page.bringToFront().catch(() => undefined);

    return await pollUntilSaved(async () => {
      const loggedIn = await probeLoggedIn();
      return loggedIn ? saveFrom(probe) : null;
    }, timeoutMin);
  } finally {
    // Never call browser.close() on a CDP connection: that would shut down the user's Brave.
    await probe.close().catch(() => undefined);
    await page.close().catch(() => undefined);
    log('Temporary tabs closed. Existing browser left untouched.');
  }
}

async function captureViaNewBrowser(platform: PlatformKey, timeoutMin: number) {
  const cfg = PLATFORMS[platform];
  const target = resolveStatePath(cfg);

  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });
  const page = await context.newPage();

  try {
    await page.goto(cfg.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    log(`${cfg.label}: browser window khula hai. Login karo (OTP included) — ENTER ki zaroorat nahi.`);

    return await pollUntilSaved(async () => {
      if (!(await isLoggedIn(page, cfg))) return null;
      await fs.mkdir(path.dirname(target), { recursive: true });
      await context.storageState({ path: target });
      return target;
    }, timeoutMin);
  } finally {
    await browser.close();
  }
}

async function main() {
  const { platform, useCdp, timeoutMin } = parseArgs();

  if (!platform || !PLATFORM_KEYS.includes(platform)) {
    console.error(`Usage: npx tsx scripts/capture-session.ts <${PLATFORM_KEYS.join('|')}> [--cdp] [--timeout=15]`);
    process.exit(1);
  }

  const saved = useCdp ? await captureViaCdp(platform, timeoutMin) : await captureViaNewBrowser(platform, timeoutMin);

  console.log(`\n✅ Session ready: ${saved}`);
  console.log(`Next: npx tsx scripts/verify-sessions.ts --only ${platform}`);

  // CDP connections keep the event loop alive; exit explicitly so the command never hangs.
  process.exit(0);
}

main().catch((err) => {
  console.error(`[Capture] Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
