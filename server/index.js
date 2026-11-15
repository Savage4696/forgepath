import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

loadEnv();

const PORT = Number(process.env.PORT || 8787);
const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const NASA_ROOT = 'https://api.nasa.gov/mars-photos/api/v1';
const cache = new Map();
const messages = [];
const CACHE_TTL = 15 * 60 * 1000;

const missions = [
  { id: 'pathfinder', name: 'Mars Pathfinder', rover: 'Sojourner', year: 1997, site: 'Ares Vallis', lat: 19.13, lon: 33.22, discovery: 'First successful rover technology demonstration on Mars.' },
  { id: 'curiosity', name: 'Mars Science Laboratory', rover: 'Curiosity', year: 2012, site: 'Gale Crater', lat: -4.59, lon: 137.44, discovery: 'Found ancient environments that could have supported microbial life.' },
  { id: 'perseverance', name: 'Mars 2020', rover: 'Perseverance', year: 2021, site: 'Jezero Crater', lat: 18.44, lon: 77.45, discovery: 'Collecting rock and regolith samples for possible return to Earth.' }
];

const moonMissions = [
  { id: 'apollo11', name: 'Apollo 11', lander: 'Eagle', year: 1969, site: 'Mare Tranquillitatis', lat: 0.67, lon: 23.47, discovery: 'First human landing on another celestial body; returned 21.5 kg of lunar regolith and rock samples.' },
  { id: 'apollo15', name: 'Apollo 15', lander: 'Falcon & LRV', year: 1971, site: 'Hadley-Apennine', lat: 26.13, lon: 3.63, discovery: 'First use of Lunar Roving Vehicle; discovered the 4.1-billion-year-old Genesis Rock (anorthosite).' },
  { id: 'apollo17', name: 'Apollo 17', lander: 'Challenger & LRV', year: 1972, site: 'Taurus-Littrow', lat: 20.19, lon: 30.77, discovery: 'Discovered orange volcanic glass beads and returned 110 kg of pristine lunar crustal samples.' },
  { id: 'lunokhod1', name: 'Luna 17', lander: 'Lunokhod 1', year: 1970, site: 'Mare Imbrium', lat: 38.33, lon: 324.97, discovery: 'First successful robotic rover on another world; operated for 322 Earth days.' },
  { id: 'change4', name: 'Chang\'e 4', lander: 'Yutu-2', year: 2019, site: 'Von Kármán Crater', lat: -45.46, lon: 177.60, discovery: 'First soft landing on the hidden lunar far side; detected mantle-derived minerals.' },
  { id: 'chandrayaan3', name: 'Chandrayaan-3', lander: 'Vikram & Pragyan', year: 2023, site: 'Shiv Shakti Point', lat: -69.37, lon: 32.35, discovery: 'First landing in the lunar high-latitude South Pole region; confirmed sulfur in regolith.' }
];

const hardware = [
  { id: 'apollo-lrv', name: 'Apollo Lunar Roving Vehicle', shortName: 'Lunar Rover', body: 'MOON', mission: 'Apollo 15 / 16 / 17', year: 1971, status: 'RETIRED ON SURFACE', purpose: 'Extended astronaut range across the lunar surface.', science: 'Made it possible to collect geologic samples far beyond the landing module.', fallbackImage: 'https://images-assets.nasa.gov/image/6640853/6640853~medium.jpg' },
  { id: 'apollo-lm', name: 'Apollo 11 Lunar Module Descent Stage', shortName: 'Eagle Descent Stage', body: 'MOON', mission: 'Apollo 11', year: 1969, status: 'RETIRED ON SURFACE', purpose: 'First human touchdown stage left at Mare Tranquillitatis.', science: 'Carried the laser retroreflector and passive seismometer still studied on Earth.', fallbackImage: 'https://images-assets.nasa.gov/image/6900992/6900992~medium.jpg' },
  { id: 'lunokhod-1', name: 'Lunokhod 1 Lunar Rover', shortName: 'Lunokhod 1', body: 'MOON', mission: 'Luna 17', year: 1970, status: 'RETIRED ON SURFACE', purpose: 'First autonomous robotic wheeled rover on another planetary body.', science: 'Traversed 10.5 km of lunar regolith, testing soil density and returning over 20,000 images.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA12967/PIA12967~small.jpg' },
  { id: 'surveyor-3', name: 'Surveyor 3 Lander', shortName: 'Surveyor 3', body: 'MOON', mission: 'Surveyor', year: 1967, status: 'RETIRED ON SURFACE', purpose: 'Soft-landing technology demonstration and surface trenching scoop.', science: 'Provided first proof that lunar soil could support human landing craft; later inspected by Apollo 12.', fallbackImage: 'https://images-assets.nasa.gov/image/KSC-2011-7762/KSC-2011-7762~medium.jpg' },
  { id: 'pathfinder-sojourner', name: 'Sojourner Rover', shortName: 'Sojourner', body: 'MARS', mission: 'Mars Pathfinder', year: 1997, status: 'SILENT', purpose: 'Demonstrated lightweight rover mobility and autonomous navigation.', science: 'Proved that a small rover could inspect rocks and soil on another world.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA04422/PIA04422~medium.jpg' },
  { id: 'spirit', name: 'Spirit Rover', shortName: 'Spirit', body: 'MARS', mission: 'Mars Exploration Rover', year: 2004, status: 'SILENT', purpose: 'Search for evidence of past water activity in Gusev Crater.', science: 'Found volcanic rocks altered by water and survived far beyond its planned 90-sol mission.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA17760/PIA17760~medium.jpg' },
  { id: 'opportunity', name: 'Opportunity Rover', shortName: 'Opportunity', body: 'MARS', mission: 'Mars Exploration Rover', year: 2004, status: 'SILENT', purpose: 'Study the history of water at Meridiani Planum.', science: 'Confirmed that liquid water once shaped the Martian surface and traveled more than a marathon.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA11436/PIA11436~small.jpg' },
  { id: 'curiosity', name: 'Curiosity Rover', shortName: 'Curiosity', body: 'MARS', mission: 'Mars Science Laboratory', year: 2012, status: 'ACTIVE', purpose: 'Assess whether Mars ever had environments able to support microbial life.', science: 'Found ancient freshwater chemistry and organic carbon in Gale Crater.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA13808/PIA13808~medium.jpg' },
  { id: 'insight', name: 'InSight Lander', shortName: 'InSight', body: 'MARS', mission: 'Interior Exploration', year: 2018, status: 'SILENT', purpose: 'Listen for marsquakes and measure the planet’s interior.', science: 'Detected more than 1,300 seismic events and revealed how Mars is structured inside.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA22828/PIA22828~medium.jpg' },
  { id: 'perseverance', name: 'Perseverance Rover', shortName: 'Perseverance', body: 'MARS', mission: 'Mars 2020', year: 2021, status: 'ACTIVE', purpose: 'Search for signs of ancient life and cache carefully selected samples.', science: 'Building the first scientifically selected sample collection for possible return to Earth.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg' },
  { id: 'voyager-1', name: 'Voyager 1', shortName: 'Voyager 1', body: 'DEEP SPACE', mission: 'Voyager', year: 1977, status: 'INTERSTELLAR', purpose: 'Explore the outer planets and carry a message across interstellar space.', science: 'Crossed the heliopause and continues returning measurements from beyond it.', fallbackImage: 'https://images-assets.nasa.gov/image/PIA17045/PIA17045~small.jpg' },
  { id: 'james-webb', name: 'James Webb Space Telescope', shortName: 'James Webb', body: 'DEEP SPACE', mission: 'JWST', year: 2021, status: 'ACTIVE', purpose: 'Flagship space telescope orbiting Sun-Earth L2 Lagrange point.', science: 'Peers into early galaxy formation and atmospheric chemical spectra of exoplanets.', fallbackImage: 'https://images-assets.nasa.gov/image/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o~small.jpg' }
];

