import urllib.request,json,concurrent.futures,pathlib
items=[('PIA24434',1903,'A first flight','A fragile aircraft lifts off above a sandy field.','At Kitty Hawk, Orville Wright flew for 12 seconds on December 17, 1903. Wilbur ran alongside.','John T. Daniels / Library of Congress, via NASA'),('as11-40-5903',1969,'Footprints on the Moon','A spacesuited astronaut stands on a rocky surface.','Neil Armstrong photographed Buzz Aldrin during the Apollo 11 moonwalk on July 20, 1969.','NASA / Neil Armstrong'),('s81-30462',1981,'A new kind of spacecraft','A winged spacecraft launches beside a service tower.','Columbia launched on April 12, 1981, carrying John Young and Robert Crippen on the first Space Shuttle mission.','NASA'),('s31-10-023',1990,'A telescope leaves home','A large cylindrical instrument is held above Earth by a robotic arm.','Discovery carried the Hubble Space Telescope into orbit. This view was photographed on April 25, 1990, during deployment preparations.','NASA'),('s75-29432',1975,'A handshake above Earth','Two space travellers greet each other inside a spacecraft.','Thomas Stafford and Alexei Leonov shook hands on July 17, 1975, during the joint Apollo–Soyuz mission. This image is a frame from motion-picture film.','NASA'),('S85-41007',1983,'Preparing for a milestone','An astronaut in training rests with a helmet.','NASA identifies the photograph as May 9, 1983: Sally Ride preparing for STS-7. She became the first American woman in space that June.','NASA')]
pathlib.Path('dist/photos').mkdir(exist_ok=True)
def get(item):
 id,year,title,alt,story,credit=item
 url=f'https://images-assets.nasa.gov/image/{id}/{id}~medium.jpg'
 data=urllib.request.urlopen(url,timeout=35).read();assert data[:2]==b'\xff\xd8'
 name=f'photos/{id}.jpg';pathlib.Path('dist/'+name).write_bytes(data)
 return dict(image=name,year=year,title=title,alt=alt,story=story,credit=credit,source='https://images.nasa.gov/details/'+id)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex: bank=list(ex.map(get,items))
pathlib.Path('dist/photos.js').write_text('const PHOTO_BANK='+json.dumps(bank)+';\n')
print('Downloaded and verified',len(bank),'archive photographs.')
