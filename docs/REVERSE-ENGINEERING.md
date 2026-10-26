# Reverse-engineering notes (REA)

Static analysis of the portals' shipped web bundles, done with
[REA](https://github.com/morluto/rea) (`C:\mcp\rea`, v6.7.0). No target execution:
the bundles are parsed as inert text.

## Foundit — profile photo upload

**Problem:** the Foundit web profile renders no photo control at all (no
`input[type=file]` for images, no avatar menu item), so the photo updater used to
report "app-only".

**Result:** a real, working web endpoint exists.

```
POST https://www.foundit.in/falcon/api/users/v1/me/upload-avatar
Content-Type: multipart/form-data    (single part named "file")
Authorization: Bearer <JWT>
x-language-code: EN
```

The bearer token is derived from the `MSSOAT` cookie, exactly like the site's own
request wrapper does:

```js
const jwt = Buffer.from(decodeURIComponent(cookie.MSSOAT), 'base64')
  .toString('utf8')
  .split('::')[0];            // MSSOAT decodes to "<jwt>::<something>"
// header: Authorization: Bearer <jwt>
```

Constraints enforced client-side: `png` / `jpg` / `jpeg` only, ≤ 6 MB.

Success response: `200 {"avatar_updated_at":<epoch-ms>}`.

### How it was found

| Step | Command |
| --- | --- |
| Capture bundles | Playwright loads `/seeker/profile` with `auth/foundit-state.json`, saves same-origin JS to a folder |
| Static analysis | `rea analyze-javascript-application <folder> --source-path …` |
| Evidence | `ev_ea5523b4fb0f7294d5543d6987a33c879ac5c9f0b3a457b76a0b9b3170388be8` (`derived`, authority `shipped-artifact`) |

Key bundle fragments:

- API map: `uploadAvatar: \`${base}/users/v1/me/upload-avatar\``
- Mutation: `fetch(url, { method, body: FormData, credentials: 'include' })`
- Method table: `case "add": return "POST"` / `case "edit"` → `PUT` / `case "delete"` → `DELETE`
- Form field: `formData.append("file", file)`
- Auth wrapper: `Authorization: \`Bearer ${Buffer.from(getCookie("MSSOAT"),"base64").toString("utf-8").split("::")[0]}\``

Verification: first probe without the header → `400 "You must login to continue."`;
with a raw non-JWT header → `400 "JWT must have 3 tokens"`; with the derived JWT →
`200 {"avatar_updated_at":…}`.

Implemented in `scripts/update-profile-pic.ts` → `updateFoundit()`.

## Cutshort — profile photo upload (partial)

The bundle contains a real "Profile picture" field on a personal-details form and
an upload helper:

```
POST /getuploadurl/profile_picture   { content_type, file_name }  -> { signed_url, ... }
PUT  <signed_url>                    (direct S3 upload)
then: user-update mutation sends { ..., profile_picture: <url> }
```

Unknown: the exact confirm endpoint. `/settings` returns 404, `/profile/edit`
returns 404, and the bundle's mutation is referenced through an anonymous module
alias (`ie.y()`), so the request path is not statically resolved yet.

## Hirist

Bundle capture failed for `https://www.hirist.tech/profile` (navigation timeout in
headless Firefox, twice). No photo control observed in the DOM on `/jobfeed` or
`/profile`. Not analysed further.

## Reproducing

```bash
# 1. collect bundles (writes to %TEMP%\rea-bundles\<site>\)
node scripts/research/collect-bundles.cjs

# 2. static analysis with REA
cd C:\mcp\rea
node .\scripts\rea.mjs analyze-javascript-application "%TEMP%\rea-bundles\foundit" --format json

# 3. verify the avatar endpoint derivation against a live session
cd C:\mcp\profile-rank-engine
node scripts/research/probe-foundit-avatar.cjs
```