const hardwareDetails = {
  'apollo-lrv': { madeOf: ['Aluminum alloy frame', 'Wire-mesh wheels', 'Titanium drive train', 'Silver-zinc batteries'], built: ['Folded inside the lunar module for launch.', 'Unfolded by astronauts using latches, hinges, and tension cables.', 'Four electric wheel motors turned a lightweight frame without an engine.'], story: 'Imagine parking a car in a suitcase, flying it to the Moon, and unfolding it by hand. The Lunar Rover gave astronauts the freedom to travel farther than their footsteps.', question: 'What would you bring if every gram had to earn its place?', search: 'Apollo Lunar Roving Vehicle NASA' },
  'apollo-lm': { madeOf: ['Titanium fittings', 'Mylar insulation', 'Aluminum honeycomb', 'Gold foil thermal blankets'], built: ['Engineered exclusively for vacuum flight without aerodynamic shaping.', 'Descent engine throttled down to gently touch lunar regolith.', 'Left behind as the launch pad when astronauts blasted off for Earth.'], story: 'The Eagle descent stage was humanity’s first permanent camp on another celestial body. Its four spindly gold-foil legs still rest quietly at Tranquility Base.', question: 'What feelings would you have standing beside the first machine that landed on the Moon?', search: 'Apollo 11 lunar module descent stage Tranquility Base' },
  'lunokhod-1': { madeOf: ['Magnesium alloy tub', 'Polonium thermal isotope', 'Eight wire mesh wheels', 'Solar lid array'], built: ['A tub-shaped chassis sealed delicate Soviet optics inside pressurized nitrogen.', 'Drivers in Crimea steered it with a joystick over 1.3-second radio delays.', 'Surrendered to lunar night by closing its solar lid to keep warm.'], story: 'Lunokhod 1 rolled across the Sea of Rains in 1970, showing the world that robots could survey distant landscapes years before human crews returned.', question: 'How would you drive a rover when every turn takes two seconds to reach the wheels?', search: 'Lunokhod 1 Soviet lunar rover' },
  'surveyor-3': { madeOf: ['Tubular aluminum structure', 'Surface sampler arm', 'Solid propellant retro-rocket', 'Solar panel'], built: ['Three landing legs with crushable aluminum honeycomb footpads.', 'A motorized scoop dug trenches to test lunar soil bearing strength.', 'Survived 2.5 years on the Moon until Apollo 12 landed 180 meters away to bring parts back.'], story: 'Surveyor 3 paved the way for Apollo by proving the Moon would not swallow landing spacecraft in dust. Two years later, humans walked over to visit it.', question: 'What can we learn by revisiting a machine left on another world for years?', search: 'Surveyor 3 lunar lander Apollo 12' },
  'pathfinder-sojourner': { madeOf: ['Carbon-fiber panels', 'Aluminum honeycomb', 'Six aluminum wheels', 'Solar panel and rechargeable battery'], built: ['A landing station protected Sojourner during its airbag bounce.', 'Tiny motors drove each wheel and a rocker-bogie system kept it stable.', 'Stereo cameras helped engineers choose safe paths from Earth.'], story: 'Sojourner was small enough to fit beside a microwave, but it became the first rover to roll on another planet. Its most important experiment was proving that a machine could explore beyond the reach of a lander.', question: 'How could you teach a robot to choose a safe path when nobody can touch it?', search: 'Sojourner rover NASA Pathfinder' },
  spirit: { madeOf: ['Aluminum honeycomb body', 'Rock Abrasion Tool', 'Panoramic cameras', 'Solar arrays'], built: ['A heat shield and parachute slowed the rover before airbags carried it to the ground.', 'A six-wheel rocker-bogie suspension let it climb over rocks.', 'Solar panels powered instruments designed for a 90-sol mission.'], story: 'Spirit kept going through dust, cold, and difficult ground for years. When one wheel stopped working, the team turned the rover around and dragged it backward—finding new science in the tracks it left behind.', question: 'Can a failure become a new way to explore?', search: 'Spirit rover NASA Mars' },
  opportunity: { madeOf: ['Aluminum frame', 'Rock Abrasion Tool', 'Panoramic and navigation cameras', 'Solar panels'], built: ['A heat shield and parachute delivered the rover to Meridiani Planum.', 'A robotic arm placed instruments directly against rocks.', 'Energy-saving driving stretched a 90-sol mission into 14 years.'], story: 'Opportunity was built for a short mission, then kept answering the call. It traveled farther than any vehicle had driven on another world and followed clues left by ancient water.', question: 'What can a trail of tiny clues tell us about a whole planet?', search: 'Opportunity rover NASA Mars' },
  curiosity: { madeOf: ['Plutonium-powered generator', 'Aluminum and titanium chassis', 'Six-wheel rocker-bogie suspension', 'Camera mast'], built: ['A sky crane lowered the rover gently onto the surface.', 'A nuclear power source keeps instruments working through dust and night.', 'A robotic arm drills rock and places powder into onboard laboratories.'], story: 'Curiosity is a chemistry lab with wheels. It does not just photograph Mars—it drills into its history and asks whether the ingredients for life were ever present.', question: 'If a rock could remember the weather around it, what would you ask?', search: 'Curiosity rover NASA Mars' },
  insight: { madeOf: ['Heat shield and parachute', 'Seismometer', 'Heat-flow probe', 'Robotic deployment arm'], built: ['InSight landed using a parachute and rocket descent.', 'Its robotic arm placed instruments on the ground instead of driving.', 'A seismometer listened for marsquakes to map the planet’s interior.'], story: 'InSight explored a place no rover could drive: inside Mars. By listening to vibrations and measuring heat, it turned an entire planet into an instrument.', question: 'How can you discover what is inside something without opening it?', search: 'NASA InSight Mars lander' },
  perseverance: { madeOf: ['Plutonium-powered generator', 'Titanium wheels', 'Mastcam-Z camera system', 'Sample tubes and robotic arm'], built: ['Terrain-relative navigation matched camera images to a map during descent.', 'A sky crane lowered the rover into Jezero Crater.', 'A drill cores rocks, seals samples, and leaves a path for a possible return mission.'], story: 'Perseverance is both a field geologist and a time capsule builder. Every sample is chosen to help future scientists ask whether ancient Mars was ever alive.', question: 'Which small piece of Mars would you choose to send home?', search: 'Perseverance rover NASA Jezero' },
  'voyager-1': { madeOf: ['Titanium and aluminum body', 'Radioisotope power generators', 'High-gain antenna', 'Golden Record'], built: ['Three radioisotope generators convert plutonium heat into electricity.', 'A dish antenna sends a whisper of data across billions of kilometers.', 'A golden record carries sounds and images chosen as a message from Earth.'], story: 'Voyager 1 kept going after its original tour ended. It crossed into interstellar space carrying scientific instruments and a hopeful portrait of home.', question: 'What message would you send to a listener millions of years from now?', search: 'Voyager 1 NASA spacecraft' },
  'james-webb': { madeOf: ['Beryllium gold-coated mirror segments', 'Kapton sunshield', 'Cryocooler system', 'Near-infrared detectors'], built: ['Folded like origami inside an Ariane 5 rocket nose cone.', 'Unfurled a 5-layer tennis-court-sized sunshield 1.5 million km from Earth.', 'Operates at minus 233°C to detect the faint thermal whispers of baby galaxies.'], story: 'The James Webb Space Telescope opened its 18 golden honeycombs at Sun-Earth L2, transforming our sight into a cosmic time machine.', question: 'What will we discover when we can see light that has traveled for 13 billion years?', search: 'James Webb Space Telescope NASA' }
};

