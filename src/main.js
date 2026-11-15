import * as THREE from 'three';
import {
  createIcons,
  Volume2,
  VolumeX,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Route,
  ChevronRight,
  Check,
  Send,
  Compass,
  Layers,
  Sparkles
} from 'lucide';
import './style.css';
import { getLatestRoverPhoto } from './data/nasa.js';
import { API_BASE } from './data/client.js';
import { createMiniMap3D } from './minimap3d.js';

let miniMap3D = null;
let currentWorld = 'mars'; // 'mars' | 'moon' | 'deepspace'
let activeHardwareFilter = 'ALL';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

const appIcons = {
  Volume2,
  VolumeX,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Route,
  ChevronRight,
  Check,
  Send,
  Compass,
  Layers,
  Sparkles
};

function renderIcons() {
  createIcons({ icons: appIcons });
}
window.lucide = { createIcons: renderIcons };

// --- FULL HARDWARE REGISTRY (MOON, MARS, DEEP SPACE) ---
const fallbackHardware = [
  { id: 'apollo-lrv', body: 'MOON', status: 'RETIRED ON SURFACE', shortName: 'Lunar Rover', name: 'Apollo Lunar Roving Vehicle', mission: 'Apollo 15 / 16 / 17', year: 1971, science: 'Extended astronaut range to collect geologic samples across 28 km.', purpose: 'Carried astronauts across the lunar surface and up mountain flanks.', image: 'https://images-assets.nasa.gov/image/6640853/6640853~medium.jpg' },
  { id: 'apollo-lm', body: 'MOON', status: 'RETIRED ON SURFACE', shortName: 'Eagle Descent Stage', name: 'Apollo 11 Lunar Module Descent Stage', mission: 'Apollo 11', year: 1969, science: 'Carried retroreflector array and first lunar seismometer.', purpose: 'First human touchdown stage left at Mare Tranquillitatis.', image: 'https://images-assets.nasa.gov/image/6900992/6900992~medium.jpg' },
  { id: 'lunokhod-1', body: 'MOON', status: 'RETIRED ON SURFACE', shortName: 'Lunokhod 1', name: 'Lunokhod 1 Lunar Rover', mission: 'Luna 17', year: 1970, science: 'Traversed 10.5 km of lunar regolith and returned 20,000 television images.', purpose: 'First autonomous robotic wheeled rover on another planetary body.', image: 'https://images-assets.nasa.gov/image/PIA12967/PIA12967~small.jpg' },
  { id: 'surveyor-3', body: 'MOON', status: 'RETIRED ON SURFACE', shortName: 'Surveyor 3', name: 'Surveyor 3 Lander', mission: 'Surveyor', year: 1967, science: 'Proved lunar soil bearing capacity for human landing craft.', purpose: 'Soft-landing demonstration and robotic surface soil scoop.', image: 'https://images-assets.nasa.gov/image/KSC-2011-7762/KSC-2011-7762~medium.jpg' },
  { id: 'pathfinder-sojourner', body: 'MARS', status: 'SILENT', shortName: 'Sojourner', name: 'Sojourner Rover', mission: 'Mars Pathfinder', year: 1997, science: 'Proved a small rover could explore another planet.', purpose: 'Demonstrated autonomous rover mobility.', image: 'https://images-assets.nasa.gov/image/PIA04422/PIA04422~medium.jpg' },
  { id: 'spirit', body: 'MARS', status: 'SILENT', shortName: 'Spirit', name: 'Spirit Rover', mission: 'Mars Exploration Rover', year: 2004, science: 'Found volcanic rocks altered by ancient hydrothermal water.', purpose: 'Searched Gusev Crater for evidence of past water.', image: 'https://images-assets.nasa.gov/image/PIA17760/PIA17760~medium.jpg' },
  { id: 'opportunity', body: 'MARS', status: 'SILENT', shortName: 'Opportunity', name: 'Opportunity Rover', mission: 'Mars Exploration Rover', year: 2004, science: 'Confirmed liquid water once shaped Mars and drove a marathon distance.', purpose: 'Studied the history of water at Meridiani Planum.', image: 'https://images-assets.nasa.gov/image/PIA11436/PIA11436~small.jpg' },
  { id: 'curiosity', body: 'MARS', status: 'ACTIVE', shortName: 'Curiosity', name: 'Curiosity Rover', mission: 'Mars Science Laboratory', year: 2012, science: 'Found ancient freshwater chemistry and organic carbon.', purpose: 'Assesses whether Mars supported microbial life.', image: 'https://images-assets.nasa.gov/image/PIA13808/PIA13808~medium.jpg' },
  { id: 'insight', body: 'MARS', status: 'SILENT', shortName: 'InSight', name: 'InSight Lander', mission: 'Interior Exploration', year: 2018, science: 'Detected over 1,300 seismic events mapping Mars crust and core.', purpose: 'Measured the interior structure of Mars.', image: 'https://images-assets.nasa.gov/image/PIA22828/PIA22828~medium.jpg' },
  { id: 'perseverance', body: 'MARS', status: 'ACTIVE', shortName: 'Perseverance', name: 'Perseverance Rover', mission: 'Mars 2020', year: 2021, science: 'Building a sealed rock core sample collection for return to Earth.', purpose: 'Searches for signs of ancient life in Jezero Crater delta.', image: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg' },
  { id: 'voyager-1', body: 'DEEP SPACE', status: 'INTERSTELLAR', shortName: 'Voyager 1', name: 'Voyager 1', mission: 'Voyager', year: 1977, science: 'Returned measurements from beyond the heliopause in interstellar space.', purpose: 'Explored outer planets and carries the Golden Record across the galaxy.', image: 'https://images-assets.nasa.gov/image/PIA17045/PIA17045~small.jpg' },
  { id: 'james-webb', body: 'DEEP SPACE', status: 'ACTIVE', shortName: 'James Webb', name: 'James Webb Space Telescope', mission: 'JWST', year: 2021, science: 'Peers into earliest star formation and exoplanet atmosphere chemistry.', purpose: 'Infrared flagship space observatory at Sun-Earth L2 Lagrange point.', image: 'https://images-assets.nasa.gov/image/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o~small.jpg' }
];

let allHardwareList = fallbackHardware;

const fallbackArtifactContext = {
  'apollo-lrv': {
    carriedBy: 'NASA astronauts and Apollo 15, 16, and 17 surface teams',
    challenges: ['Every part had to fit folded inside the lunar module.', 'There was no repair shop, GPS, or second chance on the Moon.'],
    images: [{ title: 'Apollo 15 Lunar Roving Vehicle on Lunar Surface', date: '1971', src: 'https://images-assets.nasa.gov/image/6640853/6640853~medium.jpg' }]
  },
  'apollo-lm': {
    carriedBy: 'Grumman Aerospace, NASA astronauts, and Apollo 11 flight team',
    challenges: ['Rocket engine descent over boulder field with 25 seconds of fuel remaining.', 'Zero atmosphere meant aerodynamic wings and parachutes were useless.'],
    images: [{ title: 'Apollo 11 Lunar Module Eagle at Tranquility Base', date: '1969', src: 'https://images-assets.nasa.gov/image/6900992/6900992~medium.jpg' }]
  },
  'lunokhod-1': {
    carriedBy: 'Lavochkin design bureau and the Soviet lunar rover crew in Simferopol',
    challenges: ['Surviving the harsh 14-day lunar night at minus 150°C without freezing.', 'Steering by television feed over a 1.3-second radio lag.'],
    images: [{ title: 'Lunokhod 1 Soviet Lunar Rover (Luna 17)', date: '1970', src: 'https://images-assets.nasa.gov/image/PIA12967/PIA12967~small.jpg' }]
  },
  'surveyor-3': {
    carriedBy: 'Hughes Aircraft Company, NASA JPL, and the Surveyor operations team',
    challenges: ['Proving whether the lunar regolith was solid ground or treacherous quicksand.', 'Performing autonomous closed-loop radar landing without humans.'],
    images: [{ title: 'Surveyor 3 Lunar Lander Inspected by Apollo 12', date: '1967', src: 'https://images-assets.nasa.gov/image/KSC-2011-7762/KSC-2011-7762~medium.jpg' }]
  },
  'pathfinder-sojourner': {
    carriedBy: 'NASA and JPL engineers, scientists, and the Pathfinder flight team',
    challenges: ['A 228-day journey ended in an untested airbag landing.', 'Commands took time to travel, so the rover needed independence.'],
    images: [{ title: 'Sojourner Rover Examines Yogi Rock on Mars', date: '1997', src: 'https://images-assets.nasa.gov/image/PIA04422/PIA04422~medium.jpg' }]
  },
  spirit: {
    carriedBy: 'NASA and JPL engineers, scientists, and rover drivers',
    challenges: ['Dust slowly covered its solar panels.', 'One failed wheel forced the team to invent a new driving strategy.'],
    images: [{ title: 'Spirit Rover at Gusev Crater', date: '2004', src: 'https://images-assets.nasa.gov/image/PIA17760/PIA17760~medium.jpg' }]
  },
  opportunity: {
    carriedBy: 'NASA and JPL engineers, scientists, and rover drivers',
    challenges: ['Mars winter reduced available sunlight.', 'The rover had to survive far beyond its planned 90 sols.'],
    images: [{ title: 'Opportunity Rover Panoramic Vista at Meridiani Planum', date: '2004', src: 'https://images-assets.nasa.gov/image/PIA11436/PIA11436~small.jpg' }]
  },
  curiosity: {
    carriedBy: 'NASA and JPL engineers, scientists, and the Curiosity science team',
    challenges: ['A car-sized rover had to land with a sky crane.', 'Power, radiation, and communication windows limited every decision.'],
    images: [{ title: 'Curiosity Rover Self-Portrait at Gale Crater', date: '2012', src: 'https://images-assets.nasa.gov/image/PIA13808/PIA13808~medium.jpg' }]
  },
  insight: {
    carriedBy: 'NASA, JPL, CNES, DLR, and the international InSight science team',
    challenges: ['Delicate instruments had to be placed perfectly by robotic arm.', 'The seismometer had to listen through a cold, dusty planet.'],
    images: [{ title: 'InSight Lander Deployment of SEIS Seismometer on Mars', date: '2018', src: 'https://images-assets.nasa.gov/image/PIA22828/PIA22828~medium.jpg' }]
  },
  perseverance: {
    carriedBy: 'NASA and JPL engineers, scientists, and the Mars 2020 flight team',
    challenges: ['It had to land inside a narrow, rock-filled target zone.', 'Samples must be selected and sealed for a future mission that does not yet exist.'],
    images: [{ title: 'Perseverance Rover at Jezero Crater Delta', date: '2021', src: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg' }]
  },
  'voyager-1': {
    carriedBy: 'NASA Jet Propulsion Laboratory and the Voyager flight team',
    challenges: ['Its radio signal grows weaker across interstellar distance.', 'Its power supply fades while engineers keep instruments alive.'],
    images: [{ title: 'Voyager 1 Golden Record and Interstellar Spacecraft', date: '1977', src: 'https://images-assets.nasa.gov/image/PIA17045/PIA17045~small.jpg' }]
  },
  'james-webb': {
    carriedBy: 'NASA, ESA, CSA, Northrop Grumman, and the Space Telescope Science Institute',
    challenges: ['Over 300 single-point failure mechanisms during origami unfolding.', 'Operating at -233°C in deep space 1.5 million km from human repair.'],
    images: [{ title: 'James Webb Space Telescope Primary Mirror Array', date: '2021', src: 'https://images-assets.nasa.gov/image/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o/by-the-dozen-nasas-james-webb-space-telescope-mirrors_23607727573_o~small.jpg' }]
  }
};

// --- MULTI-WORLD CONFIGURATION ---
const worldConfigs = {
  mars: {
    name: 'Mars',
    heroEyebrow: 'NASA SPACE APPS // MARS EXPLORATION',
    heroHeadline: 'Every path<br/><em>forges</em> a future.',
    heroLede: 'An interactive atlas of the machines humans have left on the Moon, Mars, and in deep space—and the science those machines made possible.',
    heroCoord: '14° 35′ 02″ N · Jezero Crater / SOL 1284',
    labelA: 'OLYMPUS MONS <small>22.1 KM</small>',
    labelB: 'JEZERO CRATER <small>ACTIVE</small>',
    readoutDist: '18.4M KM',
    readoutStatus: 'LIVE MISSION MODE',
    mapTitle: 'Jezero Crater Paleolake',
    mapStatus: '● 3D ORBITAL',
    mapKicker: '01 / INTERPLANETARY MARSWALK MAP',
    logRover: 'Perseverance Rover',
    logMeta: 'Jezero Crater · Sol 1,284',
    logQuote: '“The safest path is rarely the most interesting one.”',
    logAvatar: 'PJ',
    objectives: [
      { key: 'water', icon: '◌', title: 'Chase the water', sub: 'Follow ancient river delta' },
      { key: 'sample', icon: '◇', title: 'Find a sample', sub: 'Prioritize science return' },
      { key: 'safe', icon: '⌁', title: 'Keep it safe', sub: 'Minimize terrain risk' }
    ],
    routeButtonText: 'Launch route planner',
    milestones: [
      { year: '1965', title: 'First close encounter', text: 'Mariner 4 returns the first close-up images of Mars, turning a point of light into a world with a surface.', x: 14, z: -10, site: 'Mariner 4 · Flyby', id: 'mariner4' },
      { year: '1997', title: 'A new way to roam', text: 'Mars Pathfinder lands in Ares Vallis and deploys Sojourner—the first wheeled vehicle to explore another planet.', x: -8, z: 8, site: 'Pathfinder · Ares Vallis', id: 'pathfinder' },
      { year: '2021', title: 'Two paths, one planet', text: 'Perseverance lands in Jezero Crater while Ingenuity takes flight—the first powered flight on another world.', x: 8, z: 12, site: 'Perseverance · Jezero Crater', id: 'perseverance' },
      { year: 'NOW', title: 'Your path begins here', text: 'Forgepath connects terrain, mission history, and next-step decisions to make exploration legible for everyone.', x: -4, z: -5, site: 'Forgepath · Next waypoint', id: 'forgepath' }
    ]
  },
  moon: {
    name: 'Moon',
    heroEyebrow: 'NASA SPACE APPS // LUNAR EXPLORATION',
    heroHeadline: 'Footprints on<br/><em>another world.</em>',
    heroLede: 'An interactive atlas of human exploration across lunar maria, volcanic rilles, and permanently shadowed polar craters—and the science left in the regolith.',
    heroCoord: '26° 07′ 55″ N · Hadley Rille / APOLLO 15',
    labelA: 'HADLEY RILLE <small>1.2 KM GORGE</small>',
    labelB: 'MARE TRANQUILLITATIS <small>APOLLO 11</small>',
    readoutDist: '384,400 KM',
    readoutStatus: 'LUNAR SURFACE MODE',
    mapTitle: 'Hadley Rille & Apennines',
    mapStatus: '● 3D LUNAR ORBIT',
    mapKicker: '01 / LUNAR TRAVERSE MAP',
    logRover: 'Apollo Lunar Roving Vehicle',
    logMeta: 'Hadley-Apennine · Apollo 15',
    logQuote: '“Magnificent desolation.” — Buzz Aldrin, Apollo 11',
    logAvatar: 'A15',
    logImage: 'https://images-assets.nasa.gov/image/as15-88-11866/as15-88-11866~medium.jpg',
    objectives: [
      { key: 'sample', icon: '◇', title: 'Sample Genesis Rock', sub: 'Climb Apennine slope for 4.1 Ga crust' },
      { key: 'water', icon: '◌', title: 'Inspect Hadley Rille', sub: 'Scan 1.2 km chasm for shadow volatiles' },
      { key: 'safe', icon: '⌁', title: 'Mare Basalt Corridor', sub: 'Flat regolith plain for zero slip risk' }
    ],
    routeButtonText: 'Plan Lunar Traverse',
    milestones: [
      { year: '1959', title: 'First touch & the far side', text: 'Luna 2 impacts the lunar surface as the first human artifact; Luna 3 photographs the hidden far side.', x: 12, z: -8, site: 'Luna 2 · Palus Putredinis', id: 'apollo11' },
      { year: '1969', title: 'Tranquility Base', text: 'Apollo 11 lands the Lunar Module Eagle at Mare Tranquillitatis. Neil Armstrong and Buzz Aldrin leave humanity’s first footprints.', x: -6, z: 6, site: 'Apollo 11 · Tranquility Base', id: 'apollo11' },
      { year: '1971', title: 'First wheels on another world', text: 'Apollo 15 deploys the Lunar Roving Vehicle, driving 27.9 km across Hadley Delta to collect the ancient Genesis Rock.', x: 6, z: 10, site: 'Apollo 15 · Hadley Rille', id: 'apollo15' },
      { year: 'NOW', title: 'The polar water frontier', text: 'Artemis and robotic landers target permanently shadowed craters at the South Pole to tap ancient water ice.', x: -3, z: -4, site: 'Artemis · South Pole', id: 'forgepath' }
    ]
  },
  deepspace: {
    name: 'Deep Space',
    heroEyebrow: 'NASA SPACE APPS // INTERSTELLAR EXPEDITION',
    heroHeadline: 'Beyond the<br/><em>solar shores.</em>',
    heroLede: 'An interactive atlas of the robotic emissaries crossing the heliopause into the interstellar expanse—carrying humanity’s science and memory across cosmic distance.',
    heroCoord: '162.8 AU · Beyond Heliopause / 24.3B KM',
    labelA: 'TERMINATION SHOCK <small>94 AU</small>',
    labelB: 'INTERSTELLAR VOID <small>VOYAGER 1</small>',
    readoutDist: '24.3B KM',
    readoutStatus: 'INTERSTELLAR MODE',
    mapTitle: 'Interstellar Boundary & Heliopause',
    mapStatus: '● DEEP SPACE TRACK',
    mapKicker: '01 / INTERSTELLAR TRAJECTORY',
    logRover: 'Voyager 1 Spacecraft',
    logMeta: 'Interstellar Space · 162.8 AU',
    logQuote: '“Look again at that dot. That’s here. That’s home. That’s us.” — Carl Sagan',
    logAvatar: 'V1',
    logImage: 'https://images-assets.nasa.gov/image/PIA00013/PIA00013~medium.jpg',
    objectives: [
      { key: 'sample', icon: '◇', title: 'Cosmic Ray Boundary', sub: 'Measure interstellar plasma density jump' },
      { key: 'water', icon: '◌', title: 'Oort Cloud Vector', sub: 'Cometary reservoir trajectory calculation' },
      { key: 'safe', icon: '⌁', title: 'RTG Power Conservation', sub: 'Extend instrument survival life' }
    ],
    routeButtonText: 'Trace Interstellar Vector',
    milestones: [
      { year: '1972', title: 'Beyond the asteroid belt', text: 'Pioneer 10 is the first spacecraft to navigate the asteroid belt, fly past Jupiter, and achieve solar escape velocity.', x: 10, z: -9, site: 'Pioneer 10 · Outer Planets', id: 'voyager' },
      { year: '1977', title: 'Into the interstellar void', text: 'Voyager 1 launches carrying the Golden Record, touring Jupiter and Saturn before crossing the heliopause into true galactic space.', x: -5, z: 7, site: 'Voyager 1 · Heliopause', id: 'voyager' },
      { year: '2015', title: 'First view of the Kuiper Belt', text: 'New Horizons completes the first high-resolution flyby of Pluto and Charon, revealing ice mountains and nitrogen glaciers.', x: 7, z: 11, site: 'New Horizons · Pluto System', id: 'voyager' },
      { year: 'NOW', title: 'Cosmic origin at L2', text: 'The James Webb Space Telescope opens its golden mirror 1.5 million km out, observing the earliest galaxies in the infant universe.', x: -2, z: -3, site: 'JWST · Sun-Earth L2', id: 'forgepath' }
    ]
  }
};

// Initial App Shell
const app = document.querySelector('#app');
app.innerHTML = `
  <main class="site-shell">
    <canvas id="world-canvas" aria-label="Interactive procedural 3D planetary view"></canvas>
    <div class="grain"></div>
    <header class="topbar">
      <a class="brand" href="#landing"><span class="brand-mark">F</span><span>FORGE<span class="muted">PATH</span></span></a>
      
      <nav class="world-switcher" role="tablist" aria-label="Select planetary destination">
        <button class="world-btn active" data-world="mars" role="tab" aria-selected="true">
          <span class="world-orb mars-orb"></span>
          <span>MARS</span>
        </button>
        <button class="world-btn" data-world="moon" role="tab" aria-selected="false">
          <span class="world-orb moon-orb"></span>
          <span>MOON</span>
        </button>
        <button class="world-btn" data-world="deepspace" role="tab" aria-selected="false">
          <span class="world-orb deepspace-orb"></span>
          <span>DEEP SPACE</span>
        </button>
      </nav>

      <div class="mission-readout" id="header-readout">
        <span class="pulse"></span>
        <span id="readout-status">LIVE MISSION MODE</span>
        <span class="readout-divider"></span>
        <span id="readout-dist">18.4M KM</span>
      </div>
      <button class="icon-button" id="sound-toggle" aria-label="Toggle ambient sound"><i data-lucide="volume-2"></i></button>
    </header>

    <section class="hero scene-section" id="landing">
      <div class="hero-copy reveal">
        <p class="eyebrow" id="hero-eyebrow">NASA SPACE APPS // MARS EXPLORATION</p>
        <h1 id="hero-headline">Every path<br/><em>forges</em> a future.</h1>
        <p class="hero-lede" id="hero-lede">An interactive atlas of the machines humans have left on the Moon, Mars, and in deep space—and the science those machines made possible.</p>
        <a class="scroll-cue" href="#story"><span class="scroll-icon"><i data-lucide="arrow-down"></i></span><span>Begin the descent</span></a>
      </div>
      <div class="hero-coordinate" id="hero-coordinate"><span>14° 35′ 02″ N</span><span>Jezero Crater / SOL 001</span></div>
      <div class="terrain-label label-a" id="terrain-label-a"><span class="label-dot"></span>OLYMPUS MONS <small>22.1 KM</small></div>
      <div class="terrain-label label-b" id="terrain-label-b"><span class="label-dot"></span>JEZERO CRATER <small>ACTIVE</small></div>
    </section>

    <section class="story scene-section" id="story">
      <div class="section-intro reveal">
        <p class="eyebrow">A SHORT HISTORY OF GOING FURTHER</p>
        <h2>We have always<br/><em>left clues behind.</em></h2>
        <p>Scroll through the missions that changed how we see other worlds. Then meet the hardware, people, and science behind each clue.</p>
      </div>
      <div class="milestone-list" id="milestone-list"></div>
    </section>

    <section class="dashboard scene-section" id="dashboard">
      <div class="dashboard-heading reveal">
        <div>
          <p class="eyebrow">FORGEPATH / THE HARDWARE ATLAS</p>
          <h2>Meet the machines<br/><em>that went first.</em></h2>
        </div>
        <div class="status-pill" id="dashboard-pill"><span class="pulse"></span> MOON · MARS · DEEP SPACE</div>
      </div>
      <div class="dashboard-grid">
        <div class="panel map-panel reveal">
          <div class="panel-head">
            <div>
              <span class="panel-kicker" id="map-target-kicker">01 / INTERPLANETARY MARSWALK MAP</span>
              <h3 id="map-target-title">Jezero Crater</h3>
            </div>
            <span class="live-tag" id="map-status">● 3D ORBITAL</span>
          </div>
          <div class="map-art" id="map-art"></div>
          <div class="map-layers" role="tablist" aria-label="Exploration telemetry tabs">
            <button class="map-layer active" data-tab="terrain" role="tab" aria-selected="true"><span class="tab-dot"></span>TERRAIN</button>
            <button class="map-layer" data-tab="climate" role="tab" aria-selected="false"><span class="tab-dot"></span>ENVIRONMENT</button>
            <button class="map-layer" data-tab="sites" role="tab" aria-selected="false"><span class="tab-dot"></span>SURFACE ASSETS</button>
            <button class="map-layer" data-tab="route" role="tab" aria-selected="false"><span class="tab-dot"></span>ROUTE</button>
          </div>
          <div class="panel-foot">
            <span id="foot-lat">LAT 18.4446° N</span>
            <span id="foot-lon">LON 77.4509° E</span>
            <span id="foot-metric">⊕ ELEV -2,530M</span>
          </div>
          <div class="map-inspector" id="map-inspector" role="region" aria-live="polite"></div>
        </div>

        <div class="panel insight-panel reveal">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">02 / MISSION LOG</span>
              <h3>What we learned</h3>
            </div>
            <i data-lucide="book-open"></i>
          </div>
          <div class="nasa-photo-wrap">
            <img id="nasa-photo" alt="Mission imagery" />
            <span class="photo-status" id="photo-status">CONNECTING TO NASA</span>
          </div>
          <div class="insight-quote" id="mission-caption">“The safest path is rarely the most interesting one.”</div>
          <div class="insight-source">
            <div class="avatar" id="mission-avatar">PJ</div>
            <div>
              <strong id="mission-rover">Perseverance Rover</strong>
              <span id="mission-meta">Jezero Crater · Sol 1,284</span>
            </div>
          </div>
          <div class="bar-chart">
            <span style="height:38%"></span><span style="height:56%"></span><span style="height:44%"></span><span style="height:75%"></span><span style="height:64%"></span><span style="height:92%"></span><span style="height:70%"></span><span style="height:100%"></span>
          </div>
        </div>

        <div class="panel next-panel reveal">
          <div class="panel-head">
            <div>
              <span class="panel-kicker">03 / YOUR NEXT MOVE</span>
              <h3 id="next-move-title">Forge a route</h3>
            </div>
            <i data-lucide="route"></i>
          </div>
          <p id="next-move-desc">Choose a mission objective to reveal a scientific path through the terrain.</p>
          <div class="objective-buttons" id="objective-buttons"></div>
          <button class="primary-button" id="launch-route">Launch route planner <i data-lucide="arrow-up-right"></i></button>
          <div id="route-result" class="route-result" aria-live="polite"></div>
        </div>
      </div>

      <div class="hardware-atlas reveal">
        <div class="hardware-atlas-head">
          <div>
            <span class="panel-kicker">04 / HARDWARE ATLAS</span>
            <h3>What we leave behind</h3>
          </div>
          <p>Every machine is a chapter. Click any artifact to open its story, inspect its parts, and discover how it turned a distant world into data.</p>
        </div>

        <div class="hardware-filter-bar" id="hardware-filter-bar">
          <button class="filter-chip active" data-filter="ALL">ALL HARDWARE <span class="chip-count">(${fallbackHardware.length})</span></button>
          <button class="filter-chip" data-filter="MOON">MOON <span class="chip-count">(4)</span></button>
          <button class="filter-chip" data-filter="MARS">MARS <span class="chip-count">(6)</span></button>
          <button class="filter-chip" data-filter="DEEP SPACE">DEEP SPACE <span class="chip-count">(2)</span></button>
        </div>

        <div class="hardware-list" id="hardware-list"><span class="mission-loading"><span class="pulse"></span> LOADING HARDWARE REGISTRY</span></div>
      </div>
    </section>

    <section class="mission-detail scene-section" id="mission-detail" aria-live="polite"></section>
    <footer><span>FORGEPATH © 2026</span><span>AN OPEN ATLAS FOR A SHARED PLANET</span><a href="#landing">BACK TO TOP ↑</a></footer>
    <div class="image-modal" id="image-modal" role="dialog" aria-modal="true" aria-labelledby="image-modal-title">
      <button class="image-modal-close" id="image-modal-close" aria-label="Close image details">×</button>
      <div class="image-modal-content">
        <img id="image-modal-preview" alt="">
        <div class="image-modal-copy">
          <span class="panel-kicker">NASA IMAGE ARCHIVE</span>
          <h3 id="image-modal-title"></h3>
          <p id="image-modal-date"></p>
          <div id="image-modal-description"></div>
          <small id="image-modal-source">Official metadata from NASA’s Image and Video Library.</small>
        </div>
      </div>
    </div>
  </main>`;

renderIcons();

// --- 3D PROCEDURAL BACKGROUND SCENE ---
const canvas = document.querySelector('#world-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x120c0b, 0.012);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 500);
camera.position.set(0, 8, 26);
const group = new THREE.Group(); scene.add(group);

const hemiLight = new THREE.HemisphereLight(0x8b8b8b, 0x170806, 1.8);
scene.add(hemiLight);
const sun = new THREE.DirectionalLight(0xffd2a8, 3.5);
sun.position.set(-12, 20, 10);
scene.add(sun);

// Procedural Terrain Mesh
const terrainGeo = new THREE.PlaneGeometry(110, 90, 150, 120);
const pos = terrainGeo.attributes.position;
for (let i = 0; i < pos.count; i++) {
  const x = pos.getX(i), y = pos.getY(i);
  const crater = Math.exp(-((x + 10) ** 2 + (y - 8) ** 2) / 170) * -3;
  const ridge = Math.sin(x * .16) * .55 + Math.cos(y * .13) * .8;
  pos.setZ(i, ridge + crater + Math.sin(x * .5 + y * .3) * .18);
}
terrainGeo.computeVertexNormals();

const terrainMat = new THREE.MeshStandardMaterial({
  color: 0x713c2b,
  roughness: 1,
  metalness: 0,
  flatShading: true
});
const terrain = new THREE.Mesh(terrainGeo, terrainMat);
terrain.rotation.x = -Math.PI / 2;
terrain.position.y = -3;
group.add(terrain);

// Earth in Lunar Sky (Active during Moon mode)
const earthGroup = new THREE.Group();
const earthGeo = new THREE.SphereGeometry(2.4, 32, 24);
const earthMat = new THREE.MeshStandardMaterial({
  color: 0x1b60b2,
  roughness: 0.65,
  metalness: 0.1
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
const earthAtmosGeo = new THREE.SphereGeometry(2.48, 32, 24);
const earthAtmosMat = new THREE.MeshBasicMaterial({
  color: 0x68d5ff,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  side: THREE.BackSide
});
earthGroup.add(earthMesh, new THREE.Mesh(earthAtmosGeo, earthAtmosMat));
earthGroup.position.set(-26, 22, -45);
earthGroup.visible = false;
scene.add(earthGroup);

// Site Markers on 3D Surface
const siteGroup = new THREE.Group();
const siteObjects = [];
const missionSitesMars = [
  { name: 'PATHFINDER', sub: 'ARES VALLIS · 1997', x: -8, z: 8, color: 0xf2a27f },
  { name: 'CURIOSITY', sub: 'GALE CRATER · 2012', x: -1, z: -4, color: 0xd47752 },
  { name: 'PERSEVERANCE', sub: 'JEZERO CRATER · 2021', x: 8, z: 12, color: 0xf0643d }
];
const missionSitesMoon = [
  { name: 'APOLLO 11', sub: 'TRANQUILITY BASE · 1969', x: -8, z: 6, color: 0x58c6ff },
  { name: 'APOLLO 15', sub: 'HADLEY RILLE · 1971', x: 6, z: 10, color: 0x58c6ff },
  { name: 'APOLLO 17', sub: 'TAURUS-LITTROW · 1972', x: -2, z: -5, color: 0x58c6ff }
];
const missionSitesDeepSpace = [
  { name: 'VOYAGER 1', sub: 'INTERSTELLAR · 162.8 AU', x: 7, y: 3.5, z: 2, color: 0xc084fc },
  { name: 'PIONEER 10', sub: 'OUTER HELIOSPHERE · 135 AU', x: -8, y: 1.2, z: -5, color: 0xc084fc },
  { name: 'JAMES WEBB', sub: 'SUN-EARTH L2 · 1.5M KM', x: 8, y: 6.5, z: -8, color: 0x38bdf8 }
];

function populateTerrainSiteMarkers(sites) {
  while (siteGroup.children.length > 0) {
    siteGroup.remove(siteGroup.children[0]);
  }
  siteObjects.length = 0;
  const isDeepSpace = (currentWorld === 'deepspace');
  sites.forEach(site => {
    const marker = new THREE.Group();
    const posY = (isDeepSpace && site.y !== undefined) ? site.y : -1.8;
    marker.position.set(site.x, posY, site.z);

    if (isDeepSpace) {
      // Floating interstellar probe beacon with dual orbital gimbal rings
      const material = new THREE.MeshBasicMaterial({ color: site.color, transparent: true, opacity: .95 });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 16), material);
      const ringOuter = new THREE.Mesh(
        new THREE.RingGeometry(.52, .59, 32),
        new THREE.MeshBasicMaterial({ color: site.color, side: THREE.DoubleSide, transparent: true, opacity: .75 })
      );
      ringOuter.rotation.x = Math.PI / 4;
      const ringInner = new THREE.Mesh(
        new THREE.RingGeometry(.34, .39, 32),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: .65 })
      );
      ringInner.rotation.y = Math.PI / 3;
      marker.add(beacon, ringOuter, ringInner);
      siteGroup.add(marker);
      siteObjects.push({ marker, site, ring: ringOuter, ringInner });
    } else {
      const material = new THREE.MeshBasicMaterial({ color: site.color, transparent: true, opacity: .9 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.4, 8), material);
      stem.position.y = .7;
      const ring = new THREE.Mesh(new THREE.RingGeometry(.25, .29, 32), new THREE.MeshBasicMaterial({ color: site.color, side: THREE.DoubleSide, transparent: true, opacity: .75 }));
      ring.rotation.x = -Math.PI / 2;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 12), material);
      beacon.position.y = 1.42;
      marker.add(stem, ring, beacon);
      siteGroup.add(marker);
      siteObjects.push({ marker, site, ring });
    }
  });
}
populateTerrainSiteMarkers(missionSitesMars);
group.add(siteGroup);

