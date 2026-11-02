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
active=[x for x in bank if not x.get('retired')]
assert len(active)==183, len(active)
assert sum(1 for x in active if x.get('iconic'))>=61
assert sum(1 for x in active if x.get('india') and not x.get('iconic'))>=61
assert all(x.get('why') and x.get('clue') for x in active if x.get('iconic'))
print(f'PASS: {len(bank)} distinct, decodable images with source credits; {len(active)} active, {len(bank)-len(active)} retired kept for saved rounds.')
