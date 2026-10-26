import { firefox } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  PLATFORMS,
  PLATFORM_KEYS,
  isLoggedIn,
  resolveStatePath,
  stateExists,
  type PlatformKey
} from './session-utils';

const ARTIFACT_DIR = path.resolve('artifacts');

type Status = 'OK' | 'EXPIRED' | 'MISSING' | 'ERROR';

interface Row {
  key: PlatformKey;
  label: string;
  status: Status;
  cookies: number;
  note: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const onlyIdx = args.indexOf('--only');
  const only = onlyArg ? onlyArg.split('=')[1] : onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;
  return { only: only?.toLowerCase(), json: args.includes('--json') };
}

async function cookieCount(file: string): Promise<number> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.cookies) ? parsed.cookies.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const { only, json } = parseArgs();

  if (only && !PLATFORM_KEYS.includes(only as PlatformKey)) {
    console.error(`Unknown platform "${only}". Use: ${PLATFORM_KEYS.join(' | ')}`);
    process.exit(1);
  }

  const keys = (only ? [only] : PLATFORM_KEYS) as PlatformKey[];
  const browser = await firefox.launch({ headless: true });
  const rows: Row[] = [];

  for (const key of keys) {
    const cfg = PLATFORMS[key];
    const file = resolveStatePath(cfg);

    if (!(await stateExists(cfg))) {
      rows.push({ key, label: cfg.label, status: 'MISSING', cookies: 0, note: `run: npx tsx scripts/capture-session.ts ${key}` });
      continue;
    }

    const cookies = await cookieCount(file);
    const context = await browser.newContext({
      storageState: file,
      viewport: { width: 1440, height: 1000 },
      locale: 'en-IN'
    });
    const page = await context.newPage();

    try {
      await page.goto(cfg.profileUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      await page.waitForTimeout(2_000);

      const ok = await isLoggedIn(page, cfg);
      const landedOn = new URL(page.url()).pathname;
      rows.push({ key, label: cfg.label, status: ok ? 'OK' : 'EXPIRED', cookies, note: landedOn });

      if (!ok) {
        await fs.mkdir(ARTIFACT_DIR, { recursive: true });
        await page
          .screenshot({ path: path.join(ARTIFACT_DIR, `session-expired-${key}.png`) })
          .catch(() => undefined);
      }
    } catch (e: any) {
      rows.push({ key, label: cfg.label, status: 'ERROR', cookies, note: String(e?.message ?? e).split('\n')[0].slice(0, 70) });
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log('\n================ SESSION HEALTH ================');
    for (const r of rows) {
      const badge = r.status === 'OK' ? '✅ OK     ' : r.status === 'EXPIRED' ? '❌ EXPIRED' : r.status === 'MISSING' ? '⚠️  MISSING' : '💥 ERROR  ';
      console.log(`${badge}  ${r.label.padEnd(11)} cookies:${String(r.cookies).padStart(3)}  ${r.note}`);
    }
    console.log('================================================');

    const broken = rows.filter((r) => r.status !== 'OK');
    if (broken.length === 0) {
      console.log('Sab sessions valid hain — koi action needed nahi.\n');
    } else {
      console.log('Fix: (login window khulega, auto-save hoga)');
      for (const r of broken) {
        console.log(`  npx tsx scripts/capture-session.ts ${r.key} --cdp`);
      }
      console.log('');
    }
  }

  process.exit(rows.every((r) => r.status === 'OK') ? 0 : 2);
}

main().catch((err) => {
  console.error(`[Verify] Fatal: ${err?.message ?? err}`);
  process.exit(1);
});