// Regolith / Planetary surface rocks
const rocks = new THREE.Group();
for (let i = 0; i < 90; i++) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(Math.random() * .22 + .08, 0),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.045, .48, .16 + Math.random() * .1), roughness: 1 })
  );
  rock.position.set((Math.random() - .5) * 65, -2.5 + Math.random() * .3, (Math.random() - .5) * 45);
  rock.scale.y = Math.random() * 2 + .4;
  rocks.add(rock);
}
group.add(rocks);

// Starfield
const stars = new THREE.Points(
  new THREE.BufferGeometry(),
  new THREE.PointsMaterial({ color: 0xffd9c3, size: .08, transparent: true, opacity: .65 })
);
const starPos = [];
for (let i = 0; i < 750; i++) {
  starPos.push((Math.random() - .5) * 180, Math.random() * 75 + 5, (Math.random() - .5) * 120 - 35);
}
stars.geometry.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
scene.add(stars);

// ==========================================
// --- DEEP SPACE GALACTIC THEME SUITE ---
// Includes: Volumetric Nebulas, Stardust streams,
// 3D craggy tumbling Asteroid Field
// ==========================================
const deepSpaceGroup = new THREE.Group();
deepSpaceGroup.visible = false;
scene.add(deepSpaceGroup);

// 1. Procedural Nebula Texture Generator
function createNebulaTexture(type) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const cx = 256, cy = 256;
  const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, 245);

  if (type === 'magenta') {
    grad.addColorStop(0, 'rgba(236, 72, 153, 0.75)');
    grad.addColorStop(0.24, 'rgba(192, 132, 252, 0.46)');
    grad.addColorStop(0.55, 'rgba(126, 34, 206, 0.22)');
    grad.addColorStop(0.85, 'rgba(88, 28, 135, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (type === 'cyan') {
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.72)');
    grad.addColorStop(0.26, 'rgba(6, 182, 212, 0.44)');
    grad.addColorStop(0.56, 'rgba(30, 58, 138, 0.20)');
    grad.addColorStop(0.86, 'rgba(15, 23, 42, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    // gold / stellar core
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.78)');
    grad.addColorStop(0.22, 'rgba(245, 158, 11, 0.45)');
    grad.addColorStop(0.52, 'rgba(180, 83, 9, 0.20)');
    grad.addColorStop(0.82, 'rgba(120, 53, 15, 0.06)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Soft cloudy puffs for organic Hubble/JWST aesthetic
  for (let p = 0; p < 36; p++) {
    const px = cx + (Math.random() - 0.5) * 220;
    const py = cy + (Math.random() - 0.5) * 220;
    const pr = Math.random() * 85 + 30;
    const pGrad = ctx.createRadialGradient(px, py, 2, px, py, pr);
    if (type === 'magenta') {
      pGrad.addColorStop(0, 'rgba(217, 70, 239, 0.18)');
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else if (type === 'cyan') {
      pGrad.addColorStop(0, 'rgba(103, 232, 249, 0.16)');
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      pGrad.addColorStop(0, 'rgba(253, 224, 71, 0.18)');
      pGrad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = true;
  return tex;
}

const nebulaTexMagenta = createNebulaTexture('magenta');
const nebulaTexCyan = createNebulaTexture('cyan');
const nebulaTexGold = createNebulaTexture('gold');

const nebulaMaterials = [
  new THREE.MeshBasicMaterial({ map: nebulaTexMagenta, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  new THREE.MeshBasicMaterial({ map: nebulaTexCyan, transparent: true, opacity: 0.50, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  new THREE.MeshBasicMaterial({ map: nebulaTexGold, transparent: true, opacity: 0.40, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
];

const nebulaGroup = new THREE.Group();
const nebulaClouds = [];
const nebulaConfigs = [
  { matIdx: 0, x: -28, y: 14, z: -48, size: 48, rot: 0.4 },
  { matIdx: 0, x: -15, y: -4, z: -35, size: 36, rot: 1.2 },
  { matIdx: 1, x: 26, y: 18, z: -55, size: 52, rot: 2.1 },
  { matIdx: 1, x: 38, y: -8, z: -40, size: 42, rot: 0.8 },
  { matIdx: 2, x: 4, y: 22, z: -62, size: 45, rot: 1.7 },
  { matIdx: 0, x: -42, y: 28, z: -70, size: 58, rot: 2.8 },
  { matIdx: 1, x: -8, y: 8, z: -28, size: 28, rot: 0.2 },
  { matIdx: 2, x: 18, y: 6, z: -38, size: 34, rot: 1.5 },
  { matIdx: 0, x: 45, y: 24, z: -68, size: 54, rot: 3.1 },
  { matIdx: 1, x: -35, y: -12, z: -45, size: 38, rot: 0.9 },
  { matIdx: 2, x: -12, y: 32, z: -58, size: 40, rot: 2.3 },
  { matIdx: 0, x: 2, y: -14, z: -32, size: 32, rot: 1.1 },
  { matIdx: 1, x: -50, y: 5, z: -65, size: 46, rot: 0.5 },
  { matIdx: 2, x: 32, y: 30, z: -60, size: 38, rot: 1.9 },
  { matIdx: 0, x: -20, y: 20, z: -42, size: 35, rot: 2.6 },
  { matIdx: 1, x: 12, y: -18, z: -50, size: 44, rot: 0.7 },
  { matIdx: 2, x: -4, y: -2, z: -24, size: 26, rot: 1.4 },
  { matIdx: 0, x: 22, y: -2, z: -30, size: 30, rot: 2.0 }
];

nebulaConfigs.forEach((cfg, idx) => {
  const geo = new THREE.PlaneGeometry(cfg.size, cfg.size);
  const mesh = new THREE.Mesh(geo, nebulaMaterials[cfg.matIdx]);
  mesh.position.set(cfg.x, cfg.y, cfg.z);
  mesh.rotation.z = cfg.rot;
  nebulaGroup.add(mesh);
  nebulaClouds.push({
    mesh,
    baseScale: 1.0,
    rotSpeed: (idx % 2 === 0 ? 1 : -1) * (0.0002 + (idx % 5) * 0.0001),
    pulseSpeed: 0.4 + (idx % 4) * 0.15,
    pulseOffset: idx * 0.8
  });
});
deepSpaceGroup.add(nebulaGroup);

// 2. High-Density Swirling Stardust Particle Stream (4,500 particles)
const stardustCount = 4500;
const stardustGeo = new THREE.BufferGeometry();
const stardustPositions = new Float32Array(stardustCount * 3);
const stardustColors = new Float32Array(stardustCount * 3);

const dustPalette = [
  new THREE.Color(0xffffff), // diamond white
  new THREE.Color(0xa5f3fc), // ice cyan
  new THREE.Color(0x38bdf8), // electric blue
  new THREE.Color(0xc084fc), // radiant lavender
  new THREE.Color(0xe879f9), // cosmic orchid
  new THREE.Color(0xfef08a)  // stardust gold
];

for (let i = 0; i < stardustCount; i++) {
  const i3 = i * 3;
  const radius = 8 + Math.pow(Math.random(), 1.6) * 130;
  const branchAngle = ((i % 4) * (Math.PI * 2) / 4);
  const spinAngle = radius * 0.035;
  const randomX = (Math.random() - 0.5) * (radius * 0.45);
  const randomY = (Math.random() - 0.5) * (18 + radius * 0.18);
  const randomZ = (Math.random() - 0.5) * (radius * 0.45);

  stardustPositions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
  stardustPositions[i3 + 1] = randomY;
  stardustPositions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius - 25 + randomZ;

  const colChoice = Math.random() < 0.35 
    ? dustPalette[Math.floor(Math.random() * 3)] 
    : dustPalette[Math.floor(Math.random() * dustPalette.length)];
  stardustColors[i3] = colChoice.r;
  stardustColors[i3 + 1] = colChoice.g;
  stardustColors[i3 + 2] = colChoice.b;
}

stardustGeo.setAttribute('position', new THREE.BufferAttribute(stardustPositions, 3));
stardustGeo.setAttribute('color', new THREE.BufferAttribute(stardustColors, 3));

const stardustMat = new THREE.PointsMaterial({
  size: 0.22,
  vertexColors: true,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const stardustSystem = new THREE.Points(stardustGeo, stardustMat);
stardustSystem.rotation.x = 0.35;
deepSpaceGroup.add(stardustSystem);

// 3. 3D Craggy Tumbling Asteroid Field (52 Procedural Asteroids)
const asteroidGroup = new THREE.Group();
const asteroidObjects = [];

for (let a = 0; a < 52; a++) {
  const radius = Math.random() < 0.25 
    ? Math.random() * 1.4 + 1.1   // Major asteroids
    : Math.random() * 0.65 + 0.28; // Minor drifting asteroids

  const astGeo = new THREE.DodecahedronGeometry(radius, 1);
  const astPos = astGeo.attributes.position;
  
  // Procedural jagged crater & facet noise displacement
  for (let v = 0; v < astPos.count; v++) {
    const vx = astPos.getX(v);
    const vy = astPos.getY(v);
    const vz = astPos.getZ(v);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const noise = (Math.sin(vx * 3.8) * Math.cos(vy * 3.2) * Math.sin(vz * 3.5)) * 0.35;
    const factor = (1 + noise * 0.6 + (Math.random() - 0.5) * 0.18);
    astPos.setXYZ(v, (vx / len) * radius * factor, (vy / len) * radius * factor, (vz / len) * radius * factor);
  }
  astGeo.computeVertexNormals();

  const baseShade = 0.12 + Math.random() * 0.12;
  const astMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.72 + (Math.random() - 0.5) * 0.15, 0.22, baseShade),
    roughness: 0.90,
    metalness: 0.20,
    flatShading: true
  });

  const astMesh = new THREE.Mesh(astGeo, astMat);
  const posX = (Math.random() - 0.5) * 95;
  const posY = (Math.random() - 0.5) * 45 + 5;
  const posZ = (Math.random() - 0.5) * 60 - 10;
  astMesh.position.set(posX, posY, posZ);
  astMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

  asteroidGroup.add(astMesh);
  asteroidObjects.push({
    mesh: astMesh,
    rx: (Math.random() - 0.5) * 0.016,
    ry: (Math.random() - 0.5) * 0.022,
    rz: (Math.random() - 0.5) * 0.014,
    vx: (Math.random() - 0.5) * 0.012,
    vy: (Math.random() - 0.5) * 0.008,
    vz: (Math.random() - 0.5) * 0.010
  });
}
deepSpaceGroup.add(asteroidGroup);

// Camera targets per section
const SECTION_TARGETS = {
  landing: { camera: new THREE.Vector3(0, 7.5, 26), look: new THREE.Vector3(0, -2, -12) },
  story: { camera: new THREE.Vector3(4.8, 5.0, 20), look: new THREE.Vector3(-1.2, -1.8, 1) },
  dashboard: { camera: new THREE.Vector3(-6.5, 3.8, 18), look: new THREE.Vector3(1.2, -1.6, -1) },
  'mission-detail': { camera: new THREE.Vector3(2, 2.8, 14), look: new THREE.Vector3(0, -1.5, -4) }
};

const targetCamera = new THREE.Vector3(0, 7.5, 26);
const targetLook = new THREE.Vector3(0, -2, -12);
const currentLook = new THREE.Vector3(0, -2, -12);
let currentSection = 'landing';
let activeSiteName = null;
let mouseX = 0;
let mouseY = 0;
let clock = new THREE.Clock();

window.addEventListener('pointermove', event => {
  mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
});

function animateScene() {
  requestAnimationFrame(animateScene);
  const delta = Math.min(clock.getDelta(), 0.08);
  const t = clock.getElapsedTime();
  const factor = 1 - Math.exp(-3.5 * delta);

  const hoverY = Math.sin(t * 0.45) * 0.16;
  const parallaxX = mouseX * 0.7;
  const parallaxY = -mouseY * 0.4;

  camera.position.x += (targetCamera.x + parallaxX - camera.position.x) * factor;
  camera.position.y += (targetCamera.y + hoverY + parallaxY - camera.position.y) * factor;
  camera.position.z += (targetCamera.z - camera.position.z) * factor;

  currentLook.lerp(targetLook, factor);
  camera.lookAt(currentLook);

  group.rotation.y = Math.sin(t * 0.04) * 0.035;
  stars.rotation.y = t * 0.002;
  if (earthGroup.visible) {
    earthGroup.rotation.y = t * 0.02;
  }

  // Deep Space galactic animations
  if (deepSpaceGroup.visible) {
    stardustSystem.rotation.y = t * 0.001;
    stardustSystem.rotation.z = Math.sin(t * 0.02) * 0.01;
    nebulaGroup.rotation.z = Math.sin(t * 0.015) * 0.012;

    nebulaClouds.forEach(cloud => {
      cloud.mesh.rotation.z += cloud.rotSpeed;
      const s = cloud.baseScale * (1 + Math.sin(t * cloud.pulseSpeed + cloud.pulseOffset) * 0.045);
      cloud.mesh.scale.set(s, s, s);
    });

    asteroidObjects.forEach(ast => {
      ast.mesh.rotation.x += ast.rx;
      ast.mesh.rotation.y += ast.ry;
      ast.mesh.rotation.z += ast.rz;
      ast.mesh.position.x += ast.vx;
      ast.mesh.position.y += ast.vy;
      ast.mesh.position.z += ast.vz;

      // Spatial boundary wrap
      if (ast.mesh.position.x > 55) ast.mesh.position.x = -55;
      else if (ast.mesh.position.x < -55) ast.mesh.position.x = 55;
      if (ast.mesh.position.y > 32) ast.mesh.position.y = -22;
      else if (ast.mesh.position.y < -22) ast.mesh.position.y = 32;
      if (ast.mesh.position.z > 25) ast.mesh.position.z = -50;
      else if (ast.mesh.position.z < -50) ast.mesh.position.z = 25;
    });
  }

  siteObjects.forEach(({ ring, ringInner, marker, site }, idx) => {
    const isTarget = activeSiteName && site.name.includes(activeSiteName);
    const targetScale = isTarget ? 1.45 : 1.0;
    marker.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), factor * 1.5);
    ring.scale.setScalar(targetScale * (1 + Math.sin(t * 2.6 + idx * 1.2) * 0.14));
    if (ringInner) {
      ringInner.rotation.z += 0.018;
      ringInner.rotation.x += 0.012;
    }
  });

  renderer.render(scene, camera);
}
animateScene();

// Intersection Observer for scroll reveal
const sections = [...document.querySelectorAll('.scene-section')];
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.reveal').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 80));
      const id = entry.target.id;
      if (SECTION_TARGETS[id]) {
        currentSection = id;
        if (!activeSiteName) {
          targetCamera.copy(SECTION_TARGETS[id].camera);
          targetLook.copy(SECTION_TARGETS[id].look);
        }
      }
    }
  });
}, { threshold: 0.22 });
sections.forEach(s => observer.observe(s));
// Ensure hero copy is immediately visible on initial load
document.querySelectorAll('#landing .reveal').forEach(el => el.classList.add('visible'));

// --- TELEMETRY MODELS: MARS, MOON, DEEP SPACE ---
let activeInspectorTab = 'terrain';
let activeSiteId = 'perseverance';

const realTerrain = {
  region: 'Jezero Crater Paleolake & Delta System',
  kicker: '01 / TERRAIN ANALYSIS // MOLA & HIRISE STEREO DTM',
  badge: 'MOLA -2,530M DATUM',
  elevation: '-2,530 m',
  elevationSub: 'Floor to Rim: +610m',
  slopeMean: '3.2° MEAN',
  slopeSub: 'Max scarp grade 14.8°',
  roughness: '0.24',
  roughnessSub: 'Hagfors radar scale',
  traversability: 'CLASS A-',
  traversabilitySub: 'High wheel traction',
  sinkage: '2.4 cm',
  sinkageSub: 'Basaltic regolith',
  formation: 'Séítah / Delta Front',
  formationSub: 'Noachian-Hesperian (~3.7 Ga)',
  desc: 'Jezero Crater preserves an ancient river-delta system rich in clay minerals (Fe/Mg-smectites) and carbonates that precipitated from standing water. These fine-grained lacustrine mudstones provide the highest preservation potential for ancient microbial biosignatures on Mars.',
  meta: 'Orbital Sensors: Mars Global Surveyor MOLA altimeter · Mars Reconnaissance Orbiter HiRISE (25 cm/pixel stereo DEM) · CRISM hyperspectral spectrometer.'
};

const moonTerrain = {
  region: 'Hadley-Apennine Sinuous Rille Complex',
  kicker: '01 / LUNAR TOPOGRAPHY // LOLA & LROC STEREO DEM',
  badge: 'LOLA -1,600M DATUM',
  elevation: '-1,600 m',
  elevationSub: 'Valley floor to Apennine peaks: +4,500m',
  slopeMean: '6.4° MEAN',
  slopeSub: 'Max rille scarp grade 28°',
  roughness: '0.32',
  roughnessSub: 'Sub-millimeter anorthositic glass',
  traversability: 'CLASS B+',
  traversabilitySub: 'Low gravity (1/6g) traction limit',
  sinkage: '5.2 cm',
  sinkageSub: 'Cohesionless regolith dust',
  formation: 'Mare Imbrium Basalt / Genesis Anorthosite',
  formationSub: 'Pre-Nectarian / Imbrian (~4.1 Ga)',
  desc: 'Hadley Rille is a massive collapsed volcanic lava tube 1.2 km wide and 300 meters deep. Apollo 15 explored the edge of this chasm and ascended Mount Hadley Delta to collect the ancient "Genesis Rock", confirming the magma ocean origin of the Moon’s primordial crust.',
  meta: 'Orbital Sensors: Lunar Reconnaissance Orbiter LOLA Laser Altimeter · LROC Narrow Angle Camera (0.5 m/px) · Clementine multispectral imaging.'
};

const deepspaceTerrain = {
  region: 'Interstellar Plasma Boundary & Heliopause',
  kicker: '01 / ASTROPHYSICAL MEDIUM // VOYAGER 1 TELEMETRY',
  badge: '162.8 AU FROM SUN',
  elevation: '24.35B km',
  elevationSub: 'Distance from Earth (22.5 light-hours)',
  slopeMean: '0.0° GRAV',
  slopeSub: 'Galactic cosmic ray field',
  roughness: '0.08 /cm³',
  roughnessSub: 'Interstellar electron density',
  traversability: 'INTERSTELLAR',
  traversabilitySub: 'Hyperbolic escape velocity: 16.9 km/s',
  sinkage: '0.0 cm',
  sinkageSub: 'Interstellar magnetic field: 0.48 nT',
  formation: 'Local Interstellar Cloud (LIC)',
  formationSub: 'Ophiuchus constellation heading',
  desc: 'Voyager 1 crossed the heliopause into true interstellar space on August 25, 2012. Its Plasma Wave Subsystem detected an unmistakable 40-fold jump in electron density as the probe left the bubble of the solar wind and entered cold interstellar galactic plasma.',
  meta: 'Sensors: Voyager 1 Magnetometer · Cosmic Ray Subsystem · Low-Energy Charged Particle instrument · Deep Space Network 70m radio antennas.'
};

const realClimate = {
  station: 'MEDA Atmospheric Station // Sol 1284',
  kicker: '02 / CLIMATE TELEMETRY // PERSEVERANCE SENSOR SUITE',
  badge: 'MEDA SENSORS NOMINAL',
  airTemp: '-63°C',
  airTempSub: 'Range: -88.4°C to -14.2°C',
  groundTemp: '-48°C',
  groundTempSub: 'TIRS infrared thermopile',
  pressure: '720 Pa',
  pressureSub: '7.20 mbar (0.0071 atm)',
  wind: '4.8 m/s NW',
  windSub: 'Direction: 312° heading',
  gust: '18.2 m/s',
  gustSub: 'Thermal convective vortex',
  dustTau: '0.18',
  dustTauSub: 'Clear sky optical depth',
  humidity: '3.2%',
  humiditySub: 'Nighttime frost potential',
  solarFlux: '584 W/m²',
  solarFluxSub: 'Broadband UV irradiance',
  density: '0.0154 kg/m³',
  densitySub: '~1.2% Earth sea-level',
  desc: 'Surface measurements from the Mars Environmental Dynamics Analyzer (MEDA). Jezero Crater experiences significant diurnal thermal cycling of 74°C between sol noon and pre-dawn. Atmospheric pressure oscillates cyclically as seasonal polar CO₂ ice caps freeze and sublime.',
  gases: [
    { name: 'CO₂', val: '95.32%' },
    { name: 'N₂', val: '2.60%' },
    { name: 'Ar', val: '1.90%' },
    { name: 'O₂', val: '0.16%' },
    { name: 'CO', val: '0.08%' }
  ],
  meta: 'Telemetry source: Mars Environmental Dynamics Analyzer (MEDA) sensors mounted on rover mast and deck. Acoustic propagation speed: 240 m/s.'
};

const moonClimate = {
  station: 'ALSEP Central Station // Apollo 15 ALSEP Suite',
  kicker: '02 / VACUUM & THERMAL // APOLLO LUNAR EXPERIMENTS',
  badge: 'HARD VACUUM: 10⁻¹⁰ PA',
  airTemp: '+118°C',
  airTempSub: 'Sub-solar lunar noon maximum',
  groundTemp: '-130°C',
  groundTempSub: 'Deep lunar night (polar shade: -246°C)',
  pressure: '< 10⁻¹⁰ Pa',
  pressureSub: '3 × 10⁵ molecules/cm³ (Hard vacuum)',
  wind: '0.0 m/s (None)',
  windSub: 'Zero aerodynamic atmosphere',
  gust: 'SOLAR WIND',
  gustSub: '3.8 × 10⁸ protons/cm²/s',
  dustTau: '0.00',
  dustTauSub: 'Photoelectric dust levitation: +12V',
  humidity: '0.0%',
  humiditySub: 'Permanently shadowed polar ice traps',
  solarFlux: '1,361 W/m²',
  solarFluxSub: 'Unattenuated 1 AU solar constant',
  density: '10⁻¹² kg/m³',
  densitySub: 'Exosphere ballistic collisions',
  desc: 'The lunar surface experiences extreme 250°C thermal swings over a 29.5-day synodic cycle. With no atmosphere to scatter light or retain heat, shadow edges drop hundreds of degrees instantly. Solar ultraviolet radiation charges fine surface dust to +12 volts, causing electrostatic levitation along the terminator.',
  gases: [
    { name: 'Ar-40', val: '40,000 /cm³' },
    { name: 'He-4', val: '2,000 /cm³' },
    { name: 'Ne-20', val: '1,000 /cm³' },
    { name: 'H₂', val: 'trace' }
  ],
  meta: 'Telemetry source: Apollo Lunar Surface Experiments Package (ALSEP) suprathermal ion detector & solar wind spectrometer.'
};

const deepspaceClimate = {
  station: 'Voyager 1 Instruments // Interstellar Space',
  kicker: '02 / INTERSTELLAR ENVIRONMENT // DSN TELEMETRY',
  badge: 'BEYOND THE HELIOSPHERE',
  airTemp: '3 K (-270°C)',
  airTempSub: 'Cosmic microwave background datum',
  groundTemp: '28 K',
  groundTempSub: 'Spacecraft RTG internal bus warmth',
  pressure: '10⁻¹⁷ Pa',
  pressureSub: 'True interstellar vacuum',
  wind: '16.9 km/s',
  windSub: 'Spacecraft heliocentric velocity',
  gust: 'GALACTIC RAYS',
  gustSub: 'Dramatic jump in high-energy cosmic ions',
  dustTau: '0.00',
  dustTauSub: 'Interstellar neutral hydrogen flow',
  humidity: '0.0%',
  humiditySub: 'Zero water vapor',
  solarFlux: '0.05 W/m²',
  solarFluxSub: 'Sun appears as a brilliant magnitude -16 star',
  density: '0.08 /cm³',
  densitySub: 'Cold interstellar ionized plasma',
  desc: 'Voyager 1 cruises 162 astronomical units from the Sun through the interstellar medium. The solar wind can no longer reach this zone; instead, the probe is bathed in undisturbed galactic cosmic radiation and cold, dense interstellar hydrogen and helium plasma.',
  gases: [
    { name: 'H⁺', val: '90%' },
    { name: 'He⁺', val: '10%' },
    { name: 'Electrons', val: '0.08 /cm³' }
  ],
  meta: 'Telemetry source: Voyager 1 Magnetometer & Plasma Wave Subsystem tracked via NASA Deep Space Network Goldstone and Canberra antennas.'
};

const realSites = [
  { id: 'perseverance', name: 'Perseverance', mission: 'Mars 2020', lat: 18.4446, lon: 77.4509, elevation: '-2,530 m', year: 2021, status: 'ACTIVE', distKm: '0.0 km', site: 'Jezero Crater', science: 'Caching 24 sealed rock core samples in titanium tubes; testing MOXIE oxygen generation and searching for ancient biosignatures.' },
  { id: 'curiosity', name: 'Curiosity', mission: 'Mars Science Lab', lat: -4.5895, lon: 137.4417, elevation: '-4,400 m', year: 2012, status: 'ACTIVE', distKm: '3,752 km', site: 'Gale Crater / Mt. Sharp', science: 'Proved ancient lake habitability; detected complex organic molecules and persistent atmospheric methane cycles.' },
  { id: 'insight', name: 'InSight', mission: 'Interior Exploration', lat: 4.5024, lon: 135.6234, elevation: '-2,613 m', year: 2018, status: 'SILENT (SOL 1440)', distKm: '3,620 km', site: 'Elysium Planitia', science: 'SEIS detected 1,319 marsquakes and mapped crustal thickness, mantle layering, and liquid metallic core radius.' },
  { id: 'pathfinder', name: 'Pathfinder / Sojourner', mission: 'Mars Pathfinder', lat: 19.1300, lon: -33.2200, elevation: '-3,680 m', year: 1997, status: 'SILENT', distKm: '6,520 km', site: 'Ares Vallis', science: 'First wheeled rover mobile exploration on another planetary body; tested airbag impact attenuation dynamics.' },
  { id: 'opportunity', name: 'Opportunity', mission: 'Mars Exploration Rover', lat: -1.9483, lon: -5.5258, elevation: '-1,387 m', year: 2004, status: 'SILENT (SOL 5111)', distKm: '4,890 km', site: 'Meridiani Planum', science: 'Traversed 45.16 km (marathon distance); discovered hematite spherules (blueberries) confirming liquid water history.' },
  { id: 'spirit', name: 'Spirit', mission: 'Mars Exploration Rover', lat: -14.5684, lon: 175.4726, elevation: '-1,940 m', year: 2004, status: 'SILENT (SOL 2210)', distKm: '5,980 km', site: 'Gusev Crater', science: 'Discovered hydrothermal opaline silica deposits formed in ancient volcanic hot springs; 7.73 km traverse.' }
];

const moonSites = [
  { id: 'apollo15', name: 'Apollo 15 (Falcon & LRV)', mission: 'Apollo 15', lat: 26.13, lon: 3.63, elevation: '-1,600 m', year: 1971, status: 'RETIRED (LRV PARKED)', distKm: '0.0 km', site: 'Hadley-Apennine', science: 'First Lunar Roving Vehicle deployment; traversed 27.9 km and retrieved the 4.1 Ga Genesis Rock (anorthosite sample 15415).' },
  { id: 'apollo11', name: 'Apollo 11 (Eagle)', mission: 'Apollo 11', lat: 0.67, lon: 23.47, elevation: '-1,300 m', year: 1969, status: 'RETIRED (DESCENT STAGE)', distKm: '980 km', site: 'Mare Tranquillitatis', science: 'First human landing; installed the Laser Ranging Retroreflector (LRRR) that still measures Earth-Moon distance today.' },
  { id: 'apollo17', name: 'Apollo 17 (Challenger & LRV)', mission: 'Apollo 17', lat: 20.19, lon: 30.77, elevation: '-2,100 m', year: 1972, status: 'RETIRED (LRV PARKED)', distKm: '850 km', site: 'Taurus-Littrow', science: 'Final Apollo surface mission; discovered orange volcanic glass beads and returned 110 kg of pristine lunar samples.' },
  { id: 'surveyor3', name: 'Surveyor 3', mission: 'Surveyor', lat: -3.01, lon: 336.58, elevation: '-1,400 m', year: 1967, status: 'RETIRED', distKm: '1,240 km', site: 'Oceanus Procellarum', science: 'Soft lunar landing; scoop tested soil mechanics; visited 2.5 years later by Apollo 12 astronauts Pete Conrad and Alan Bean.' },
  { id: 'lunokhod1', name: 'Lunokhod 1 (Luna 17)', mission: 'Luna 17', lat: 38.33, lon: 324.97, elevation: '-1,800 m', year: 1970, status: 'RETIRED', distKm: '1,120 km', site: 'Mare Imbrium', science: 'First remote-controlled robotic planetary rover; traversed 10.5 km and returned over 20,000 television images.' },
  { id: 'change4', name: 'Chang\'e 4 (Yutu-2)', mission: 'Chang\'e 4', lat: -45.46, lon: 177.60, elevation: '-5,900 m', year: 2019, status: 'ACTIVE', distKm: '5,200 km', site: 'Von Kármán Crater (Far Side)', science: 'First soft landing on the hidden lunar far side; ground-penetrating radar probed deep regolith layers down to 40 meters.' },
  { id: 'chandrayaan3', name: 'Chandrayaan-3 (Pragyan)', mission: 'Chandrayaan-3', lat: -69.37, lon: 32.35, elevation: '-4,100 m', year: 2023, status: 'RETIRED', distKm: '3,400 km', site: 'Shiv Shakti Point (South Pole)', science: 'First successful landing in the lunar high-latitude South Pole region; APXS and LIBS spectroscopes detected elemental sulfur.' }
];

const deepspaceSites = [
  { id: 'voyager-1', name: 'Voyager 1', mission: 'Voyager Interstellar', lat: 12.4, lon: 260.5, elevation: '24.35B km', year: 1977, status: 'INTERSTELLAR (162.8 AU)', distKm: '24.3B km', site: 'Beyond Heliopause', science: 'Measuring interstellar magnetic fields and galactic cosmic rays; carries Golden Record with sounds of Earth.' },
  { id: 'voyager-2', name: 'Voyager 2', mission: 'Voyager Interstellar', lat: -56.2, lon: 310.2, elevation: '20.30B km', year: 1977, status: 'INTERSTELLAR (136.1 AU)', distKm: '20.3B km', site: 'Southern Heliopause', science: 'Only spacecraft to visit both Uranus and Neptune; confirmed heliopause boundary in southern celestial hemisphere.' },
  { id: 'newhorizons', name: 'New Horizons', mission: 'New Frontiers', lat: -2.3, lon: 295.4, elevation: '8.80B km', year: 2006, status: 'KUIPER BELT (58.5 AU)', distKm: '8.8B km', site: 'Kuiper Belt Outer Fringe', science: 'First high-resolution images of Pluto, Charon, and contact binary Arrokoth (2014 MU69).' },
  { id: 'pioneer10', name: 'Pioneer 10', mission: 'Pioneer', lat: 26.0, lon: 80.1, elevation: '20.20B km', year: 1972, status: 'SILENT (135.0 AU)', distKm: '20.2B km', site: 'Taurus Constellation Vector', science: 'First craft past asteroid belt and Jupiter; carries the iconic Pioneer gold-anodized aluminum plaque.' },
  { id: 'jameswebb', name: 'James Webb Space Telescope', mission: 'JWST', lat: 0.0, lon: 0.0, elevation: '1.50M km', year: 2021, status: 'ACTIVE (SUN-EARTH L2)', distKm: '1.5M km', site: 'Lagrange Point 2 Halo', science: 'Infrared exploration of cosmic dawn, redshift z > 10 galaxies, and atmospheric transmission spectroscopy of exoplanets.' }
];

const realRoute = {
  kicker: '04 / AUTONAV TRAVERSE // MARSWALK CAMPAIGN',
  badge: 'AUTONAV ACTIVE',
  distance: '3.40 KM',
  duration: '5–8 SOLS',
  slip: '6.2%',
  slipSub: 'Auto-cutout at 20%',
  tiltMax: '8.4°',
  tiltSub: 'Vehicle limit 25°',
  clearance: '35 cm',
  clearanceSub: 'Rocker-bogie chassis',
  power: '860 Wh/sol',
  powerSub: 'MMRTG trickle charge',
  waypoints: [
    { label: 'WP-01 BASE', name: 'Octavia E. Butler Landing', lat: 18.4446, lon: 77.4509, elev: '-2,530 m', dist: '0.00 km', note: 'Flat, low-hazard basaltic regolith corridor. Touchdown staging site and initial optical calibration.' },
    { label: 'WP-02 DELTA', name: 'Kodiak Butte / Séítah Outcrop', lat: 18.4512, lon: 77.4731, elev: '-2,512 m', dist: '1.42 km', note: 'Cross-bedded deltaic sandstone. Rock abrasion with SuperCam & PIXL to confirm ancient river flow.' },
    { label: 'WP-03 SAMPLE', name: 'Neretva Delta Front Target', lat: 18.4690, lon: 77.4890, elev: '-2,490 m', dist: '3.40 km', note: 'Fine-grained mudstone target; prime biosignature retention. Hermetically sealed titanium core sample.' }
  ],
  desc: 'Autonomous visual odometry (AutoNav) evaluates stereo Hazcam 3D disparity maps every 1.5 seconds. The path optimizes science yield along the ancient delta while keeping wheel sinkage under 3 cm and avoiding boulders exceeding 30 cm.'
};

const moonRoute = {
  kicker: '04 / LUNAR ROVING VEHICLE // EVA-2 TRAVERSE PLAN',
  badge: 'APOLLO 15 LRV-1 NOMINAL',
  distance: '12.50 KM',
  duration: '6.5 HOURS',
  slip: '11.8%',
  slipSub: 'Slope ascent cut-off 25%',
  tiltMax: '18.0°',
  tiltSub: 'Vehicle static rollover 45°',
  clearance: '35 cm',
  clearanceSub: 'Wire mesh chevron wheels',
  power: '2.4 kWh total',
  powerSub: '36V DC Silver-Zinc batteries',
  waypoints: [
    { label: 'WP-01 BASE', name: 'Falcon LM Touchdown Stage', lat: 26.1322, lon: 3.6339, elev: '-1,600 m', dist: '0.00 km', note: 'Hadley basaltic regolith plain staging area and ALSEP deployment station.' },
    { label: 'WP-02 RILLE', name: 'Hadley Rille Station 9 Overlook', lat: 26.1450, lon: 3.6120, elev: '-1,580 m', dist: '3.20 km', note: '1.2 km wide collapsed volcanic chasm edge. Photographed exposed basalt strata on far wall.' },
    { label: 'WP-03 GENESIS', name: 'Mount Hadley Delta (Station 7)', lat: 26.0980, lon: 3.6580, elev: '-1,420 m', dist: '7.80 km', note: 'Ascended Apennine front to retrieve Genesis Rock (sample 15415), 4.1 Ga anorthosite.' },
    { label: 'WP-04 RETURN', name: 'Falcon LM Staging & Parking Site', lat: 26.1322, lon: 3.6339, elev: '-1,600 m', dist: '12.50 km', note: 'Parked LRV 100 meters away with high-gain color TV camera pointing back at LM lift-off.' }
  ],
  desc: 'Apollo 15 astronauts David Scott and James Irwin drove the first wheeled rover across the Moon. The wire mesh wheels with titanium chevrons maintained traction across loose regolith, enabling humanity’s first long-range expedition on another celestial body.'
};

const deepspaceRoute = {
  kicker: '04 / INTERSTELLAR FLIGHT VECTOR // HELIOPAUSE ESCAPE',
  badge: 'HYPERBOLIC TRAJECTORY',
  distance: '24.35B KM',
  duration: '47 YEARS',
  slip: '0.0%',
  slipSub: 'Ballistic celestial mechanics',
  tiltMax: '0.0°',
  tiltSub: '3-axis stabilized via Canopus sensor',
  clearance: 'INFINITE',
  clearanceSub: 'Interstellar galactic medium',
  power: '249 Watts',
  powerSub: 'Plutonium-238 RTG decay',
  waypoints: [
    { label: 'WP-01 JUPITER', name: 'Jupiter Gravity Assist (1979)', lat: 0, lon: 0, elev: '5.2 AU', dist: '778M km', note: 'Slingshot maneuver increased velocity to reach Saturn in under two years.' },
    { label: 'WP-02 SHOCK', name: 'Termination Shock (2004)', lat: 0, lon: 0, elev: '94 AU', dist: '14.1B km', note: 'Solar wind slowed abruptly from supersonic to subsonic speed.' },
    { label: 'WP-03 PAUSE', name: 'Heliopause Crossing (2012)', lat: 0, lon: 0, elev: '121 AU', dist: '18.1B km', note: 'Passed into interstellar medium where galactic cosmic rays jump by 40%.' },
    { label: 'WP-04 VOID', name: 'Present Interstellar Position (NOW)', lat: 0, lon: 0, elev: '162.8 AU', dist: '24.35B km', note: 'Heading toward constellation Ophiuchus at 16.9 km/s carrying Golden Record.' }
  ],
  desc: 'Voyager 1 escaped the Sun’s gravitational domain on a hyperbolic trajectory. Communicating with NASA’s Deep Space Network across a 45-hour round-trip radio delay, it continues to return measurements from beyond our home star.'
};

function getActiveTerrain() {
  if (currentWorld === 'moon') return moonTerrain;
  if (currentWorld === 'deepspace') return deepspaceTerrain;
  return realTerrain;
}

function getActiveClimate() {
  if (currentWorld === 'moon') return moonClimate;
  if (currentWorld === 'deepspace') return deepspaceClimate;
  return realClimate;
}

function getActiveSites() {
  if (currentWorld === 'moon') return moonSites;
  if (currentWorld === 'deepspace') return deepspaceSites;
  return realSites;
}

function getActiveRoute() {
  if (currentWorld === 'moon') return moonRoute;
  if (currentWorld === 'deepspace') return deepspaceRoute;
  return realRoute;
}

function updateRouteTelemetry(route, reason) {
  if (!route) return;
  const activeR = getActiveRoute();
  activeR.distance = `${route.distanceKm || '3.4'} KM`;
  activeR.duration = `${route.estimatedSolDuration || '5'} SOLS`;
  if (route.waypoints && route.waypoints.length) {
    const totalDist = Number(route.distanceKm || 3.4);
    activeR.waypoints = route.waypoints.map((wp, idx) => ({
      label: `WP-0${idx + 1} ${wp.label || (idx === 0 ? 'BASE' : idx === route.waypoints.length - 1 ? 'SAMPLE' : 'WAYPOINT')}`.trim(),
      name: wp.name || `Waypoint ${idx + 1}`,
      lat: wp.lat,
      lon: wp.lon,
      elev: wp.elevationM ? `${wp.elevationM} m` : '-1,600 m',
      dist: `${(idx * (totalDist / Math.max(route.waypoints.length - 1, 1))).toFixed(2)} km`,
      note: wp.terrain || reason || 'Active route waypoint target.'
    }));
  }
  if (miniMap3D) {
    miniMap3D.updateRoute(route);
  }
  if (activeInspectorTab === 'route') {
    renderInspector('route');
  }
}

// Telemetry Inspector Renderer
function renderInspector(tab = activeInspectorTab) {
  const container = document.querySelector('#map-inspector');
  if (!container) return;
  activeInspectorTab = tab;

  document.querySelectorAll('.map-layer').forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  if (miniMap3D) {
    miniMap3D.setLayer(tab);
    if (tab === 'sites' && activeSiteId) {
      miniMap3D.focusSite(activeSiteId);
    }
  }

  const footLat = document.querySelector('#foot-lat');
  const footLon = document.querySelector('#foot-lon');
  const footMetric = document.querySelector('#foot-metric');

  const curTerrain = getActiveTerrain();
  const curClimate = getActiveClimate();
  const curSites = getActiveSites();
  const curRoute = getActiveRoute();

  if (tab === 'terrain') {
    if (footLat) footLat.textContent = currentWorld === 'moon' ? 'LAT 26.1322° N' : currentWorld === 'deepspace' ? 'RA 17h 13m' : 'LAT 18.4446° N';
    if (footLon) footLon.textContent = currentWorld === 'moon' ? 'LON 03.6339° E' : currentWorld === 'deepspace' ? 'DEC +12° 24′' : 'LON 77.4509° E';
    if (footMetric) footMetric.textContent = currentWorld === 'moon' ? '⊕ ELEV -1,600M' : currentWorld === 'deepspace' ? '⊕ 162.8 AU' : '⊕ ELEV -2,530M';

    container.innerHTML = `
      <div class="inspector-head">
        <span class="inspector-kicker">${escapeHtml(curTerrain.kicker)}</span>
        <span class="inspector-badge">${escapeHtml(curTerrain.badge)}</span>
      </div>
      <div class="inspector-grid">
        <div class="telemetry-card">
          <span class="telemetry-label">Elevation Datum</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.elevation)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.elevationSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Traverse Slope</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.slopeMean)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.slopeSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Surface Roughness</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.roughness)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.roughnessSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Traversability</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.traversability)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.traversabilitySub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Regolith Sinkage</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.sinkage)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.sinkageSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Geology Unit</span>
          <span class="telemetry-val">${escapeHtml(curTerrain.formation)}</span>
          <span class="telemetry-sub">${escapeHtml(curTerrain.formationSub)}</span>
        </div>
      </div>
      <div class="inspector-desc-box">
        <p>${escapeHtml(curTerrain.desc)}</p>
        <small>${escapeHtml(curTerrain.meta)}</small>
      </div>
    `;
  } else if (tab === 'climate') {
    if (footLat) footLat.textContent = currentWorld === 'moon' ? 'LAT 26.1322° N' : currentWorld === 'deepspace' ? 'RA 17h 13m' : 'LAT 18.4446° N';
    if (footLon) footLon.textContent = currentWorld === 'moon' ? 'LON 03.6339° E' : currentWorld === 'deepspace' ? 'DEC +12° 24′' : 'LON 77.4509° E';
    if (footMetric) footMetric.textContent = currentWorld === 'moon' ? '⊕ +118°C · VACUUM' : currentWorld === 'deepspace' ? '⊕ 3 K · 10⁻¹⁷ PA' : '⊕ -63°C · 720 PA';

    container.innerHTML = `
      <div class="inspector-head">
        <span class="inspector-kicker">${escapeHtml(curClimate.kicker)}</span>
        <span class="inspector-badge">${escapeHtml(curClimate.badge)}</span>
      </div>
      <div class="inspector-grid">
        <div class="telemetry-card">
          <span class="telemetry-label">Ambient Temp</span>
          <span class="telemetry-val">${escapeHtml(curClimate.airTemp)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.airTempSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Surface Temp</span>
          <span class="telemetry-val">${escapeHtml(curClimate.groundTemp)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.groundTempSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Pressure</span>
          <span class="telemetry-val">${escapeHtml(curClimate.pressure)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.pressureSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Wind Velocity</span>
          <span class="telemetry-val">${escapeHtml(curClimate.wind)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.windSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Radiation / Gust</span>
          <span class="telemetry-val">${escapeHtml(curClimate.gust)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.gustSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Opacity / Charge</span>
          <span class="telemetry-val">${escapeHtml(curClimate.dustTau)}</span>
          <span class="telemetry-sub">${escapeHtml(curClimate.dustTauSub)}</span>
        </div>
      </div>
      <div class="inspector-desc-box">
        <p>${escapeHtml(curClimate.desc)}</p>
        <div class="gas-row">
          ${(curClimate.gases || []).map(g => `<span class="gas-badge">${escapeHtml(g.name)}: <span>${escapeHtml(g.val)}</span></span>`).join('')}
          <span class="gas-badge">SOLAR FLUX: <span>${escapeHtml(curClimate.solarFlux)}</span></span>
        </div>
        <small>${escapeHtml(curClimate.meta)}</small>
      </div>
    `;
  } else if (tab === 'sites') {
    const curSite = curSites.find(s => s.id === activeSiteId) || curSites[0];
    if (footLat) footLat.textContent = `LAT ${curSite.lat > 0 ? curSite.lat.toFixed(4) + '° N' : Math.abs(curSite.lat).toFixed(4) + '° S'}`;
    if (footLon) footLon.textContent = `LON ${curSite.lon > 0 ? curSite.lon.toFixed(4) + '° E' : Math.abs(curSite.lon).toFixed(4) + '° W'}`;
    if (footMetric) footMetric.textContent = `⊕ ${curSite.distKm === '0.0 km' ? 'DATUM REF' : 'DIST ' + curSite.distKm}`;

    container.innerHTML = `
      <div class="inspector-head">
        <span class="inspector-kicker">03 / SURFACE ASSETS // ${curSites.length} HARDWARE STATIONS</span>
        <span class="inspector-badge">CLICK ANY ASSET TO INSPECT</span>
      </div>
      <div class="sites-scroller">
        ${curSites.map(s => `
          <button class="site-item ${s.id === curSite.id ? 'active' : ''}" data-site-id="${escapeHtml(s.id)}" role="button">
            <div class="site-item-top">
              <span class="site-item-name">${escapeHtml(s.name)}</span>
              <span class="site-item-status">${escapeHtml(s.status)}</span>
            </div>
            <div class="site-item-coords">${escapeHtml(s.site)} · ${escapeHtml(s.year)}</div>
            <div class="site-item-science">${escapeHtml(s.science)}</div>
          </button>
        `).join('')}
      </div>
      <div class="inspector-desc-box">
        <p><strong>Selected Target: ${escapeHtml(curSite.name)} (${escapeHtml(curSite.mission)})</strong> · ${escapeHtml(curSite.site)} · Elev ${escapeHtml(curSite.elevation)}. Distance from reference: ${escapeHtml(curSite.distKm)}.</p>
        <small>${escapeHtml(curSite.science)}</small>
      </div>
    `;

    container.querySelectorAll('.site-item').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSiteId = btn.dataset.siteId;
        renderInspector('sites');
        if (miniMap3D) {
          miniMap3D.focusSite(activeSiteId);
        }
      });
    });
  } else if (tab === 'route') {
    if (footLat) footLat.textContent = currentWorld === 'moon' ? 'LAT 26.1322° N' : currentWorld === 'deepspace' ? 'HELIOPAUSE' : 'LAT 18.4446° N';
    if (footLon) footLon.textContent = currentWorld === 'moon' ? 'LON 03.6339° E' : currentWorld === 'deepspace' ? '162.8 AU' : 'LON 77.4509° E';
    if (footMetric) footMetric.textContent = `⊕ DIST ${escapeHtml(curRoute.distance)}`;

    container.innerHTML = `
      <div class="inspector-head">
        <span class="inspector-kicker">${escapeHtml(curRoute.kicker)}</span>
        <span class="inspector-badge">${escapeHtml(curRoute.badge)}</span>
      </div>
      <div class="inspector-grid">
        <div class="telemetry-card">
          <span class="telemetry-label">Traverse Distance</span>
          <span class="telemetry-val">${escapeHtml(curRoute.distance)}</span>
          <span class="telemetry-sub">${curRoute.waypoints.length}-waypoint plan</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Est. Duration</span>
          <span class="telemetry-val">${escapeHtml(curRoute.duration)}</span>
          <span class="telemetry-sub">Mission telemetry</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Slip Margin</span>
          <span class="telemetry-val">${escapeHtml(curRoute.slip)}</span>
          <span class="telemetry-sub">${escapeHtml(curRoute.slipSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Max Grade</span>
          <span class="telemetry-val">${escapeHtml(curRoute.tiltMax)}</span>
          <span class="telemetry-sub">${escapeHtml(curRoute.tiltSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Obstacle Clearance</span>
          <span class="telemetry-val">${escapeHtml(curRoute.clearance)}</span>
          <span class="telemetry-sub">${escapeHtml(curRoute.clearanceSub)}</span>
        </div>
        <div class="telemetry-card">
          <span class="telemetry-label">Power Allocation</span>
          <span class="telemetry-val">${escapeHtml(curRoute.power)}</span>
          <span class="telemetry-sub">${escapeHtml(curRoute.powerSub)}</span>
        </div>
      </div>
      <div class="waypoint-list">
        ${curRoute.waypoints.map(wp => `
          <div class="waypoint-item">
            <span class="waypoint-lbl">${escapeHtml(wp.label)}</span>
            <div class="waypoint-detail">
              <strong>${escapeHtml(wp.name)}</strong>
              <span>${escapeHtml(wp.note)}</span>
            </div>
            <div class="waypoint-nums">${escapeHtml(wp.dist)}<br/>${escapeHtml(wp.elev)}</div>
          </div>
        `).join('')}
      </div>
      <div class="inspector-desc-box">
        <p>${escapeHtml(curRoute.desc)}</p>
        <small>Real mission flight and traverse telemetry verified against NASA exploration logs.</small>
      </div>
    `;
  }
}