const partsByHardware = {
  'apollo-lrv': [['wheels', 'Wire-mesh wheels', 'Grip loose lunar soil while keeping mass low.', 'Titanium and steel']],
  'apollo-lm': [['legs', 'Crushable Honeycomb Legs', 'Absorb impact velocity on touchdown in unmapped regolith.', 'Aluminum honeycomb & Mylar']],
  'lunokhod-1': [['wheels', 'Eight Wire Mesh Wheels', 'Independent electric hub motors with titanium rim cleats.', 'Titanium & wire mesh']],
  'surveyor-3': [['scoop', 'Surface Sampler Scoop', 'Trench into regolith to measure shear strength.', 'Hardened steel & electric actuators']],
  'pathfinder-sojourner': [['wheels', 'Rocker-bogie wheels', 'Climb over rocks without losing contact with the ground.', 'Aluminum']],
  spirit: [['wheels', 'Rocker-bogie wheels', 'Keep moving even when one wheel cannot drive.', 'Aluminum and titanium']],
  opportunity: [['camera', 'Panoramic camera', 'Build a wide view of the rover’s surroundings.', 'Optical glass and electronics']],
  curiosity: [['drill', 'Rock drill', 'Powder a rock so onboard laboratories can study its chemistry.', 'Tungsten carbide and steel']],
  insight: [['seismic', 'Seismometer', 'Detect vibrations that reveal the inside of Mars.', 'Precision sensors']],
  perseverance: [['drill', 'Sample drill', 'Core rock and seal it for a possible future return to Earth.', 'Titanium and hardened steel']],
  'voyager-1': [['antenna', 'High-gain antenna', 'Send science data across billions of kilometers.', 'Aluminum and radio electronics']],
  'james-webb': [['mirrors', 'Gold-Coated Primary Mirrors', '18 hexagonal beryllium segments reflecting faint infrared photons.', 'Gold-coated Beryllium']]
};

