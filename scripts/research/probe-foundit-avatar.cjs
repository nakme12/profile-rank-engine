// Apply the reverse-engineered auth derivation: Bearer = base64(MSSOAT).decode.split('::')[0]
const { firefox } = require('playwright');
const fs = require('fs');

const PHOTO = 'assets/profile.jpeg';
const URL = 'https://www.foundit.in/falcon/api/users/v1/me/upload-avatar';

(async () => {
  const state = JSON.parse(fs.readFileSync('auth/foundit-state.json', 'utf8'));
  const get = (n) => (state.cookies.find((c) => c.name === n) || {}).value || '';
  const mssoat = decodeURIComponent(get('MSSOAT'));
  const msui = decodeURIComponent(get('MSUID'));

  const decoded = Buffer.from(mssoat, 'base64').toString('utf-8');
  const jwt = decoded.split('::')[0];
  console.log('MSUID:', msui.slice(0, 12) + '…');
  console.log('MSSOAT decoded parts:', decoded.split('::').length);
  console.log('JWT segments:', jwt.split('.').length, '| length:', jwt.length);

  const b = await firefox.launch({ headless: true });
  const ctx = await b.newContext({ storageState: 'auth/foundit-state.json' });
  const fileBuf = fs.readFileSync(PHOTO);

  const r = await ctx.request.post(URL, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      'x-language-code': 'EN',
      Origin: 'https://www.foundit.in',
      Referer: 'https://www.foundit.in/seeker/profile'
    },
    multipart: { file: { name: 'photo.jpeg', mimeType: 'image/jpeg', buffer: fileBuf } },
    timeout: 60000
  });
  console.log('UPLOAD:', r.status(), (await r.text()).slice(0, 300));

  await b.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