function switchTab(tab) {
  renderInspector(tab);
}
window.switchTab = switchTab;

document.addEventListener('click', event => {
  const tabButton = event.target.closest('.map-layer');
  if (tabButton && tabButton.dataset.tab) {
    switchTab(tabButton.dataset.tab);
  }
});

// Render Milestones based on current world
function renderMilestones() {
  const list = document.querySelector('#milestone-list');
  if (!list) return;
  const config = worldConfigs[currentWorld] || worldConfigs.mars;
  list.innerHTML = config.milestones.map((m, i) => `
    <article class="milestone reveal ${i === 0 ? 'active' : ''}" data-index="${i}" data-mission="${escapeHtml(m.id || 'forgepath')}">
      <span class="milestone-year">${escapeHtml(m.year)}</span>
      <div>
        <h3>${escapeHtml(m.title)}</h3>
        <p>${escapeHtml(m.text)}</p>
        <small class="milestone-site">${escapeHtml(m.site)}</small>
      </div>
      <span class="milestone-arrow"><i data-lucide="arrow-up-right"></i></span>
    </article>
  `).join('');

  list.querySelectorAll('.milestone').forEach(item => {
    item.addEventListener('mouseenter', () => {
      list.querySelectorAll('.milestone').forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      const m = config.milestones[+item.dataset.index];
      if (m) {
        targetCamera.set(m.x * 0.35, 4.8, 17.5);
        targetLook.set(m.x, -1.5, m.z);
        activeSiteName = m.title.split(' ')[0].toUpperCase();
      }
    });
    item.addEventListener('click', () => {
      const id = item.dataset.mission;
      if (id) openMission(id);
    });
  });

  list.addEventListener('mouseleave', () => {
    activeSiteName = null;
    if (SECTION_TARGETS[currentSection]) {
      targetCamera.copy(SECTION_TARGETS[currentSection].camera);
      targetLook.copy(SECTION_TARGETS[currentSection].look);
    }
  });

  renderIcons();
}

