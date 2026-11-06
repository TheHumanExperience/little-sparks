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
console.log(`PASS: assets — ${refs.length} local CSS/JS references versioned with ?v=__BUILD__, stamped with the commit SHA on deploy`);
