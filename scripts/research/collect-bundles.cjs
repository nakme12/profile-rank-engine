// Collect same-origin JS bundles from authenticated job-portal pages.
// Output: <outDir>/<site>/{page.html,scripts/*.js,manifest.json}
const { firefox } = require('playwright');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const SITES = {
  foundit: 'https://www.foundit.in/seeker/profile',
  hirist: 'https://www.hirist.tech/profile',
  cutshort: 'https://cutshort.io/profile/candidate-dashboard'
};

const OUT = process.argv[2] || path.join(process.env.TEMP || '.', 'rea-bundles');
const MAX_SCRIPT_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

(async () => {
  const browser = await firefox.launch({ headless: true });
  for (const [site, url] of Object.entries(SITES)) {
    const dir = path.join(OUT, site);
    await fsp.mkdir(path.join(dir, 'scripts'), { recursive: true });
    const ctx = await browser.newContext({
      storageState: path.join(process.cwd(), 'auth', `${site}-state.json`),
      viewport: { width: 1440, height: 1000 },
      locale: 'en-IN'
    });
    const page = await ctx.newPage();
    const scriptUrls = new Set();
    page.on('response', (r) => {
      const u = r.url();
      const ct = (r.headers()['content-type'] || '').toLowerCase();
      if (u.startsWith('http') && r.status() === 200 && (ct.includes('javascript') || /\.m?js(\?|$)/.test(u))) {
        scriptUrls.add(u);
      }
    });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(12000);
    } catch (e) {
      console.log(`[${site}] load warning: ${e.message.split('\n')[0]}`);
    }
    const finalUrl = page.url();
    await fsp.writeFile(path.join(dir, 'page.html'), await page.content(), 'utf8').catch(() => {});

    // also pick up <script src> already in DOM
    const domScripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map((s) => s.src).filter(Boolean)
    );
    domScripts.forEach((u) => scriptUrls.add(u));

    const manifest = { site, url, finalUrl, collectedAt: new Date().toISOString(), scripts: [] };
    let total = 0;
    let i = 0;
    for (const u of scriptUrls) {
      if (total >= MAX_TOTAL_BYTES) { manifest.scripts.push({ url: u, skipped: 'total-budget' }); continue; }
      try {
        const res = await ctx.request.get(u, { timeout: 45000 });
        if (!res.ok()) { manifest.scripts.push({ url: u, status: res.status() }); continue; }
        const body = await res.body();
        if (body.length > MAX_SCRIPT_BYTES) { manifest.scripts.push({ url: u, skipped: 'too-large', bytes: body.length }); continue; }
        const name = `${String(i++).padStart(3, '0')}-${(u.split('/').pop() || 'chunk').split('?')[0].replace(/[^A-Za-z0-9._-]/g, '_')}`;
        await fsp.writeFile(path.join(dir, 'scripts', name), body);
        total += body.length;
        manifest.scripts.push({ url: u, file: `scripts/${name}`, bytes: body.length });
      } catch (e) {
        manifest.scripts.push({ url: u, error: e.message.split('\n')[0] });
      }
    }
    manifest.totalBytes = total;
    await fsp.writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`[${site}] ${manifest.scripts.filter((s) => s.file).length} scripts, ${(total / 1024 / 1024).toFixed(1)} MB -> ${dir}`);
    await ctx.close();
  }
  await browser.close();
  console.log('OUT=' + OUT);
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