// Render Route Objectives buttons
function renderObjectives() {
  const container = document.querySelector('#objective-buttons');
  if (!container) return;
  const config = worldConfigs[currentWorld] || worldConfigs.mars;
  container.innerHTML = config.objectives.map((obj, idx) => `
    <button class="objective ${idx === 0 ? 'active' : ''}" data-objective="${escapeHtml(obj.key)}">
      <span class="objective-icon">${escapeHtml(obj.icon)}</span>
      <span><b>${escapeHtml(obj.title)}</b><small>${escapeHtml(obj.sub)}</small></span>
      <i data-lucide="chevron-right"></i>
    </button>
  `).join('');

  container.querySelectorAll('.objective').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.objective').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const launchBtn = document.querySelector('#launch-route');
  if (launchBtn) {
    launchBtn.innerHTML = `${escapeHtml(config.routeButtonText)} <i data-lucide="arrow-up-right"></i>`;
    launchBtn.classList.remove('complete');
  }

  const resultBox = document.querySelector('#route-result');
  if (resultBox) resultBox.innerHTML = '';
  renderIcons();
}

// Render Hardware List with Filter
function renderHardwareList() {
  const list = document.querySelector('#hardware-list');
  if (!list) return;

  const filtered = activeHardwareFilter === 'ALL'
    ? allHardwareList
    : allHardwareList.filter(item => item.body.toUpperCase() === activeHardwareFilter.toUpperCase());

  list.innerHTML = filtered.map(item => `
    <article class="hardware-card" data-hardware="${escapeHtml(item.id)}" tabindex="0" role="button">
      ${item.image ? `<img class="hardware-card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name || item.shortName)}" loading="lazy">` : '<div class="hardware-card-image image-placeholder">NASA ARCHIVE</div>'}
      <div class="hardware-card-top">
        <span class="hardware-body">${escapeHtml(item.body)}</span>
        <span class="hardware-status">${escapeHtml(item.status)}</span>
      </div>
      <h4>${escapeHtml(item.shortName)}</h4>
      <span class="hardware-mission">${escapeHtml(item.mission)} · ${escapeHtml(item.year)}</span>
      <p>${escapeHtml(item.science)}</p>
      <div class="hardware-purpose"><span>PURPOSE</span>${escapeHtml(item.purpose)}</div>
      <span class="hardware-open">OPEN STORY + ANATOMY ↗</span>
    </article>
  `).join('');

  list.querySelectorAll('.hardware-card').forEach(card => {
    card.addEventListener('click', () => openHardware(card.dataset.hardware));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') openHardware(card.dataset.hardware);
    });
  });
}

