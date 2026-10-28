import type { BrowserContext, Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

// Shared session helpers used by capture-session.ts / verify-sessions.ts
// (Existing update-*.ts engines only import refreshState, so their behaviour is unchanged.)

export type PlatformKey = 'naukri' | 'instahyre' | 'cutshort' | 'hirist' | 'foundit' | 'wellfound';

export interface PlatformConfig {
  key: PlatformKey;
  label: string;
  loginUrl: string;
  profileUrl: string;
  authStateFile: string;
  /** Text patterns that only appear when the candidate is logged in */
  loggedInPatterns: string[];
  /** URL fragments that only appear behind auth (redirect to /login otherwise) */
  loggedInUrlPatterns: string[];
}

export const PLATFORMS: Record<PlatformKey, PlatformConfig> = {
  naukri: {
    key: 'naukri',
    label: 'Naukri',
    loginUrl: 'https://www.naukri.com/nlogin/login',
    profileUrl: 'https://www.naukri.com/mnjuser/profile',
    authStateFile: 'auth/naukri-state.json',
    loggedInPatterns: ['mnjuser', 'Logout', 'My Naukri', 'Resume headline'],
    loggedInUrlPatterns: ['/mnjuser']
  },
  instahyre: {
    key: 'instahyre',
    label: 'Instahyre',
    loginUrl: 'https://www.instahyre.com/login/',
    profileUrl: 'https://www.instahyre.com/candidate/opportunities/',
    authStateFile: 'auth/instahyre-state.json',
    loggedInPatterns: ['candidate', 'Show results', 'Logout', 'My Profile'],
    loggedInUrlPatterns: ['/candidate/']
  },
  cutshort: {
    key: 'cutshort',
    label: 'Cutshort',
    loginUrl: 'https://cutshort.io/login',
    profileUrl: 'https://cutshort.io/profile/candidate-dashboard',
    authStateFile: 'auth/cutshort-state.json',
    loggedInPatterns: ['candidate-dashboard', 'Dashboard', 'Applications'],
    loggedInUrlPatterns: ['/profile/candidate-dashboard']
  },
  hirist: {
    key: 'hirist',
    label: 'Hirist',
    loginUrl: 'https://www.hirist.tech/login',
    profileUrl: 'https://www.hirist.tech/jobfeed',
    authStateFile: 'auth/hirist-state.json',
    loggedInPatterns: ['Jobfeed', 'Filter By', 'GO PREMIUM'],
    loggedInUrlPatterns: ['/jobfeed']
  },
  foundit: {
    key: 'foundit',
    label: 'Foundit',
    loginUrl: 'https://www.foundit.in/login',
    profileUrl: 'https://www.foundit.in/seeker/profile',
    authStateFile: 'auth/foundit-state.json',
    loggedInPatterns: ['My Profile', 'Profile Completeness', 'Applied Jobs', 'Recommended Jobs', 'Logout', 'seeker'],
    loggedInUrlPatterns: ['/seeker/']
  },
  wellfound: {
    key: 'wellfound',
    label: 'Wellfound',
    loginUrl: 'https://wellfound.com/login',
    profileUrl: 'https://wellfound.com/jobs',
    authStateFile: 'auth/wellfound-state.json',
    loggedInPatterns: ['Applied', 'Messages', 'Profile'],
    loggedInUrlPatterns: ['/jobs']
  },
  linkedin: {
    key: 'linkedin',
    label: 'LinkedIn',
    loginUrl: 'https://www.linkedin.com/login',
    profileUrl: 'https://www.linkedin.com/me/',
    authStateFile: 'auth/linkedin-state.json',
    loggedInPatterns: ['dashboard', 'My Network', 'Jobs'],
    loggedInUrlPatterns: ['/feed', '/in/']
  }
};

export const PLATFORM_KEYS = Object.keys(PLATFORMS) as PlatformKey[];

export function resolveStatePath(cfg: PlatformConfig): string {
  return path.resolve(cfg.authStateFile);
}

export async function stateExists(cfg: PlatformConfig): Promise<boolean> {
  return fs
    .access(resolveStatePath(cfg))
    .then(() => true)
    .catch(() => false);
}

/** Best-effort logged-in detection. A visible login form always wins: text patterns alone proved unreliable. */
export async function isLoggedIn(page: Page, cfg: PlatformConfig): Promise<boolean> {
  const url = page.url();
  if (/\/(login|signin|register|nlogin)\b/i.test(url)) return false;

  const hasLoginForm = await page
    .evaluate(() => {
      if (document.querySelector('input[type="password"]')) return true;
      const text = document.body?.innerText ?? '';
      return /Send OTP|Login via Password|Register here|Forgot password|Welcome back!/i.test(text);
    })
    .catch(() => false);
  if (hasLoginForm) return false;

  // Behind-auth URL plus no login form is the strongest signal
  if (cfg.loggedInUrlPatterns.some((p) => url.includes(p))) return true;

  try {
    return await page.evaluate((patterns: string[]) => {
      const text = document.body?.innerText ?? '';
      return patterns.some((p) => new RegExp(p, 'i').test(text));
    }, cfg.loggedInPatterns);
  } catch {
    return false;
  }
}

export interface SavedStateInfo {
  cookieCount: number;
  localStorageCount: number;
  file: string;
}

/** Save ONLY the given site's cookies (+ that page's localStorage) — never the whole browser profile. */
export async function saveStateForOrigin(
  context: BrowserContext,
  page: Page,
  origin: string,
  file: string
): Promise<SavedStateInfo> {
  const cookies = await context.cookies(origin);

  let origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }> = [];
  try {
    origins = await page.evaluate(() => {
      const items: Array<{ name: string; value: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if (!name) continue;
        items.push({ name, value: localStorage.getItem(name) ?? '' });
      }
      return [{ origin: location.origin, localStorage: items }];
    });
  } catch {
    origins = [];
  }

  const target = path.resolve(file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify({ cookies, origins }, null, 2), 'utf8');

  return { cookieCount: cookies.length, localStorageCount: origins[0]?.localStorage.length ?? 0, file: target };
}

/** Rolling refresh: write the live cookies back so the saved session ages out slower. Never throws. */
export async function refreshState(
  context: BrowserContext,
  file: string,
  log: (msg: string) => void
): Promise<void> {
  try {
    await context.storageState({ path: file });
    log(`Session state refreshed -> ${path.basename(file)}`);
  } catch (e: any) {
    log(`Session refresh skipped: ${e?.message ?? e}`);
  }
}