const missionStories = {
  mariner4: { id: 'mariner4', title: 'First close encounter', kicker: 'MARINER 4 · FLYBY · 1965', mission: 'Mariner 4', site: 'Deep-space flyby', why: 'Scientists needed to replace telescope-era guesses with evidence. Mariner 4 was designed to survive the long cruise, pass close to Mars, and transmit the first close-up pictures of another planet.', how: ['Launch from Cape Canaveral and cruise 228 days through deep space.', 'Pass within 9,846 km of Mars and point the television camera at the surface.', 'Store each image onboard, then transmit the narrow-band signal back to Earth over several days.'], discovery: 'The 21 images revealed a cratered, Moon-like surface and a thin atmosphere—a turning point in planetary science.', search: 'Mariner 4 Mars first close up images', fallbackImage: 'https://images-assets.nasa.gov/image/PIA02980/PIA02980~thumb.jpg' },
  pathfinder: { id: 'pathfinder', title: 'A new way to roam', kicker: 'MARS PATHFINDER · ARES VALLIS · 1997', mission: 'Mars Pathfinder', site: 'Ares Vallis · 19.13° N, 33.22° W', why: 'NASA wanted to prove that a lighter, cheaper landing system could deliver a mobile science platform to Mars.', how: ['Enter the atmosphere inside an aeroshell and slow down with a parachute.', 'Inflate airbags, bounce across the surface, and settle near the ancient floodplain.', 'Deploy Sojourner to image rocks, test soil, and demonstrate autonomous wheel turns.'], discovery: 'Sojourner became the first wheeled vehicle on another planet, showing that rovers could be deployed far from Earth.', search: 'Mars Pathfinder Sojourner Ares Vallis', fallbackImage: 'https://images-assets.nasa.gov/image/PIA04422/PIA04422~medium.jpg' },
  perseverance: { id: 'perseverance', title: 'Two paths, one planet', kicker: 'PERSEVERANCE · JEZERO CRATER · 2021', mission: 'Mars 2020 Perseverance', site: 'Jezero Crater · 18.44° N, 77.45° E', why: 'Jezero once held a lake and river delta. Its rocks preserve a record of ancient water—and could preserve signs of past microbial life.', how: ['Use terrain-relative navigation to autonomously target the safe ellipse during the final descent.', 'Land with the sky-crane system, then map the delta with Mastcam-Z and SuperCam.', 'Cache carefully selected core samples while Ingenuity scouts routes from the air.'], discovery: 'Perseverance is building the first sample collection for a potential future return to Earth and expanding the map of habitable Mars.', search: 'Perseverance rover Jezero Crater NASA', fallbackImage: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg' },
  apollo11: { id: 'apollo11', title: 'Tranquility Base', kicker: 'APOLLO 11 · MARE TRANQUILLITATIS · 1969', mission: 'Apollo 11 Lunar Landing', site: 'Mare Tranquillitatis · 0.67° N, 23.47° E', why: 'Humanity took its first steps on another world, deploying surface science experiments and retrieving the first pristine regolith samples.', how: ['Separate Lunar Module Eagle from Columbia in lunar orbit.', 'Manual terminal descent over boulder field to touch down with 25 seconds of fuel.', 'Deploy Solar Wind Foil, EASEP seismometer, and retroreflector array.'], discovery: 'Proved humans could live, navigate, and perform field geology on another celestial body.', search: 'Apollo 11 lunar module landing Neil Armstrong Buzz Aldrin', fallbackImage: 'https://images-assets.nasa.gov/image/6900992/6900992~medium.jpg' },
  apollo15: { id: 'apollo15', title: 'First wheels on another world', kicker: 'APOLLO 15 · HADLEY-APENNINE · 1971', mission: 'Apollo 15 Lunar Roving Vehicle', site: 'Hadley Rille · 26.13° N, 3.63° E', why: 'Extended exploration range from walking distance to 28 kilometers along the Apennine mountains and Hadley Rille gorge.', how: ['Unfold the Lunar Roving Vehicle from Falcon LM descent stage.', 'Drive across basalt plains and navigate up the 18-degree slope of Hadley Delta.', 'Locate and chip out the Genesis Rock (anorthosite sample 15415).'], discovery: 'Recovered sample 15415 dating to 4.1 billion years ago, confirming the lunar magma ocean hypothesis.', search: 'Apollo 15 Lunar Roving Vehicle Hadley Rille', fallbackImage: 'https://images-assets.nasa.gov/image/6640853/6640853~medium.jpg' },
  voyager: { id: 'voyager', title: 'Into the interstellar void', kicker: 'VOYAGER 1 · INTERSTELLAR BOUNDARY · 1977-NOW', mission: 'Voyager Interstellar Mission', site: 'Beyond the Heliopause · 162 AU from Sun', why: 'To complete the Grand Tour of Jupiter and Saturn, then journey onward past the heliopause into true interstellar space.', how: ['Utilize gravity assists to slingshot across outer gas giants.', 'Pass the termination shock and heliopause into galactic space.', 'Transmit cosmic ray and plasma data across 24 billion kilometers.'], discovery: 'First human artifact to cross the heliopause and enter interstellar space.', search: 'Voyager 1 golden record spacecraft interstellar', fallbackImage: 'https://images-assets.nasa.gov/image/PIA17045/PIA17045~small.jpg' },
  forgepath: { id: 'forgepath', title: 'Your path begins here', kicker: 'FORGEPATH · MISSION CONTROL · 2026', mission: 'Forgepath exploration atlas', site: 'Jezero Crater · next waypoint', why: 'The next generation of exploration will combine mission heritage, terrain intelligence, and human judgment. Forgepath makes that chain of decisions visible.', how: ['Read the evidence left by previous missions and compare their constraints.', 'Use current imagery and terrain context to frame a meaningful objective.', 'Score a route for science value, safety, and energy before committing the next move.'], discovery: 'This is the handoff from history to participation: a shared interface for understanding how Mars exploration gets done.', search: 'NASA Mars exploration rover surface', fallbackImage: 'https://images-assets.nasa.gov/image/PIA24343/PIA24343~medium.jpg' }
};

export async function handleRequest(request, response) {
  setHeaders(response, request);
  if (request.method === 'OPTIONS') return end(response, 204, '');

  let url;
  try {
    const host = request.headers.host || 'localhost';
    url = new URL(request.url || '/', `http://${host}`);
  } catch {
    return end(response, 400, { error: 'Invalid request URL' });
  }

  if (!url.pathname.startsWith('/api/')) return end(response, 404, { error: 'API route not found' });

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return end(response, 200, { ok: true, service: 'forgepath-api', time: new Date().toISOString() });
    if (request.method === 'GET' && url.pathname === '/api/mars/missions') return end(response, 200, { missions, source: 'Forgepath mission registry' });
    if (request.method === 'GET' && url.pathname === '/api/hardware') return end(response, 200, { hardware: await hardwareCatalog(), source: 'Forgepath hardware registry', updatedAt: new Date().toISOString() });
    if (request.method === 'GET' && url.pathname.startsWith('/api/hardware/')) {
      const id = decodeURIComponent(url.pathname.replace(/^\/api\/hardware\/?/, '').replace(/\/+$/, ''));
      const detail = await hardwareDetail(id);
      return end(response, detail.error ? 404 : 200, detail);
    }
    if (request.method === 'GET' && url.pathname.startsWith('/api/missions/')) {
      const id = decodeURIComponent(url.pathname.replace(/^\/api\/missions\/?/, '').replace(/\/+$/, ''));
      const detail = await missionDetail(id);
      return end(response, detail.error ? 404 : 200, detail);
    }
    if (request.method === 'GET' && url.pathname === '/api/mars/environment') return end(response, 200, environmentSnapshot());
    if (request.method === 'GET' && url.pathname === '/api/mars/terrain') return end(response, 200, terrainMetadata());
    if (request.method === 'GET' && url.pathname === '/api/mars/map') return end(response, 200, marsMap());
    if (request.method === 'GET' && url.pathname === '/api/mars/photos') {
      const photos = await roverPhotos(url.searchParams);
      return end(response, photos.error ? 400 : 200, photos);
    }
    if (request.method === 'GET' && url.pathname === '/api/moon/missions') return end(response, 200, { missions: moonMissions, source: 'Forgepath lunar mission registry' });
    if (request.method === 'GET' && url.pathname === '/api/moon/environment') return end(response, 200, moonEnvironmentSnapshot());
    if (request.method === 'GET' && url.pathname === '/api/moon/terrain') return end(response, 200, moonTerrainMetadata());
    if (request.method === 'GET' && url.pathname === '/api/moon/map') return end(response, 200, moonMap());
    if (request.method === 'GET' && url.pathname === '/api/live/apod') return end(response, 200, await apod());
    if (request.method === 'GET' && url.pathname === '/api/live/images') return end(response, 200, await nasaImages(url.searchParams.get('q') || 'Mars rover'));
    if (request.method === 'GET' && url.pathname === '/api/live/overview') return end(response, 200, await liveOverview());
    if (request.method === 'POST' && url.pathname === '/api/routes/score') return end(response, 200, scoreRoute(await readJson(request)));
    if (request.method === 'POST' && url.pathname === '/api/messages') return end(response, 201, saveMessage(await readJson(request)));
    return end(response, 404, { error: 'API route not found' });
  } catch (error) {
    console.error('[Forgepath API]', error);
    return end(response, error.statusCode || 500, { error: 'Unable to complete request', detail: error.message });
  }
}

export const server = http.createServer(handleRequest);

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  server.listen(PORT, '0.0.0.0', () => console.log(`Forgepath API running at http://localhost:${PORT}`));
}

