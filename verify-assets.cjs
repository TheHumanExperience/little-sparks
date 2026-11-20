// Every local CSS/JS in index.html carries ?v=__BUILD__, which the Pages workflow swaps for the commit SHA,
// so returning visitors never run stale style.css or scripts.
const fs = require("fs");
const fail = (m) => { throw Error(m); };
const html = fs.readFileSync("dist/index.html", "utf8");
const refs = [...html.matchAll(/<(?:script[^>]*\bsrc|link[^>]*\bhref)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(data:|https?:|#|\/\/)/.test(u));
if (refs.length < 10) fail("expected the stylesheet and scripts in index.html, found " + refs.length);
for (const u of refs) {
  const [file, query] = u.split("?");
  if (query !== "v=__BUILD__") fail(`${u} must be referenced as ${file}?v=__BUILD__`);
  if (!fs.existsSync("dist/" + file)) fail("missing asset " + file);
}
// Fonts are self-hosted (AGENTS.md: no CDNs, relative URLs only). Every url() in style.css is local, versioned and present,
// and each font preload in index.html names exactly a URL that style.css uses, so the browser reuses the preloaded file.
const css = fs.readFileSync("dist/style.css", "utf8");
const cssUrls = [...css.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)].map((m) => m[1]).filter((u) => !u.startsWith("data:"));
for (const u of cssUrls) {
  const [file, query] = u.split("?");
  if (/^(https?:|\/\/|\/)/.test(u)) fail(`style.css must use relative URLs, found ${u}`);
  if (query !== "v=__BUILD__") fail(`style.css: ${u} must be ${file}?v=__BUILD__`);
  if (!fs.existsSync("dist/" + file)) fail("style.css references missing file " + file);
}
const fontFiles = cssUrls.filter((u) => /\.woff2\?/.test(u));
if (fontFiles.length < 2) fail("expected the self-hosted DM Sans and Libre Caslon Display @font-face rules in style.css");
const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"[^>]*>/g)];
if (!preloads.length) fail("index.html should preload the above-the-fold fonts");
for (const [tag, u] of preloads) {
  if (!fontFiles.includes(u)) fail(`font preload ${u} must match a url() in style.css exactly`);
  if (!/\bcrossorigin\b/.test(tag) || !/type="font\/woff2"/.test(tag)) fail(`font preload ${u} needs type="font/woff2" and crossorigin`);
}
// No CSS or HTML anywhere in dist/ may pull a stylesheet or font from another host.
const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|p\.typekit\.net|fonts\.bunny\.net|use\.fontawesome\.com|fast\.fonts\.net|cloud\.typography\.com/i;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir + "/" + e.name) : [dir + "/" + e.name]));
const pages = walk("dist").filter((f) => /\.(css|html?)$/i.test(f));
for (const f of pages) {
  const t = fs.readFileSync(f, "utf8");
  if (FONT_HOSTS.test(t)) fail(`${f} references an external font host: ${t.match(FONT_HOSTS)[0]}`);
  const ext = t.match(/@import\s+(?:url\()?\s*['"]?(?:https?:)?\/\/[^'")\s;]+|url\(\s*['"]?(?:https?:)?\/\/[^'")\s]+/i);
  if (ext) fail(`${f} loads CSS or a font from another host: ${ext[0]}`);
  for (const [tag] of t.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (tag.match(/\brel="([^"]+)"/i) || [])[1] || "";
    const href = (tag.match(/\bhref="([^"]+)"/i) || [])[1] || "";
    if (/stylesheet|preload|preconnect|dns-prefetch|prefetch/i.test(rel) && /^(https?:)?\/\//i.test(href)) fail(`${f} links an external ${rel}: ${href}`);
  }
}
const wf = fs.readFileSync(".github/workflows/pages.yml", "utf8");
if (!/sed -i "s\/__BUILD__\/\$\{GITHUB_SHA::7\}\/g" dist\/index\.html dist\/style\.css/.test(wf)) fail("pages.yml must stamp __BUILD__ in index.html and style.css (the font URLs) before upload");
if (wf.indexOf("__BUILD__") > wf.indexOf("upload-pages-artifact")) fail("stamp must run before the Pages upload");
// Link previews and search: the share image exists at 1200×630, the canonical and og:url agree,
// and robots.txt points to the sitemap.
const og = (k) => (html.match(new RegExp(`<meta property="og:${k}" content="([^"]+)"`)) || [])[1];
const SITE = "https://little-sparks.in/";
if (!/<meta name="description" content="[^"]{50,}"/.test(html)) fail("index.html needs a meta description");
if (!html.includes(`<link rel="canonical" href="${SITE}"`) || og("url") !== SITE) fail("canonical and og:url must both be " + SITE);
const shareImg = og("image") || "";
if (!shareImg.startsWith(SITE) || !fs.existsSync("dist/" + shareImg.slice(SITE.length))) fail("og:image must be a file in dist/: " + shareImg);
const png = fs.readFileSync("dist/" + shareImg.slice(SITE.length));
if (png.readUInt32BE(16) !== +og("image:width") || png.readUInt32BE(20) !== +og("image:height")) fail("og:image size must match og:image:width/height");
if (!fs.readFileSync("dist/robots.txt", "utf8").includes(`Sitemap: ${SITE}sitemap.xml`) || !fs.readFileSync("dist/sitemap.xml", "utf8").includes(`<loc>${SITE}</loc>`)) fail("robots.txt must point to sitemap.xml, which lists the site");
console.log(`PASS: assets — ${refs.length} local CSS/JS references versioned with ?v=__BUILD__, stamped with the commit SHA on deploy; ${fontFiles.length} self-hosted fonts (no external font or stylesheet hosts in dist/); link-preview tags, share image, robots.txt and sitemap in place`);