// Setup Hardware Filter Chips
function setupHardwareFilters() {
  const filterBar = document.querySelector('#hardware-filter-bar');
  if (!filterBar) return;

  filterBar.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeHardwareFilter = chip.dataset.filter;
      renderHardwareList();
    });
  });
}

// --- WORLD SWITCHER LOGIC ---
function switchWorld(worldName) {
  if (!worldConfigs[worldName]) worldName = 'mars';
  currentWorld = worldName;

  // Sync body theme class
  document.body.classList.remove('theme-moon', 'theme-deepspace');
  if (currentWorld === 'moon') document.body.classList.add('theme-moon');
  if (currentWorld === 'deepspace') document.body.classList.add('theme-deepspace');

  // Sync topbar buttons
  document.querySelectorAll('.world-btn').forEach(btn => {
    const isTarget = btn.dataset.world === currentWorld;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  const config = worldConfigs[currentWorld];

  // Update Page Title
  document.title = `FORGEPATH // ${config.name.toUpperCase()} Exploration Atlas`;

  // Update Topbar Readouts
  const readoutDist = document.querySelector('#readout-dist');
  const readoutStatus = document.querySelector('#readout-status');
  if (readoutDist) readoutDist.textContent = config.readoutDist;
  if (readoutStatus) readoutStatus.textContent = config.readoutStatus;

  // Update Hero Section
  const heroEyebrow = document.querySelector('#hero-eyebrow');
  const heroHeadline = document.querySelector('#hero-headline');
  const heroLede = document.querySelector('#hero-lede');
  const heroCoord = document.querySelector('#hero-coordinate');
  const labelA = document.querySelector('#terrain-label-a');
  const labelB = document.querySelector('#terrain-label-b');

  if (heroEyebrow) heroEyebrow.textContent = config.heroEyebrow;
  if (heroHeadline) heroHeadline.innerHTML = config.heroHeadline;
  if (heroLede) heroLede.textContent = config.heroLede;
  if (heroCoord) heroCoord.innerHTML = `<span>${config.heroCoord.split('·')[0]}</span><span>${config.heroCoord.split('·')[1] || ''}</span>`;
  if (labelA) labelA.innerHTML = `<span class="label-dot"></span>${config.labelA}`;
  if (labelB) labelB.innerHTML = `<span class="label-dot"></span>${config.labelB}`;
  document.querySelectorAll('#landing .reveal').forEach(el => el.classList.add('visible'));

  // Update Dashboard Panel Head
  const mapTitle = document.querySelector('#map-target-title');
  const mapStatus = document.querySelector('#map-status');
  const mapKicker = document.querySelector('#map-target-kicker');
  const dashPill = document.querySelector('#dashboard-pill');
  if (mapTitle) mapTitle.textContent = config.mapTitle;
  if (mapStatus) mapStatus.textContent = config.mapStatus;
  if (mapKicker) mapKicker.textContent = config.mapKicker;
  if (dashPill) dashPill.innerHTML = `<span class="pulse"></span> ${config.name.toUpperCase()} EXPLORATION MODE`;

  // Update Mission Log Card
  const photo = document.querySelector('#nasa-photo');
  const photoStatus = document.querySelector('#photo-status');
  const caption = document.querySelector('#mission-caption');
  const rover = document.querySelector('#mission-rover');
  const meta = document.querySelector('#mission-meta');
  const avatar = document.querySelector('#mission-avatar');

  if (config.logImage && photo) {
    photo.src = config.logImage;
    photo.classList.remove('is-empty');
    if (photoStatus) photoStatus.textContent = 'NASA ARCHIVE TELEMETRY';
  } else if (currentWorld === 'mars') {
    getLatestRoverPhoto().then(m => {
      if (photo && m.imgSrc) photo.src = m.imgSrc;
      if (photoStatus) photoStatus.textContent = m.status;
    });
  }
  if (caption) caption.textContent = config.logQuote;
  if (rover) rover.textContent = config.logRover;
  if (meta) meta.textContent = config.logMeta;
  if (avatar) avatar.textContent = config.logAvatar;

  // Update 3D Background Canvas colors & lighting
  if (currentWorld === 'moon') {
    terrain.visible = true;
    rocks.visible = true;
    earthGroup.visible = true;
    deepSpaceGroup.visible = false;
    terrainMat.color.setHex(0x6a6b70);
    scene.fog.color.setHex(0x030306);
    scene.fog.density = 0.010;
    hemiLight.color.setHex(0x334466);
    hemiLight.groundColor.setHex(0x050508);
    sun.color.setHex(0xffffff);
    sun.intensity = 4.2;
    populateTerrainSiteMarkers(missionSitesMoon);
    activeSiteId = 'apollo15';
  } else if (currentWorld === 'deepspace') {
    terrain.visible = false;
    rocks.visible = false;
    earthGroup.visible = false;
    deepSpaceGroup.visible = true;
    scene.fog.color.setHex(0x04020a);
    scene.fog.density = 0.005; // clearer line of sight for distant nebulae & stardust
    hemiLight.color.setHex(0x5b21b6);
    hemiLight.groundColor.setHex(0x05020c);
    sun.color.setHex(0xd8b4fe);
    sun.intensity = 3.0;
    populateTerrainSiteMarkers(missionSitesDeepSpace);
    activeSiteId = 'voyager-1';
  } else {
    terrain.visible = true;
    rocks.visible = true;
    earthGroup.visible = false;
    deepSpaceGroup.visible = false;
    terrainMat.color.setHex(0x713c2b);
    scene.fog.color.setHex(0x120c0b);
    scene.fog.density = 0.012;
    hemiLight.color.setHex(0x8b8b8b);
    hemiLight.groundColor.setHex(0x170806);
    sun.color.setHex(0xffd2a8);
    sun.intensity = 3.5;
    populateTerrainSiteMarkers(missionSitesMars);
    activeSiteId = 'perseverance';
  }

  // Update 3D MiniMap
  if (miniMap3D) {
    miniMap3D.setWorld(currentWorld);
  }

  // Auto-focus hardware filter to current world for seamless synergy
  activeHardwareFilter = currentWorld === 'moon' ? 'MOON' : currentWorld === 'deepspace' ? 'DEEP SPACE' : 'MARS';
  const filterBar = document.querySelector('#hardware-filter-bar');
  if (filterBar) {
    filterBar.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === activeHardwareFilter);
    });
  }

  renderMilestones();
  renderObjectives();
  renderInspector(activeInspectorTab);
  renderHardwareList();
}