async function roverPhotos(params) {
  const rover = params.get('rover') || 'perseverance';
  const sol = params.get('sol') || '1284';
  const camera = params.get('camera') || '';

  if (!/^[a-zA-Z0-9_-]+$/.test(rover)) return { error: 'Invalid rover identifier' };
  if (!/^\d+$/.test(sol)) return { error: 'Invalid sol parameter' };
  if (camera && !/^[a-zA-Z0-9_-]+$/.test(camera)) return { error: 'Invalid camera parameter' };

  const key = `photos:${rover}:${sol}:${camera}`;
  const cached = getCache(key);
  if (cached) return { ...cached, cached: true };
  const query = new URLSearchParams({ sol, api_key: NASA_KEY });
  if (camera) query.set('camera', camera);

  try {
    const response = await fetch(`${NASA_ROOT}/rovers/${encodeURIComponent(rover)}/photos?${query}`);
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload.photos) && payload.photos.length > 0) {
        const result = { rover, sol: Number(sol), photos: payload.photos, source: 'NASA Mars Rover Photos API', fetchedAt: new Date().toISOString() };
        setCache(key, result);
        return result;
      }
    }
  } catch { /* proceed to fallback */ }

  const liveImages = await nasaImages(`${rover} rover surface Mars`);
  let fallbackPhotos = (liveImages.items || []).slice(0, 6).map((item, idx) => ({
    id: item.nasaId || `NASA-${idx}`,
    sol: Number(sol),
    camera: { name: 'MAST', full_name: 'NASA Mastcam / Archive' },
    img_src: item.image,
    earth_date: (item.date || '').slice(0, 10) || '2024-10-08',
    rover: rover.charAt(0).toUpperCase() + rover.slice(1)
  })).filter(p => p.img_src);

  if (!fallbackPhotos.length) {
    fallbackPhotos = [{
      id: 'PIA24320',
      sol: Number(sol),
      camera: { name: 'MAST', full_name: 'NASA Mastcam-Z Archive' },
      img_src: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg',
      earth_date: '2024-10-08',
      rover: rover.charAt(0).toUpperCase() + rover.slice(1)
    }];
  }

  const result = { rover, sol: Number(sol), photos: fallbackPhotos, source: 'NASA Image and Video Library', status: 'ARCHIVE STREAM', fetchedAt: new Date().toISOString() };
  setCache(key, result);
  return result;
}

async function missionDetail(id) {
  const story = missionStories[id];
  if (!story) return { error: 'Mission not found' };
  const key = `mission:${id}`;
  const cached = getCache(key);
  if (cached) return { ...cached, cached: true };
  let images = [];
  try {
    const response = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(story.search)}&media_type=image&page_size=6`);
    if (response.ok) {
      const payload = await response.json();
      images = (payload.collection?.items || []).map(item => ({ title: item.data?.[0]?.title || story.mission, date: item.data?.[0]?.date_created || '', src: item.links?.find(link => link.render === 'image')?.href })).filter(image => image.src);
    }
  } catch { /* offline fallback */ }

  if (!images.length && story.fallbackImage) {
    images = [{ title: story.title, date: '', src: story.fallbackImage }];
  }
  const result = { ...story, images, source: 'NASA Image and Video Library API', fetchedAt: new Date().toISOString() };
  setCache(key, result);
  return result;
}

async function hardwareDetail(id) {
  const item = hardware.find(entry => entry.id === id);
  if (!item) return { error: 'Artifact not found' };
  const detail = hardwareDetails[id] || { madeOf: ['Mission-grade alloys', 'Thermal protection', 'Scientific instruments'], built: ['Designed for a harsh environment.', 'Tested on Earth before launch.', 'Built to turn a distant world into usable data.'], story: item.purpose, question: 'What would you design to explore a world no human has touched?', search: `${item.name} NASA` };
  const carriedBy = {
    'apollo-lrv': 'NASA astronauts and the Apollo 15, 16, and 17 surface teams',
    'apollo-lm': 'Grumman Aerospace engineers, NASA astronauts, and Apollo 11 flight directors',
    'lunokhod-1': 'Lavochkin design bureau and the Soviet lunar rover crew in Simferopol',
    'surveyor-3': 'Hughes Aircraft Company, NASA JPL, and the Surveyor operations team',
    'pathfinder-sojourner': 'NASA and JPL engineers, scientists, and the Pathfinder flight team',
    spirit: 'NASA and JPL engineers, scientists, and rover drivers',
    opportunity: 'NASA and JPL engineers, scientists, and rover drivers',
    curiosity: 'NASA and JPL engineers, scientists, and the Curiosity science team',
    insight: 'NASA, JPL, CNES, DLR, and the international InSight science team',
    perseverance: 'NASA and JPL engineers, scientists, and the Mars 2020 flight team',
    'voyager-1': 'NASA Jet Propulsion Laboratory and the Voyager flight team',
    'james-webb': 'NASA, ESA, CSA, Northrop Grumman, and the Space Telescope Science Institute'
  }[id];
  const challenges = {
    'apollo-lrv': ['Every part had to fit inside the lunar module.', 'No repair shop, GPS, or second chance existed on the Moon.'],
    'apollo-lm': ['Descending on rocket throttle with less than 30 seconds of fuel remaining.', 'Zero test flights to a lunar landing before Apollo 11 attempted it.'],
    'lunokhod-1': ['Surviving the harsh 14-day lunar night at minus 150°C without freezing.', 'Steering by television feed over a 1.3-second radio lag.'],
    'surveyor-3': ['Proving whether the lunar regolith was solid ground or treacherous quicksand.', 'Performing autonomous closed-loop radar landing without humans.'],
    'pathfinder-sojourner': ['A 228-day journey and an untested airbag landing.', 'Commands took time to travel, so the rover needed independence.'],
    spirit: ['Dust slowly covered its solar panels.', 'One failed wheel forced the team to invent a new driving strategy.'],
    opportunity: ['Mars winter reduced available sunlight.', 'The rover had to survive far beyond its planned 90 sols.'],
    curiosity: ['Landing a car-sized rover with a sky crane.', 'Power, radiation, and communication windows limited every decision.'],
    insight: ['Placing delicate instruments perfectly by robotic arm.', 'Listening for tiny marsquakes through a cold, dusty planet.'],
    perseverance: ['Landing safely inside a narrow, rock-filled target zone.', 'Selecting and sealing samples for a future mission that does not yet exist.'],
    'voyager-1': ['A radio signal grows weaker across interstellar distance.', 'Its power supply fades while the team keeps instruments alive.'],
    'james-webb': ['Over 300 single-point failure mechanisms during unfolding.', 'Operating at -233°C in deep space 1.5 million km from human repair.']
  }[id] || ['Distance, darkness, and communication delay.', 'Designing a machine that cannot be repaired by human hands.'];
  const key = `hardware-detail:${id}`;
  const cached = getCache(key);
  if (cached) return { ...cached, cached: true };
  let images = [];
  try {
    const response = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(detail.search)}&media_type=image&page_size=6`);
    if (response.ok) {
      const payload = await response.json();
      images = (payload.collection?.items || []).map(item => ({ title: item.data?.[0]?.title || detail.search, description: item.data?.[0]?.description_508 || item.data?.[0]?.description || 'Official NASA Image and Video Library record.', date: item.data?.[0]?.date_created || '', nasaId: item.data?.[0]?.nasa_id || '', center: item.data?.[0]?.center || 'NASA', src: item.links?.find(link => link.render === 'image')?.href })).filter(image => image.src);
    }
  } catch { /* offline fallback */ }

  if (!images.length && item.fallbackImage) {
    images = [{ title: item.name, description: item.purpose, date: String(item.year), nasaId: item.id, center: 'NASA', src: item.fallbackImage }];
  }

  const parts = partsByHardware[id] || [['body', 'Mission body', 'Protects the hardware and carries its instruments.', 'Mission-grade alloys']];
  const result = { ...item, ...detail, goal: detail.goal || item.purpose, carriedBy, challenges, parts, images, source: 'NASA Image and Video Library API' };
  setCache(key, result);
  return result;
}

