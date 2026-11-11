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
const wf = fs.readFileSync(".github/workflows/pages.yml", "utf8");
if (!/sed -i "s\/__BUILD__\/\$\{GITHUB_SHA::7\}\/g" dist\/index\.html/.test(wf)) fail("pages.yml must stamp __BUILD__ before upload");
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
console.log(`PASS: assets — ${refs.length} local CSS/JS references versioned with ?v=__BUILD__, stamped with the commit SHA on deploy; link-preview tags, share image, robots.txt and sitemap in place`);
