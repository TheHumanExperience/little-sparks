"""Fetch freely licensed Wikimedia Commons photos for Where in the World.

  python3 tools/fetch-places.py tools/places-list.tsv tools/places-meta.json

Each list row is `id<TAB>level<TAB>country<TAB>search terms[<TAB>File:exact title]`. For each id not
yet in the meta file it searches Commons quality images (rest.php search, then all files), reads the
file page's wikitext for its licence and author, keeps the first landscape photo whose licence is
public domain, CC0, CC BY or CC BY-SA, saves an 800 px JPEG to dist/places/<id>.jpg and records
file, author, licence and source. It avoids api.php, which rate-limits shared addresses.
`--skip id File:title` (run again afterwards) rejects one pick so the next candidate is used.
"""
import hashlib, io, json, re, sys, time, pathlib, urllib.parse, urllib.request, urllib.error
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = {'User-Agent': 'LittleSparks/1.0 (https://github.com/TheHumanExperience/little-sparks)'}
LICENCES = [  # (wikitext template pattern, short name, url)
    (r'cc-zero|cc0', 'CC0', 'https://creativecommons.org/publicdomain/zero/1.0/'),
    (r'cc-by-sa-all', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/'),
    (r'cc-by-sa-(\d\.\d)', 'CC BY-SA {}', 'https://creativecommons.org/licenses/by-sa/{}/'),
    (r'cc-by-(\d\.\d)', 'CC BY {}', 'https://creativecommons.org/licenses/by/{}/'),
    (r'pd-[a-z0-9-]+|public domain', 'Public domain', 'https://en.wikipedia.org/wiki/Public_domain'),
]


def get(url, binary=False):
    """GET with the shared-address rate limit in mind: honour Retry-After and keep trying."""
    for attempt in range(60):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = r.read(); time.sleep(1.5)
                return data if binary else data.decode('utf-8')
        except urllib.error.HTTPError as e:
            if e.code in (400, 404): return None
            time.sleep(int(e.headers.get('retry-after') or 20) + 2)
        except urllib.error.URLError as e:
            print('  retry after', e, file=sys.stderr); time.sleep(30)
    raise SystemExit('Commons kept refusing ' + url)


def search(q):
    out = []
    for extra in (' incategory:Quality_images', ''):
        data = json.loads(get('https://commons.wikimedia.org/w/rest.php/v1/search/page?' + urllib.parse.urlencode({'q': q + extra + ' filetype:bitmap', 'limit': 15})))
        for p in data['pages']:
            t = p.get('thumbnail') or {}
            if p['title'].lower().endswith(('.jpg', '.jpeg')) and t.get('width', 0) >= t.get('height', 1) * 1.2:
                out.append(p['title'])
        if out: return out
    return out


def clean(s):
    s = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', s)          # [[link|text]] → text
    s = re.sub(r'\[https?://\S+ ([^\]]*)\]', r'\1', s)                 # [url text] → text
    s = re.sub(r'\{\{(?:[Uu]ser|[Cc]reator|[Uu])\s*[:|]\s*([^}|]*)[^}]*\}\}', r'\1', s)
    s = re.sub(r'\{\{[^}]*\}\}|<[^>]+>|\'\'+', '', s)
    return re.sub(r'\s+', ' ', s).strip(' .,;')


def licence(title):
    raw = get('https://commons.wikimedia.org/w/index.php?' + urllib.parse.urlencode({'title': title, 'action': 'raw'}))
    if not raw or re.search(r'\{\{\s*(delete|copyvio|nsd|nld|npd|speedy)', raw, re.I): return None
    low = raw.lower()
    for pat, name, url in LICENCES:
        m = re.search(r'\{\{[^}]*?\b(' + pat + r')\b', low)
        if m:
            v = re.search(r'(\d\.\d)', m.group(1))
            author = re.search(r'\|\s*author\s*=\s*([^\n]*)', raw, re.I)
            return {'licence': name.format(v.group(1) if v else '4.0') if '{}' in name else name, 'licenseUrl': url.format(v.group(1) if v else '4.0') if '{}' in url else url,
                    'artist': clean(author.group(1)) if author else '',
                    'description': clean((re.search(r'\{\{\s*en\s*\|\s*(?:1=)?([^\n]*)', raw) or re.search(r'description\s*=\s*([^\n]*)', raw, re.I) or [None, ''])[1])[:300]}
    return None


def image(title, out):
    name = title.split(':', 1)[1].replace(' ', '_')
    h = hashlib.md5(name.encode()).hexdigest()
    q = urllib.parse.quote(name)
    data = get(f'https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/960px-{q}', True)
    if not data: return False
    img = Image.open(io.BytesIO(data)); img.load()
    img = img.convert('RGB'); img.thumbnail((800, 800), Image.LANCZOS)
    if img.width < 600: return False
    img.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
    return True


def main(listfile, metafile, *skip):
    meta = json.loads(pathlib.Path(metafile).read_text()) if pathlib.Path(metafile).exists() else {}
    skips = meta.setdefault('_skip', {})
    if skip:
        pid, title = skip[1], skip[2]
        skips.setdefault(pid, []).append(title); meta.pop(pid, None)
        pathlib.Path(metafile).write_text(json.dumps(meta, indent=1, ensure_ascii=False)); return
    for line in pathlib.Path(listfile).read_text().splitlines():
        if not line.strip() or line.startswith('#'): continue
        pid, level, country, q, *exact = line.split('\t')
        if pid in meta: continue
        for title in (exact or search(q)):
            if title in skips.get(pid, []): continue
            lic = licence(title)
            out = ROOT / 'dist' / 'places' / f'{pid}.jpg'
            if not lic or not image(title, out): continue
            meta[pid] = {'level': int(level), 'country': country, 'file': title, **lic,
                         'source': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'), safe=':_(),.-'),
                         'bytes': out.stat().st_size}
            print(pid, '←', title, '|', lic['licence'], '|', lic['artist'][:40], flush=True)
            break
        else:
            print(pid, 'NOTHING FOUND for', q, flush=True)
        pathlib.Path(metafile).write_text(json.dumps(meta, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main(*sys.argv[1:])