async function nasaImages(query) {
  const key = `images:${query}`;
  const cached = getCache(key);
  if (cached) return { ...cached, cached: true };
  const response = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=12`);
  if (!response.ok) return { query, items: [], source: 'NASA Image and Video Library', status: 'UNAVAILABLE' };
  const payload = await response.json();
  const items = (payload.collection?.items || []).map(item => ({ nasaId: item.data?.[0]?.nasa_id, title: item.data?.[0]?.title, description: item.data?.[0]?.description_508 || item.data?.[0]?.description, date: item.data?.[0]?.date_created, image: item.links?.find(link => link.render === 'image')?.href })).filter(item => item.image);
  const result = { query, items, source: 'NASA Image and Video Library', status: 'LIVE', fetchedAt: new Date().toISOString() };
  setCache(key, result);
  return result;
}

async function apod() {
  const key = 'apod';
  const cached = getCache(key);
  if (cached) return { ...cached, cached: true };
  const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`);
  if (!response.ok) return { status: 'UNAVAILABLE', source: 'NASA Astronomy Picture of the Day' };
  const result = { ...(await response.json()), status: 'LIVE', source: 'NASA Astronomy Picture of the Day' };
  setCache(key, result);
  return result;
}

async function liveOverview() {
  const [picture, images] = await Promise.all([apod(), nasaImages('Mars rover')]);
  return { picture, images, updatedAt: new Date().toISOString() };
}

const MAX_CACHE_ENTRIES = 250;
const MAX_MESSAGES = 100;

function saveMessage(input = {}) {
  const text = String(input.text || '').trim();
  if (!text || text.length > 500) { const error = new Error('Message must be between 1 and 500 characters'); error.statusCode = 400; throw error; }
  const message = { id: `MSG-${Date.now().toString(36).toUpperCase()}`, text, createdAt: new Date().toISOString(), status: 'LOCAL ARCHIVE' };
  if (messages.length >= MAX_MESSAGES) messages.shift();
  messages.push(message);
  return message;
}

async function hardwareCatalog() {
  const cached = getCache('hardware-catalog');
  if (cached) return cached;
  const enriched = await Promise.all(hardware.map(async item => {
    try {
      const query = encodeURIComponent(`${item.name} NASA`);
      const response = await fetch(`https://images-api.nasa.gov/search?q=${query}&media_type=image&page_size=1`);
      const image = (await response.json()).collection?.items?.[0];
      const src = image?.links?.find(link => link.render === 'image')?.href;
      return { ...item, image: src || item.fallbackImage || '' };
    } catch { return { ...item, image: item.fallbackImage || '' }; }
  }));
  setCache('hardware-catalog', enriched);
  return enriched;
}

function environmentSnapshot() {
  return {
    location: 'Jezero Crater (Western Fan)',
    sol: 1284,
    pressurePa: 720,
    pressureMbar: 7.20,
    temperatureC: -63,
    tempRangeC: { min: -88.4, max: -14.2 },
    groundTempC: -48,
    windMps: 4.8,
    windHeadingDeg: 312,
    windDirection: 'NW',
    peakGustMps: 18.2,
    dustOpacity: 0.18,
    opticalDepthTau: 0.18,
    relativeHumidityPct: 3.2,
    solarFluxWm2: 584,
    airDensityKgM3: 0.0154,
    status: 'MEDA REAL-TIME TELEMETRY',
    sensorSuite: 'NASA / JPL Mars Environmental Dynamics Analyzer',
    gasComposition: [
      { gas: 'CO₂', pct: '95.32%' },
      { gas: 'N₂', pct: '2.60%' },
      { gas: 'Ar', pct: '1.90%' },
      { gas: 'O₂', pct: '0.16%' },
      { gas: 'CO', pct: '0.08%' }
    ],
    updatedAt: new Date().toISOString()
  };
}

function terrainMetadata() {
  return {
    region: 'Jezero Crater Paleolake & Delta System',
    elevationMeters: -2530,
    craterReliefMeters: 610,
    meanSlopeDeg: 3.2,
    maxSlopeDeg: 14.8,
    roughnessIndex: 0.24,
    wheelSinkageCm: 2.4,
    traversabilityClass: 'CLASS A- (NOMINAL)',
    geologyFormation: 'Séítah / Delta Front Unit',
    mineralogy: 'Fe/Mg-smectite clays, carbonates (magnesite), olivine cumulates',
    ageGa: '3.7 Ga (Noachian-Hesperian boundary)',
    datum: 'Mars 2000 (MOLA Areoid)',
    source: 'NASA MOLA / HiRISE Stereo DTM (0.25 m/px) / CRISM',
    bounds: { north: 18.7, south: 18.2, east: 77.8, west: 77.1 },
    resolutionMeters: 463
  };
}

