"""Fetch freely licensed Wikimedia Commons photos for Time Lens.

  python3 tools/fetch-historic.py search "solvay 1927"
  python3 tools/fetch-historic.py info "File:Solvay conference 1927.jpg" ...
  python3 tools/fetch-historic.py fetch out-name "File:Solvay conference 1927.jpg"

`fetch` refuses any file whose Commons licence is not public domain, CC0,
CC BY, CC BY-SA or GODL-India, then saves an 800 px JPEG to dist/photos/.
"""
import io, json, re, sys, urllib.parse, urllib.request, pathlib
from PIL import Image

API = 'https://commons.wikimedia.org/w/api.php'
UA = {'User-Agent': 'LittleSparks/1.0 (https://github.com/TheHumanExperience/little-sparks)'}
ROOT = pathlib.Path(__file__).resolve().parent.parent
FREE = re.compile(r'^(public domain|pd\b|pd-|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?-\d\.\d|godl|gfdl|no restrictions)', re.I)


def get(params):
    url = API + '?' + urllib.parse.urlencode({**params, 'format': 'json'})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def clean(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', str(html or ''))).strip()


def info(title):
    pages = get({'action': 'query', 'titles': title, 'prop': 'imageinfo',
                 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1600})['query']['pages']
    page = next(iter(pages.values()))
    if 'imageinfo' not in page:
        raise SystemExit(f'Missing on Commons: {title}')
    ii = page['imageinfo'][0]
    m = {k: clean(v.get('value')) for k, v in ii['extmetadata'].items()}
    licence = m.get('LicenseShortName', '')
    restricted = 'nonfree' in m.get('NonFree', '').lower() or m.get('NonFree', '').lower() == 'true'
    return {
        'title': page['title'], 'licence': licence, 'licenseUrl': m.get('LicenseUrl', ''),
        'artist': m.get('Artist', ''), 'credit': m.get('Credit', ''), 'date': m.get('DateTimeOriginal', ''),
        'description': m.get('ImageDescription', '')[:300], 'restrictions': m.get('Restrictions', ''),
        'free': bool(FREE.match(licence)) and not restricted and 'fair use' not in licence.lower(),
        'source': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(page['title'].replace(' ', '_'), safe=':_(),.-'),
        'thumb': ii.get('thumburl') or ii['url'], 'size': [ii['width'], ii['height']],
    }


def fetch(name, title):
    meta = info(title)
    if not meta['free']:
        raise SystemExit(f'Refused (licence "{meta["licence"]}"): {title}')
    req = urllib.request.Request(meta['thumb'], headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        image = Image.open(io.BytesIO(r.read()))
        image.load()
    image = image.convert('RGB')
    image.thumbnail((800, 800), Image.LANCZOS)
    out = ROOT / 'dist' / 'photos' / f'{name}.jpg'
    image.save(out, 'JPEG', quality=80, optimize=True, progressive=True)
    meta.update(image=f'photos/{name}.jpg', bytes=out.stat().st_size)
    return meta


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    if cmd == 'search':
        hits = get({'action': 'query', 'list': 'search', 'srsearch': ' '.join(args),
                    'srnamespace': 6, 'srlimit': 12})['query']['search']
        for h in hits:
            print(h['title'])
    elif cmd == 'info':
        for t in args:
            print(json.dumps({k: v for k, v in info(t).items() if k != 'thumb'}, ensure_ascii=False))
    elif cmd == 'fetch':
        print(json.dumps(fetch(args[0], args[1]), ensure_ascii=False))