// Bind Topbar World Switcher Buttons
document.querySelectorAll('.world-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const world = btn.dataset.world;
    location.hash = `#${world}`;
    switchWorld(world);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Setup 3D MiniMap initialization
const mapArt = document.querySelector('#map-art');
if (mapArt) {
  miniMap3D = createMiniMap3D({
    container: mapArt,
    onSiteSelect: siteId => {
      activeSiteId = siteId;
      renderInspector('sites');
    },
    onCoordinateUpdate: (lat, lon) => {
      const footLat = document.querySelector('#foot-lat');
      const footLon = document.querySelector('#foot-lon');
      if (footLat) footLat.textContent = `LAT ${lat > 0 ? lat.toFixed(4) + '° N' : Math.abs(lat).toFixed(4) + '° S'}`;
      if (footLon) footLon.textContent = `LON ${lon > 0 ? lon.toFixed(4) + '° E' : Math.abs(lon).toFixed(4) + '° W'}`;
    }
  });
}

// Route Planner Button Click
document.querySelector('#launch-route').addEventListener('click', async e => {
  const button = e.currentTarget;
  const objective = document.querySelector('.objective.active')?.dataset.objective || (currentWorld === 'moon' ? 'sample' : 'water');
  button.disabled = true;
  button.textContent = currentWorld === 'moon' ? 'Tracing lunar traverse…' : 'Calculating terrain path…';

  try {
    const response = await fetch(`${API_BASE}/api/routes/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective, world: currentWorld })
    });
    if (!response.ok) throw new Error('Route service unavailable');
    const route = await response.json();
    const routeReason = route.reason || 'Optimal path calculated from elevation contours and regolith slip margins.';
    updateRouteTelemetry(route, routeReason);
    button.innerHTML = `Traverse forged · ${route.distanceKm} KM <i data-lucide="check"></i>`;
    button.classList.add('complete');
    document.querySelector('#route-result').innerHTML = `<strong>${route.distanceKm || '—'} KM · ${route.estimatedSolDuration || '—'}</strong><span>${routeReason}</span>`;
  } catch (error) {
    console.warn('[Forgepath] Route planner API offline, using fallback:', error.message);
    const fallbackRoutes = {
      moon: {
        sample: { waypoints: [{ lat: 26.1322, lon: 3.6339 }, { lat: 26.1450, lon: 3.6120 }, { lat: 26.0980, lon: 3.6580 }, { lat: 26.1322, lon: 3.6339 }], distanceKm: 12.5, estimatedSolDuration: '6.5 HOURS', reason: 'Ascends Apennine Front to sample primordial anorthosite crust (Genesis Rock 15415).' },
        water: { waypoints: [{ lat: 26.1322, lon: 3.6339 }, { lat: 26.1450, lon: 3.6120 }, { lat: 26.1322, lon: 3.6339 }], distanceKm: 6.4, estimatedSolDuration: '3.5 HOURS', reason: 'Overlooks the steep 300m drop of Hadley Rille to map shadowed basaltic lava layers.' },
        safe: { waypoints: [{ lat: 26.1322, lon: 3.6339 }, { lat: 26.1280, lon: 3.6420 }, { lat: 26.1322, lon: 3.6339 }], distanceKm: 4.2, estimatedSolDuration: '2.5 HOURS', reason: 'Remains on flat Mare Imbrium basalt plain to minimize wheel sinkage.' }
      },
      mars: {
        water: { waypoints: [{ lat: 18.4446, lon: 77.4509 }, { lat: 18.4512, lon: 77.4731 }, { lat: 18.469, lon: 77.489 }], distanceKm: 3.4, estimatedSolDuration: '5 SOLS', reason: 'Follows ancient river delta edge to maximize access to water-shaped geology while avoiding steepest slopes.' },
        sample: { waypoints: [{ lat: 18.4446, lon: 77.4509 }, { lat: 18.455, lon: 77.468 }, { lat: 18.472, lon: 77.491 }], distanceKm: 4.1, estimatedSolDuration: '8 SOLS', reason: 'Prioritizes high-value mudstone core sample target for strongest biosignature return.' },
        safe: { waypoints: [{ lat: 18.4446, lon: 77.4509 }, { lat: 18.4475, lon: 77.461 }, { lat: 18.458, lon: 77.479 }], distanceKm: 2.8, estimatedSolDuration: '4 SOLS', reason: 'Favors low-angle terrain and smoother regolith corridors to reduce wheel torque stress.' }
      }
    };
    const worldFallbacks = fallbackRoutes[currentWorld] || fallbackRoutes.mars;
    const route = worldFallbacks[objective] || worldFallbacks.sample || worldFallbacks.water;
    updateRouteTelemetry(route, route.reason);
    button.innerHTML = `Traverse forged · ${route.distanceKm} KM <i data-lucide="check"></i>`;
    button.classList.add('complete');
    document.querySelector('#route-result').innerHTML = `<strong>${route.distanceKm} KM · ${route.estimatedSolDuration}</strong><span>${route.reason}</span>`;
  } finally {
    button.disabled = false;
    renderIcons();
  }
});

// Sound Toggle
document.querySelector('#sound-toggle').addEventListener('click', e => {
  e.currentTarget.classList.toggle('is-muted');
  e.currentTarget.innerHTML = `<i data-lucide="${e.currentTarget.classList.contains('is-muted') ? 'volume-x' : 'volume-2'}"></i>`;
  renderIcons();
});

// Modal Logic
const imageModal = document.querySelector('#image-modal');
const imagePreview = document.querySelector('#image-modal-preview');
const imageTitle = document.querySelector('#image-modal-title');
const imageDate = document.querySelector('#image-modal-date');
const imageDescription = document.querySelector('#image-modal-description');
function closeImageModal() {
  imageModal.classList.remove('is-visible');
  imagePreview.src = '';
}
document.addEventListener('click', event => {
  const image = event.target.closest('.mission-gallery img');
  if (!image) return;
  imagePreview.src = image.src;
  imagePreview.alt = image.alt;
  imageTitle.textContent = image.dataset.title || image.alt;
  imageDate.textContent = image.dataset.date ? `Captured / catalogued ${image.dataset.date}` : 'NASA Image and Video Library';
  imageDescription.textContent = image.dataset.description ? decodeURIComponent(image.dataset.description) : 'Official NASA archive image.';
  imageModal.classList.add('is-visible');
});
document.querySelector('#image-modal-close').addEventListener('click', closeImageModal);
imageModal.addEventListener('click', event => { if (event.target === imageModal) closeImageModal(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeImageModal(); });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
});

// Initial Hardware Fetch with Fallback
fetch(`${API_BASE}/api/hardware`)
  .then(response => {
    if (!response.ok) throw new Error('Hardware API unavailable');
    return response.json();
  })
  .then(({ hardware }) => {
    if (hardware && hardware.length) {
      allHardwareList = hardware;
      renderHardwareList();
    }
  })
  .catch(() => console.warn('[Forgepath] Showing local hardware registry fallback'));

// Open Hardware Detail Modal/Drawer
async function openHardware(id) {
  location.hash = `hardware/${id}`;
  const detail = document.querySelector('#mission-detail');
  detail.classList.add('is-open');
  detail.innerHTML = '<div class="mission-loading"><span class="pulse"></span> OPENING ARTIFACT STORY</div>';
  detail.scrollIntoView({ behavior: 'smooth' });
  let item;
  try {
    const response = await fetch(`${API_BASE}/api/hardware/${id}`);
    if (!response.ok) throw new Error('Artifact archive unavailable');
    item = await response.json();
  } catch (err) {
    console.warn('[Forgepath] Hardware API unavailable, using offline fallback:', err.message);
    const fallbackItem = allHardwareList.find(h => h.id === id) || allHardwareList[0];
    const fallbackCtx = fallbackArtifactContext[id] || {};
    item = {
      ...fallbackItem,
      name: fallbackItem.name || fallbackItem.shortName,
      story: fallbackItem.purpose,
      goal: fallbackItem.purpose,
      images: fallbackCtx.images?.length ? fallbackCtx.images : (fallbackItem.image ? [{ title: fallbackItem.name || fallbackItem.shortName, src: fallbackItem.image }] : [])
    };
  }
  try {
    targetCamera.set(-3.5, 3.4, 16);
    targetLook.set(0.5, -1.5, -2);
    activeSiteName = id.toUpperCase();
    const fallback = fallbackArtifactContext[id] || {};
    const goal = item.goal || item.purpose || 'To turn a distant world into knowledge and help us understand our place in the cosmos.';
    const parts = item.parts?.length ? item.parts : [['body', 'Mission body', 'Protects the hardware and carries its instruments.', 'Mission-grade alloys']];
    const anatomy = `<div class="anatomy-panel"><div><span class="panel-kicker">INTERACTIVE HARDWARE ANATOMY</span><h3>Click a part to see why it matters.</h3><div class="anatomy-parts">${parts.map((part, index) => `<button class="anatomy-part ${index === 0 ? 'active' : ''}" data-part="${index}"><span>0${index + 1}</span>${escapeHtml(part[1])}</button>`).join('')}</div></div><div class="anatomy-explanation"><span class="panel-kicker">PART FUNCTION</span><h4 id="part-name">${escapeHtml(parts[0][1])}</h4><p id="part-function">${escapeHtml(parts[0][2])}</p><small id="part-material">MATERIAL / ${escapeHtml(parts[0][3])}</small></div></div>`;
    const messageForm = `<div class="message-lab"><span class="panel-kicker">SEND A MESSAGE FORWARD</span><h3>What should another world know about us?</h3><p>Inspired by Voyager’s Golden Record, write a short message for a future explorer.</p><form id="message-form"><textarea id="message-text" maxlength="500" placeholder="I hope you discover…" required></textarea><div><small id="message-status">500 characters maximum</small><button class="primary-button" type="submit">Archive my message <i data-lucide="send"></i></button></div></form></div>`;
    const carriedBy = item.carriedBy || fallback.carriedBy || item.mission;
    const challenges = item.challenges?.length ? item.challenges : fallback.challenges || ['Distance, darkness, and communication delay.', 'Designing a machine that cannot be repaired by human hands.'];
    detail.innerHTML = `<a class="back-link" href="#dashboard">← BACK TO HARDWARE ATLAS</a><div class="mission-detail-head"><div><p class="eyebrow">${escapeHtml(item.body)} / ${escapeHtml(item.status)}</p><h2>${escapeHtml(item.name || item.shortName)}</h2><p class="mission-why">${escapeHtml(item.story || item.purpose)}</p></div><div class="mission-site-card"><span>MISSION / YEAR</span><strong>${escapeHtml(item.mission)}</strong><small>${escapeHtml(item.year)} · ${escapeHtml(item.science)}</small></div></div><div class="artifact-goal"><span class="panel-kicker">MISSION GOAL</span><p>${escapeHtml(goal)}</p></div><div class="artifact-team-grid"><div><span class="panel-kicker">WHO CARRIED IT?</span><p>${escapeHtml(carriedBy)}</p></div><div><span class="panel-kicker">THE HARD PART</span><ul>${challenges.map(challenge => `<li>${escapeHtml(challenge)}</li>`).join('')}</ul></div></div><div class="artifact-build-grid"><div><span class="panel-kicker">WHAT IS IT MADE OF?</span><div class="material-list">${(item.madeOf || []).map(material => `<span>＋ ${escapeHtml(material)}</span>`).join('')}</div><span class="panel-kicker">HOW IT WAS BUILT</span><div class="mission-steps">${(item.built || []).map((step, index) => `<div class="mission-step"><span>0${index + 1}</span><p>${escapeHtml(step)}</p></div>`).join('')}</div><div class="discovery curiosity-card"><span class="panel-kicker">A QUESTION TO CARRY FORWARD</span><p>${escapeHtml(item.question || 'What would you design to explore a world no human has touched?')}</p></div></div><div class="mission-gallery">${(item.images || []).map(image => `<figure><img src="${escapeHtml(image.src)}" data-title="${escapeHtml(image.title)}" data-date="${escapeHtml(image.date || '')}" data-description="${encodeURIComponent(image.description || '')}" alt="${escapeHtml(image.title)}" loading="lazy"><figcaption>${escapeHtml(image.title)}</figcaption></figure>`).join('')}</div></div>`;
    detail.querySelector('.artifact-build-grid').insertAdjacentHTML('beforebegin', anatomy);
    detail.insertAdjacentHTML('beforeend', messageForm);
    detail.querySelectorAll('.anatomy-part').forEach(button => button.addEventListener('click', () => {
      detail.querySelectorAll('.anatomy-part').forEach(part => part.classList.remove('active'));
      button.classList.add('active');
      const part = parts[Number(button.dataset.part)];
      detail.querySelector('#part-name').textContent = part[1];
      detail.querySelector('#part-function').textContent = part[2];
      detail.querySelector('#part-material').textContent = `MATERIAL / ${part[3]}`;
    }));
    detail.querySelector('#message-form').addEventListener('submit', async event => {
      event.preventDefault();
      const status = detail.querySelector('#message-status');
      const text = detail.querySelector('#message-text').value;
      status.textContent = 'Sending to the archive…';
      try {
        const result = await fetch(`${API_BASE}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        if (!result.ok) throw new Error('Message could not be archived');
        status.textContent = 'Message archived for the next explorer.';
        event.target.reset();
      } catch (error) {
        status.textContent = error.message;
      }
    });
  } catch (error) {
    detail.innerHTML = `<a class="back-link" href="#dashboard">← BACK TO HARDWARE ATLAS</a><p class="mission-loading">${escapeHtml(error.message)}</p>`;
  }
  renderIcons();
}

