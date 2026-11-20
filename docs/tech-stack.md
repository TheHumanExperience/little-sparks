# Tech stack

What Little Sparks is built with, and which versions it needs. Facts here were checked against the code on 2026-11-21; if they disagree with the code, the code wins, so update this file.

## At a glance

| Layer | Technology | Version |
|---|---|---|
| App | Plain HTML, CSS and JavaScript (classic `<script>` tags, no modules) | ES2022 language level |
| Build | None. `dist/` is served as is | n/a |
| Runtime dependencies | None | n/a |
| Hosting | GitHub Pages, deployed by GitHub Actions | `.github/workflows/pages.yml` |
| Domain | https://little-sparks.in (DNS at GoDaddy) | n/a |
| Storage | Browser `localStorage` | n/a |
| Leaderboard (optional) | Supabase (Postgres) over its REST API, called with `fetch` | No SDK |
| Checks | Node.js scripts (`verify*.cjs`) using the `vm` module | Node 20 in CI |
| Browser smoke test | Playwright (WebKit and Chromium), locally and in CI | 1.65.0 |
| Content tools | Python 3 scripts, plus one Node script | Python 3.9+, Pillow |
| Fonts | Google Fonts: DM Sans, Libre Caslon Display | Loaded by `@import` in `style.css` |

## The app (`dist/`)

- **No framework, no bundler, no transpiler.** Each file in `dist/` is loaded by `dist/index.html` in a fixed order (see the File map in [AGENTS.md](../AGENTS.md)); scripts share globals, so the order matters.
- **Language level: ES2022.** The code uses optional chaining (`?.`), nullish coalescing (`??`), optional catch binding (`catch {}`) and `Array.prototype.at()`. Don't use features newer than the oldest supported browser below.
- **CSS** uses `100dvh` and `:has()`, and respects `prefers-reduced-motion`.
- **Browser APIs:** `localStorage` (saves under `little-sparks-v1`, plus the level and rewards keys), Web Audio (`AudioContext`) for chimes, `navigator.vibrate` where available, `fetch` for the leaderboard.
- **Assets:** photos are 800px JPEGs in `dist/places/` (Where in the World) and `dist/photos/` (Time Lens). Every local CSS, JS and icon URL carries `?v=__BUILD__`, which CI replaces with the commit SHA to bust caches.
- **Determinism:** puzzles come from a seeded PRNG (`rng` in `app.js`, FNV-1a hash into a Mulberry32-style generator) keyed on the date and level, so the same day always gives the same puzzle without a server.

### Supported browsers

The main target is **iOS Safari** (the site is mobile-first). `Array.prototype.at()`, `:has()` and `dvh` set the floor:

| Browser | Minimum |
|---|---|
| Safari / iOS Safari | 15.4 |
| Chrome / Edge | 108 (for `dvh`; `:has()` needs 105) |
| Firefox | 121 (for `:has()`) |

Older browsers may load the page but lose layout or features.

## Leaderboard backend (`supabase/`)

- **Supabase** project with Postgres. Schema in `supabase/schema.sql`, setup steps in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
- The browser calls the REST endpoints (`/rest/v1/rpc/...`) with the public `sb_publishable_` key as `apikey` only. Tables have row-level security on and no policies; the browser can only run the `SECURITY DEFINER` functions.
- An empty `dist/leaderboard-config.js` hides the leaderboard entirely, and the app works without it.

## Development tooling

| Tool | Used for | Version |
|---|---|---|
| Node.js | `npm run verify` (all `verify*.cjs`), `tools/build-ladders.cjs` | 20 in CI; any current LTS works locally |
| npm | Installs Playwright only (`package.json` is dev tooling) | Comes with Node |
| Playwright | `npm run smoke` (`tests/smoke.mjs`): every card × 3 levels in headless WebKit and Chromium | `^1.65.0` (locked at 1.65.0) |
| Python 3 | Local server (`python3 -m http.server 8000 --directory dist`) and photo tools in `tools/` | 3.9 or newer |
| Pillow | `tools/fetch-places.py`, `tools/fetch-historic.py`, `tools/check-photos.py` | Any recent release |

The verify scripts load the real app through `tests/load-app.cjs`, which runs every script in `index.html` in page order inside a Node `vm` context with a small fake DOM. They need nothing beyond Node itself.

## CI and deployment

`.github/workflows/pages.yml` runs on every push to `main` (and by hand):

1. `actions/checkout@v4`, `actions/setup-node@v4` with Node 20 (npm cache on).
2. Runs every `verify*.cjs`. A failure stops the deploy.
3. `npm ci`, then `npx playwright install --with-deps chromium webkit`. The browsers in `~/.cache/ms-playwright` are cached with `actions/cache@v4`, keyed on the Playwright version in `package-lock.json`; on a cache hit only `npx playwright install-deps` runs for the system libraries. Bumping Playwright in the lock file starts a fresh cache.
4. Runs `npm run smoke` (headless WebKit and Chromium). A failure stops the deploy and uploads `tests/shots/` as the `smoke-shots` workflow artifact (kept 7 days), so the failure screenshots can be inspected.
5. Stamps the short commit SHA into `dist/index.html` in place of `__BUILD__`.
6. Uploads `dist/` with `actions/upload-pages-artifact@v3` and deploys with `actions/deploy-pages@v4`.

The smoke test adds roughly 2 to 4 minutes to a deploy (less with a warm browser cache). Still run `npm run smoke` locally before committing.

`.gitignore` lists `/.github`, but `.github/workflows/pages.yml` is tracked, so git still tracks it, but staging a change to it needs `git add -f` (or `git add -u`).

## Size

`dist/` is about 31 MB: `dist/photos/` about 19 MB and `dist/places/` about 11 MB (124 photos). The code itself is small.
