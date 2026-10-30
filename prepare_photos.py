"""Validate the canonical bundled photo collection without overwriting it."""
import json, pathlib, hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parent
bank=json.loads((root/'dist/photos.js').read_text().split('=',1)[1].strip().rstrip(';'))
seen=set()
for item in bank:
 path=root/'dist'/item['image']
 with Image.open(path) as image: image.verify()
 digest=hashlib.sha256(path.read_bytes()).hexdigest()
 assert digest not in seen, f'Duplicate image: {path}'
 seen.add(digest)
 assert item['source'].startswith('https://') and item['credit']
assert len(bank)==183
assert sum(bool(x.get('india')) for x in bank)>=61
print(f'PASS: {len(bank)} distinct, decodable images with source credits.')