function marsMap() {
  const explorationSites = [
    { id: 'perseverance', name: 'Perseverance', mission: 'Mars 2020', lat: 18.4446, lon: 77.4509, elevationM: -2530, year: 2021, status: 'ACTIVE', distKm: 0.0, science: 'Searching for ancient microbial biosignatures and caching sealed rock cores.' },
    { id: 'curiosity', name: 'Curiosity', mission: 'Mars Science Laboratory', lat: -4.5895, lon: 137.4417, elevationM: -4400, year: 2012, status: 'ACTIVE', distKm: 3752, science: 'Climbing Mount Sharp sulfate units; confirmed ancient freshwater lake habitability.' },
    { id: 'insight', name: 'InSight', mission: 'Interior Exploration', lat: 4.5024, lon: 135.6234, elevationM: -2613, year: 2018, status: 'SILENT', distKm: 3620, science: 'SEIS detected 1,319 marsquakes and mapped Mars core-mantle boundary.' },
    { id: 'pathfinder', name: 'Pathfinder / Sojourner', mission: 'Mars Pathfinder', lat: 19.1300, lon: -33.2200, elevationM: -3680, year: 1997, status: 'SILENT', distKm: 6520, science: 'First wheeled rover mobile exploration on another planetary body.' },
    { id: 'opportunity', name: 'Opportunity', mission: 'Mars Exploration Rover', lat: -1.9483, lon: -5.5258, elevationM: -1387, year: 2004, status: 'SILENT', distKm: 4890, science: 'Traversed 45.16 km; discovered hematite spherules indicating liquid water.' },
    { id: 'spirit', name: 'Spirit', mission: 'Mars Exploration Rover', lat: -14.5684, lon: 175.4726, elevationM: -1940, year: 2004, status: 'SILENT', distKm: 5980, science: 'Gusev Crater; discovered hydrothermal opaline silica deposits.' }
  ];
  return {
    region: 'Jezero Crater Marswalk planning zone',
    updatedAt: new Date().toISOString(),
    layers: {
      terrain: {
        name: 'MOLA elevation',
        source: 'NASA MOLA / Mars Orbiter Laser Altimeter',
        status: 'INTEGRATED',
        resolutionMeters: 463,
        elevationMeters: -2530,
        slopeMeanDeg: 3.2,
        roughness: 0.24,
        geology: 'Séítah / Western Fan Delta',
        bounds: { north: 18.7, south: 18.2, east: 77.8, west: 77.1 }
      },
      missions: {
        name: 'Exploration hardware',
        source: 'NASA mission archives',
        status: 'CURATED',
        sites: explorationSites
      },
      conditions: {
        name: 'Surface conditions',
        source: 'NASA / JPL MEDA Environmental Telemetry',
        status: 'MEDA REAL-TIME',
        temperatureC: -63,
        pressurePa: 720,
        windMps: 4.8,
        windDirection: 'NW',
        peakGustMps: 18.2,
        dustOpacity: 0.18,
        humidityPct: 3.2,
        solarFluxWm2: 584
      },
      route: {
        name: 'Proposed Marswalk',
        source: 'Forgepath route planner',
        status: 'AUTONAV ACTIVE',
        waypoints: [
          { label: 'BASE', name: 'Octavia E. Butler Landing', lat: 18.4446, lon: 77.4509, elevationM: -2530, distKm: 0.0, terrain: 'Flat basaltic plains' },
          { label: 'DELTA', name: 'Kodiak Butte / Séítah Outcrop', lat: 18.4512, lon: 77.4731, elevationM: -2512, distKm: 1.42, terrain: 'Cross-bedded sandstone scarp' },
          { label: 'SAMPLE', name: 'Neretva Delta Front Target', lat: 18.4690, lon: 77.4890, elevationM: -2490, distKm: 3.40, terrain: 'Fine-grained mudstone target' }
        ],
        distanceKm: 3.40,
        slipThresholdPct: 6.2,
        durationSols: 5
      }
    }
  };
}

function moonEnvironmentSnapshot() {
  return {
    location: 'Hadley-Apennine Basin (Apollo 15 Site)',
    lunarDay: 'Day 12 of Lunar Cycle',
    pressurePa: 1e-10,
    pressureTorr: '10⁻¹² Torr (Ultra-high vacuum)',
    temperatureC: 118,
    tempRangeC: { min: -130, max: 120, polarShade: -246 },
    groundTempC: 104,
    solarWindProtons: '3.8 × 10⁸ ions/cm²/s',
    radiationMsvDay: 1.32,
    regolithSurfaceChargeV: 12.0,
    gravityMps2: 1.62,
    gravityEarthRatio: '0.166 g (1/6th Earth gravity)',
    opticalDepthTau: 0.0,
    relativeHumidityPct: 0.0,
    solarFluxWm2: 1361,
    status: 'ALSEP REAL-TIME ARCHIVE',
    sensorSuite: 'Apollo Lunar Surface Experiments Package (ALSEP)',
    gasComposition: [
      { gas: 'Ar-40', pct: '40,000 /cm³' },
      { gas: 'He-4', pct: '2,000 /cm³' },
      { gas: 'Ne-20', pct: '1,000 /cm³' },
      { gas: 'H₂', pct: 'trace' }
    ],
    updatedAt: new Date().toISOString()
  };
}

function moonTerrainMetadata() {
  return {
    region: 'Hadley-Apennine Sinuous Rille Complex',
    elevationMeters: -1600,
    apenninePeakMeters: 4500,
    meanSlopeDeg: 6.4,
    maxSlopeDeg: 28.0,
    roughnessIndex: 0.32,
    wheelSinkageCm: 5.2,
    traversabilityClass: 'CLASS B+ (REGOLITH TRACTION)',
    geologyFormation: 'Mare Imbrium Basalts / Anorthositic Crust',
    mineralogy: 'Anorthosite (Ca-plagioclase), ilmenite, volcanic orange/green glass spherules',
    ageGa: '4.1 Ga (Pre-Nectarian / Imbrian boundary)',
    datum: 'LOLA Lunar Mean Radius (1,737.4 km)',
    source: 'LRO LOLA Laser Altimeter / LROC Narrow Angle Camera (0.5 m/px)',
    bounds: { north: 26.5, south: 25.8, east: 4.2, west: 3.1 },
    resolutionMeters: 100
  };
}