// Open Mission Timeline Story
async function openMission(id) {
  location.hash = `mission/${id}`;
  const detail = document.querySelector('#mission-detail');
  detail.classList.add('is-open');
  detail.innerHTML = '<div class="mission-loading"><span class="pulse"></span> LOADING MISSION ARCHIVE</div>';
  detail.scrollIntoView({ behavior: 'smooth' });
  let story;
  try {
    const response = await fetch(`${API_BASE}/api/missions/${id}`);
    if (!response.ok) throw new Error('Mission archive unavailable');
    story = await response.json();
  } catch (err) {
    console.warn('[Forgepath] Mission API unavailable, using offline fallback:', err.message);
    const config = worldConfigs[currentWorld] || worldConfigs.mars;
    const m = config.milestones.find(m => m.site?.toLowerCase().includes(id) || id.includes(m.site?.toLowerCase()) || m.id === id) || config.milestones[0];
    const fallbackImgs = {
      mariner4: [{ title: 'Mariner 4 Mars Flyby', src: 'https://images-assets.nasa.gov/image/PIA02980/PIA02980~thumb.jpg' }],
      pathfinder: [{ title: 'Pathfinder & Sojourner on Mars', src: 'https://images-assets.nasa.gov/image/PIA04422/PIA04422~medium.jpg' }],
      perseverance: [{ title: 'Perseverance at Jezero Crater', src: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg' }],
      apollo11: [{ title: 'Apollo 11 Tranquility Base', src: 'https://images-assets.nasa.gov/image/6900992/6900992~medium.jpg' }],
      apollo15: [{ title: 'Apollo 15 Lunar Rover at Hadley Rille', src: 'https://images-assets.nasa.gov/image/6640853/6640853~medium.jpg' }],
      voyager: [{ title: 'Voyager Interstellar Mission', src: 'https://images-assets.nasa.gov/image/PIA17045/PIA17045~small.jpg' }],
      forgepath: [{ title: 'Forgepath Planetary Exploration', src: 'https://images-assets.nasa.gov/image/PIA24343/PIA24343~medium.jpg' }]
    };
    story = {
      kicker: `${m.year} · EXPLORATION MILESTONE`,
      title: m.title,
      why: m.text,
      site: m.site,
      mission: m.title,
      how: [
        'Traverse interplanetary space along planned ballistic transfer orbit.',
        'Enter planetary proximity and orient primary scientific sensors.',
        'Transmit scientific discoveries, telemetry, and high-resolution imagery back to Earth.'
      ],
      discovery: m.text,
      images: fallbackImgs[m.id] || fallbackImgs[id] || [{ title: m.title, src: 'https://images-assets.nasa.gov/image/PIA24343/PIA24343~medium.jpg' }]
    };
  }
  detail.innerHTML = `
    <a class="back-link" href="#story">← BACK TO TIMELINE</a>
    <div class="mission-detail-head">
      <div>
        <p class="eyebrow">${escapeHtml(story.kicker)}</p>
        <h2>${escapeHtml(story.title)}</h2>
        <p class="mission-why">${escapeHtml(story.why)}</p>
      </div>
      <div class="mission-site-card">
        <span>LANDING / STUDY SITE</span>
        <strong>${escapeHtml(story.site)}</strong>
        <small>${escapeHtml(story.mission)}</small>
      </div>
    </div>
    <div class="mission-detail-grid">
      <div>
        <span class="panel-kicker">THE MISSION IN MOTION</span>
        <div class="mission-steps">
          ${(story.how || []).map((step, index) => `<div class="mission-step"><span>0${index + 1}</span><p>${escapeHtml(step)}</p></div>`).join('')}
        </div>
        <div class="discovery">
          <span class="panel-kicker">WHAT CHANGED</span>
          <p>${escapeHtml(story.discovery)}</p>
        </div>
      </div>
      <div class="mission-gallery">
        ${(story.images || []).map(image => `
          <figure>
            <img src="${escapeHtml(image.src)}" data-title="${escapeHtml(image.title)}" data-date="${escapeHtml(image.date)}" data-description="${encodeURIComponent(image.description || '')}" alt="${escapeHtml(image.title)}" loading="lazy">
            <figcaption>${escapeHtml(image.title)}<small>${escapeHtml(image.date)}</small></figcaption>
          </figure>
        `).join('')}
      </div>
    </div>
  `;
  targetCamera.set(2, 2.6, 14);
  targetLook.set(0, -1.5, -4);
  activeSiteName = id.toUpperCase();
  renderIcons();
}

// Check initial URL hash for destination
function handleHashRoute() {
  const hash = location.hash.replace('#', '');
  if (hash === 'moon') {
    switchWorld('moon');
  } else if (hash === 'deepspace') {
    switchWorld('deepspace');
  } else if (hash.startsWith('hardware/')) {
    openHardware(hash.split('/')[1]);
  } else if (hash.startsWith('mission/')) {
    openMission(hash.split('/')[1]);
  } else {
    switchWorld('mars');
  }
}

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  if (hash === 'moon' && currentWorld !== 'moon') switchWorld('moon');
  if (hash === 'mars' && currentWorld !== 'mars') switchWorld('mars');
  if (hash === 'deepspace' && currentWorld !== 'deepspace') switchWorld('deepspace');
  if (hash.startsWith('hardware/')) openHardware(hash.split('/')[1]);
  if (hash.startsWith('mission/')) openMission(hash.split('/')[1]);
});

// Initialize UI
setupHardwareFilters();
handleHashRoute();
renderIcons();