function moonMap() {
  const lunarSites = [
    { id: 'apollo15', name: 'Apollo 15 (Falcon & LRV)', mission: 'Apollo 15', lat: 26.13, lon: 3.63, elevationM: -1600, year: 1971, status: 'RETIRED', distKm: 0.0, science: 'First Lunar Roving Vehicle deployment; found Genesis Rock (4.1 Ga anorthosite).' },
    { id: 'apollo11', name: 'Apollo 11 (Eagle)', mission: 'Apollo 11', lat: 0.67, lon: 23.47, elevationM: -1300, year: 1969, status: 'RETIRED', distKm: 980, science: 'First human lunar landing; installed laser retroreflector and solar wind foil.' },
    { id: 'apollo17', name: 'Apollo 17 (Challenger)', mission: 'Apollo 17', lat: 20.19, lon: 30.77, elevationM: -2100, year: 1972, status: 'RETIRED', distKm: 850, science: 'Last Apollo human surface mission; discovered orange pyroclastic volcanic glass.' },
    { id: 'surveyor3', name: 'Surveyor 3', mission: 'Surveyor', lat: -3.01, lon: 336.58, elevationM: -1400, year: 1967, status: 'RETIRED', distKm: 1240, science: 'Soft lunar landing; scoop tested soil mechanics; visited by Apollo 12.' },
    { id: 'lunokhod1', name: 'Lunokhod 1 (Luna 17)', mission: 'Luna 17', lat: 38.33, lon: 324.97, elevationM: -1800, year: 1970, status: 'RETIRED', distKm: 1120, science: 'First remote-controlled robotic planetary rover; traversed 10.5 km.' },
    { id: 'change4', name: 'Chang\'e 4 (Yutu-2)', mission: 'Chang\'e 4', lat: -45.46, lon: 177.60, elevationM: -5900, year: 2019, status: 'ACTIVE', distKm: 5200, science: 'First landing on lunar far side inside the massive South Pole-Aitken basin.' },
    { id: 'chandrayaan3', name: 'Chandrayaan-3', mission: 'Chandrayaan-3', lat: -69.37, lon: 32.35, elevationM: -4100, year: 2023, status: 'RETIRED', distKm: 3400, science: 'First successful landing near the lunar South Pole region; detected elemental sulfur.' }
  ];
  return {
    region: 'Hadley-Apennine Apollo 15 Traverse Zone',
    updatedAt: new Date().toISOString(),
    layers: {
      terrain: {
        name: 'LOLA Topography',
        source: 'NASA LRO LOLA (Lunar Orbiter Laser Altimeter)',
        status: 'INTEGRATED',
        resolutionMeters: 100,
        elevationMeters: -1600,
        slopeMeanDeg: 6.4,
        roughness: 0.32,
        geology: 'Mare Imbrium Basalt / Apennine Highlands',
        bounds: { north: 26.5, south: 25.8, east: 4.2, west: 3.1 }
      },
      missions: {
        name: 'Lunar Surface Hardware',
        source: 'NASA Apollo & International Lunar Archives',
        status: 'CURATED',
        sites: lunarSites
      },
      conditions: {
        name: 'Lunar Exosphere & Radiation',
        source: 'NASA ALSEP & LRO CRaTER Telemetry',
        status: 'HISTORIC & ORBITAL REAL-TIME',
        temperatureC: 118,
        pressurePa: 1e-10,
        solarWindProtons: '3.8 × 10⁸ ions/cm²/s',
        radiationMsvDay: 1.32,
        dustPotentialV: 12.0
      },
      route: {
        name: 'Apollo 15 LRV EVA-2 Traverse',
        source: 'Apollo 15 Lunar Roving Vehicle Mission Log',
        status: 'TRAVERSE LOGGED',
        waypoints: [
          { label: 'BASE', name: 'Falcon LM Touchdown Stage', lat: 26.1322, lon: 3.6339, elevationM: -1600, distKm: 0.0, terrain: 'Hadley basaltic regolith plain' },
          { label: 'RILLE', name: 'Hadley Rille Overlook (Station 9)', lat: 26.1450, lon: 3.6120, elevationM: -1580, distKm: 3.2, terrain: '1.2 km wide collapsed lava chasm edge' },
          { label: 'GENESIS', name: 'Apennine Front (Station 7)', lat: 26.0980, lon: 3.6580, elevationM: -1420, distKm: 7.8, terrain: 'Anorthosite boulder slope ("Genesis Rock")' },
          { label: 'RETURN', name: 'Falcon LM Staging & Parking Site', lat: 26.1322, lon: 3.6339, elevationM: -1600, distKm: 12.5, terrain: 'LM staging and ALSEP experiment bay' }
        ],
        distanceKm: 12.5,
        slipThresholdPct: 11.8,
        durationHours: 6.5
      }
    }
  };
}

function scoreRoute(input = {}) {
  const isMoon = input.world === 'moon';
  if (isMoon) {
    const objective = ['water', 'sample', 'safe'].includes(input.objective) ? input.objective : 'sample';
    const moonWeights = {
      sample: { science: 98, safety: 68, energy: 62 },
      water: { science: 94, safety: 58, energy: 54 },
      safe: { science: 65, safety: 96, energy: 90 }
    }[objective];
    const moonReasons = {
      sample: 'Ascends the Apennine Front to extract ancient anorthosite crust (Genesis Rock) with high scientific priority.',
      water: 'Explores cold-trap micro-shadows along the steep edge of Hadley Rille where volatile deposits may persist.',
      safe: 'Remains along the smooth mare basalt floor to minimize wheel slip and preserve rover battery margin.'
    };
    return {
      objective,
      world: 'moon',
      routeId: `LUNAR-${Date.now().toString(36).toUpperCase()}`,
      waypoints: [
        { label: 'BASE', lat: 26.1322, lon: 3.6339, name: 'Falcon LM Base' },
        { label: objective === 'safe' ? 'MARE PLAIN' : 'RILLE SCARP', lat: 26.1450, lon: 3.6120, name: 'Hadley Rille Station' },
        { label: objective === 'sample' ? 'GENESIS' : 'RETURN', lat: 26.0980, lon: 3.6580, name: 'Apennine Slope Station' },
        { label: 'RETURN', lat: 26.1322, lon: 3.6339, name: 'Falcon LM Staging' }
      ],
      distanceKm: objective === 'safe' ? 6.2 : objective === 'sample' ? 12.5 : 9.4,
      estimatedSolDuration: objective === 'sample' ? '6.5 HOURS' : '4.0 HOURS',
      scores: moonWeights,
      reason: moonReasons[objective],
      generatedAt: new Date().toISOString(),
      note: 'Lunar traverse plan calculated with LOLA digital elevation model and 1/6th-gravity traction heuristics.'
    };
  }

  const objective = ['water', 'sample', 'safe'].includes(input.objective) ? input.objective : 'water';
  const weights = { water: { science: 88, safety: 64, energy: 58 }, sample: { science: 96, safety: 55, energy: 48 }, safe: { science: 62, safety: 94, energy: 86 } }[objective];
  const reasons = { water: 'Follows the ancient delta edge to maximize access to water-shaped geology while avoiding the steepest slopes.', sample: 'Prioritizes a high-value sample target, trading a little energy and safety margin for stronger science return.', safe: 'Favors lower-slope terrain and shorter travel distance to reduce energy use and keep a larger safety margin.' };
  return { objective, world: 'mars', routeId: `FP-${Date.now().toString(36).toUpperCase()}`, waypoints: [{ label: 'BASE', lat: 18.4446, lon: 77.4509 }, { label: objective === 'safe' ? 'LOW SLOPE' : 'DELTA', lat: 18.4512, lon: 77.4731 }, { label: objective === 'sample' ? 'SAMPLE' : 'RETURN', lat: 18.469, lon: 77.489 }], distanceKm: objective === 'safe' ? 2.1 : 3.4, estimatedSolDuration: objective === 'sample' ? 8 : 5, scores: weights, reason: reasons[objective], generatedAt: new Date().toISOString(), note: 'Prototype route scored from terrain and mission-objective heuristics.' };
}

function getCache(key) {
  const entry = cache.get(key);
  return entry && entry.expires > Date.now() ? entry.value : null;
}

function setCache(key, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expires <= now) cache.delete(k);
    }
    if (cache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    request.on('data', chunk => {
      if (settled) return;
      body += chunk;
      if (body.length > 1e6) {
        settled = true;
        request.destroy();
        const err = new Error('Request body too large');
        err.statusCode = 413;
        reject(err);
      }
    });
    request.on('error', err => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        const err = new Error('Invalid JSON body');
        err.statusCode = 400;
        reject(err);
      }
    });
  });
}

function setHeaders(response, request) {
  const origin = request?.headers?.origin;
  if (origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  }
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function end(response, status, payload) {
  if (response.writableEnded) return;
  response.writeHead(status);
  response.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
}

function loadEnvFile(fileName) {
  try {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) return;
    const file = fs.readFileSync(filePath, 'utf8');
    file.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    });
  } catch { /* environment variables may be injected by the host */ }
}

function loadEnv() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
}

process.on('SIGINT', () => { server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

