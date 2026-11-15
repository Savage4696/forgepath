import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Interactive 3D Mini Map for ForgePath Planetary Exploration
 * Supports:
 *  - Procedural Mars & Moon 3D Globes with realistic textures, bump maps & terrain relief
 *  - Interactive 3D Landed Mission Sites for both Mars (Perseverance, Curiosity...) and Moon (Apollo 11, 15, 17, Surveyor, Lunokhod...)
 *  - 3D Crater Relief mode (Jezero Crater Paleolake Delta on Mars, Hadley Rille & Apennine Gorge on Moon)
 *  - Dynamic World Switcher integration (setWorld: 'mars' | 'moon')
 *  - Full OrbitControls, raycasting hover tooltips, and True North compass tracker
 */

export function createMiniMap3D({ container, mapData, onSiteSelect, onCoordinateUpdate }) {
  if (!container) return null;

  // Clear any existing content
  container.innerHTML = '';
  container.classList.add('minimap-container');

  // DOM Elements: Canvas + Aerospace HUD
  const canvas = document.createElement('canvas');
  canvas.className = 'minimap-3d-canvas';
  container.appendChild(canvas);

  let currentWorld = 'mars'; // 'mars' or 'moon'

  const hudOverlay = document.createElement('div');
  hudOverlay.className = 'minimap-hud-overlay';
  hudOverlay.innerHTML = `
    <div class="minimap-hud-top">
      <div class="minimap-tag">
        <span class="hud-blink">●</span>
        <span class="hud-title" id="minimap-title">MARS ORBITAL 3D // JEZERO SECTOR</span>
      </div>
      <div class="minimap-controls">
        <button class="minimap-btn active" data-action="globe" title="View Full Globe in 3D">3D GLOBE</button>
        <button class="minimap-btn" data-action="relief" id="btn-relief" title="View Topographic 3D Relief">CRATER 3D</button>
        <button class="minimap-btn active" data-action="spin" title="Toggle Auto-Rotation">SPIN: ON</button>
        <button class="minimap-btn" data-action="reset" title="Reset Camera View">RESET</button>
      </div>
    </div>
    
    <div class="minimap-compass" id="minimap-compass" title="True North">
      <div class="compass-dial">
        <div class="compass-needle" id="compass-needle"></div>
        <span class="compass-n">N</span>
      </div>
    </div>

    <div class="minimap-tooltip" id="minimap-tooltip"></div>

    <div class="minimap-hud-bottom">
      <div class="minimap-telemetry" id="minimap-telemetry">
        <span class="coord-label">TARGET:</span>
        <span class="coord-val" id="hud-coord-val">JEZERO CRATER · LAT 18.44° N · LON 77.45° E</span>
      </div>
      <div class="minimap-drag-hint" id="minimap-drag-hint">
        <span>⤹ DRAG TO ROTATE · SCROLL TO ZOOM</span>
      </div>
    </div>
  `;
  container.appendChild(hudOverlay);

  // Setup Three.js Scene
  const scene = new THREE.Scene();
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 360;

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(2.8, 1.4, 3.2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // OrbitControls for full user interaction
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.85;
  controls.enableZoom = true;
  controls.minDistance = 2.0;
  controls.maxDistance = 7.5;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  const dragHint = hudOverlay.querySelector('#minimap-drag-hint');
  controls.addEventListener('start', () => {
    if (dragHint) dragHint.classList.add('fade-out');
  });

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x281914, 1.8);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff2e6, 3.2);
  sunLight.position.set(6, 4, 5);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x803820, 1.4);
  fillLight.position.set(-6, -2, -4);
  scene.add(fillLight);

  // Groups
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const reliefGroup = new THREE.Group();
  reliefGroup.visible = false;
  scene.add(reliefGroup);

  // --- PROCEDURAL TEXTURES FOR MARS, MOON AND DEEP SPACE ---
  const marsTextures = generateMarsTextures();
  const moonTextures = generateMoonTextures();
  const deepspaceTextures = generateDeepSpaceTextures();

  const PLANET_RADIUS = 1.45;
  const sphereGeo = new THREE.SphereGeometry(PLANET_RADIUS, 64, 48);
  const planetMaterial = new THREE.MeshStandardMaterial({
    map: marsTextures.diffuseTexture,
    bumpMap: marsTextures.bumpTexture,
    bumpScale: 0.038,
    roughness: 0.86,
    metalness: 0.04
  });
  const planetMesh = new THREE.Mesh(sphereGeo, planetMaterial);
  globeGroup.add(planetMesh);

  // Atmosphere rim glow (visible on Mars, hidden on Moon vacuum)
  const atmosGeo = new THREE.SphereGeometry(PLANET_RADIUS * 1.025, 48, 36);
  const atmosMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float edge = 1.0 - max(dot(vNormal, viewDir), 0.0);
        float alpha = pow(edge, 2.6) * 0.72;
        vec3 atmosColor = mix(vec3(0.94, 0.45, 0.25), vec3(0.55, 0.75, 0.95), pow(edge, 1.8));
        gl_FragColor = vec4(atmosColor, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });
  const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
  globeGroup.add(atmosMesh);

  // Atmospheric dust cloud particles for Mars
  const dustCount = 320;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const lat = (Math.random() - 0.5) * Math.PI;
    const lon = Math.random() * Math.PI * 2;
    const r = PLANET_RADIUS * (1.02 + Math.random() * 0.05);
    dustPos[i * 3] = r * Math.cos(lat) * Math.sin(lon);
    dustPos[i * 3 + 1] = r * Math.sin(lat);
    dustPos[i * 3 + 2] = r * Math.cos(lat) * Math.cos(lon);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xf5a373,
    size: 0.035,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });
  const dustCloud = new THREE.Points(dustGeo, dustMat);
  dustCloud.visible = false;
  globeGroup.add(dustCloud);

  // Coordinate Grid (Meridians & Parallels)
  const gridGroup = new THREE.Group();
  const gridMat = new THREE.LineBasicMaterial({
    color: 0xf3eee7,
    transparent: true,
    opacity: 0.16
  });

  [-60, -30, 0, 30, 60].forEach(latDeg => {
    const latRad = (latDeg * Math.PI) / 180;
    const r = PLANET_RADIUS * 1.002 * Math.cos(latRad);
    const y = PLANET_RADIUS * 1.002 * Math.sin(latRad);
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(r * Math.sin(theta), y, r * Math.cos(theta)));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(lineGeo, latDeg === 0 ? new THREE.LineBasicMaterial({ color: 0xf0643d, transparent: true, opacity: 0.35 }) : gridMat);
    gridGroup.add(line);
  });

  [0, 60, 120, 180, 240, 300].forEach(lonDeg => {
    const lonRad = (lonDeg * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const latRad = ((i / 64) * 180 - 90) * (Math.PI / 180);
      const r = PLANET_RADIUS * 1.002;
      pts.push(new THREE.Vector3(
        r * Math.cos(latRad) * Math.sin(lonRad),
        r * Math.sin(latRad),
        r * Math.cos(latRad) * Math.cos(lonRad)
      ));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    gridGroup.add(new THREE.Line(lineGeo, gridMat));
  });
  globeGroup.add(gridGroup);

  // Coordinate Converter (Lat, Lon) -> 3D Vector3
  function latLonToVector(lat, lon, radius = PLANET_RADIUS * 1.002) {
    const phi = (lat * Math.PI) / 180;
    const theta = (lon * Math.PI) / 180;
    return new THREE.Vector3(
      radius * Math.cos(phi) * Math.sin(theta),
      radius * Math.sin(phi),
      radius * Math.cos(phi) * Math.cos(theta)
    );
  }

  // --- MISSION SITES DATASETS ---
  const marsSitesData = [
    { id: 'perseverance', name: 'Perseverance', site: 'Jezero Crater', lat: 18.4446, lon: 77.4509, year: 2021, status: 'ACTIVE', color: 0xf0643d },
    { id: 'curiosity', name: 'Curiosity', site: 'Gale Crater', lat: -4.5895, lon: 137.4417, year: 2012, status: 'ACTIVE', color: 0xf0643d },
    { id: 'insight', name: 'InSight', site: 'Elysium Planitia', lat: 4.5024, lon: 135.6234, year: 2018, status: 'SILENT (SOL 1440)', color: 0x9c9790 },
    { id: 'opportunity', name: 'Opportunity', site: 'Meridiani Planum', lat: -1.9462, lon: 354.4734, year: 2004, status: 'SILENT (SOL 5111)', color: 0x9c9790 },
    { id: 'spirit', name: 'Spirit', site: 'Gusev Crater', lat: -14.5684, lon: 175.4785, year: 2004, status: 'SILENT (SOL 2210)', color: 0x9c9790 },
    { id: 'pathfinder', name: 'Pathfinder / Sojourner', site: 'Ares Vallis', lat: 19.1300, lon: 326.7800, year: 1997, status: 'SILENT', color: 0x9c9790 }
  ];

  const moonSitesData = [
    { id: 'apollo15', name: 'Apollo 15 (Falcon & LRV)', site: 'Hadley-Apennine', lat: 26.13, lon: 3.63, year: 1971, status: 'RETIRED (LRV PARKED)', color: 0x58c6ff },
    { id: 'apollo11', name: 'Apollo 11 (Eagle)', site: 'Mare Tranquillitatis', lat: 0.67, lon: 23.47, year: 1969, status: 'RETIRED (DESCENT STAGE)', color: 0x58c6ff },
    { id: 'apollo17', name: 'Apollo 17 (Challenger)', site: 'Taurus-Littrow', lat: 20.19, lon: 30.77, year: 1972, status: 'RETIRED (LRV PARKED)', color: 0x58c6ff },
    { id: 'surveyor3', name: 'Surveyor 3', site: 'Oceanus Procellarum', lat: -3.01, lon: 336.58, year: 1967, status: 'RETIRED', color: 0x9c9790 },
    { id: 'lunokhod1', name: 'Lunokhod 1 (Luna 17)', site: 'Mare Imbrium', lat: 38.33, lon: 324.97, year: 1970, status: 'RETIRED', color: 0x9c9790 },
    { id: 'change4', name: 'Chang\'e 4 (Yutu-2)', site: 'Von Kármán (Far Side)', lat: -45.46, lon: 177.60, year: 2019, status: 'ACTIVE', color: 0x6cdc9a },
    { id: 'chandrayaan3', name: 'Chandrayaan-3 (Pragyan)', site: 'Shiv Shakti (69.37°S)', lat: -69.37, lon: 32.35, year: 2023, status: 'RETIRED', color: 0x9c9790 }
  ];

  const deepspaceSitesData = [
    { id: 'voyager1', name: 'Voyager 1 (Interstellar)', site: 'Heliopause · 162.8 AU · Ophiuchus', lat: 12.4, lon: 258.2, year: 1977, status: 'ACTIVE (INTERSTELLAR)', color: 0xc084fc },
    { id: 'voyager2', name: 'Voyager 2 (Interstellar)', site: 'Outer Heliosheath · 136.2 AU', lat: -59.8, lon: 301.0, year: 1977, status: 'ACTIVE (INTERSTELLAR)', color: 0xc084fc },
    { id: 'jwst', name: 'James Webb Space Telescope', site: 'Sun-Earth L2 Halo Orbit · 1.5M km', lat: 28.5, lon: 110.4, year: 2021, status: 'ACTIVE (OPERATIONAL)', color: 0x38bdf8 },
    { id: 'pioneer10', name: 'Pioneer 10', site: 'Outer Heliosphere · 135 AU · Taurus', lat: 26.1, lon: 77.2, year: 1972, status: 'SILENT (PIONEER PLAQUE)', color: 0x9c9790 },
    { id: 'newhorizons', name: 'New Horizons', site: 'Kuiper Belt · 58.4 AU · Sagittarius', lat: -22.3, lon: 285.6, year: 2006, status: 'ACTIVE (EXTENDED MISSION)', color: 0x6cdc9a }
  ];

  let currentSitesData = marsSitesData;
  const siteMarkers = [];
  const siteGroup = new THREE.Group();
  globeGroup.add(siteGroup);

  function populateSiteMarkers(sites) {
    // Clear existing pins
    while (siteGroup.children.length > 0) {
      siteGroup.remove(siteGroup.children[0]);
    }
    siteMarkers.length = 0;
    currentSitesData = sites;

    sites.forEach(site => {
      const pos = latLonToVector(site.lat, site.lon, PLANET_RADIUS);
      const normal = pos.clone().normalize();
      const pinGroup = new THREE.Group();
      pinGroup.position.copy(pos);
      pinGroup.userData = site;

      const stemHeight = 0.14;
      const stemGeo = new THREE.CylinderGeometry(0.008, 0.008, stemHeight, 8);
      stemGeo.translate(0, stemHeight / 2, 0);
      const stemMat = new THREE.MeshBasicMaterial({ color: site.color });
      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      pinGroup.add(stemMesh);

      const headGeo = new THREE.SphereGeometry(0.026, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: site.color });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.copy(normal.clone().multiplyScalar(stemHeight));
      pinGroup.add(headMesh);

      const ringGeo = new THREE.RingGeometry(0.02, 0.038, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: site.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      pinGroup.add(ringMesh);

      siteGroup.add(pinGroup);
      siteMarkers.push({ group: pinGroup, ring: ringMesh, head: headMesh, data: site });
    });
  }
  populateSiteMarkers(marsSitesData);

  // --- 3D TRAVERSE ROUTE ---
  let routeLine = null;
  const marsRouteWaypoints = [
    { lat: 18.4446, lon: 77.4509, name: 'WP-01 BASE' },
    { lat: 18.4512, lon: 77.4731, name: 'WP-02 DELTA' },
    { lat: 18.4690, lon: 77.4890, name: 'WP-03 SAMPLE' }
  ];
  const moonRouteWaypoints = [
    { lat: 26.1322, lon: 3.6339, name: 'WP-01 FALCON LM' },
    { lat: 26.1450, lon: 3.6120, name: 'WP-02 RILLE OVERLOOK' },
    { lat: 26.0980, lon: 3.6580, name: 'WP-03 GENESIS ROCK' }
  ];
  const deepspaceRouteWaypoints = [
    { lat: 0, lon: 0, name: 'WP-01 EARTH DEPARTURE' },
    { lat: 14.5, lon: 42.0, name: 'WP-02 LUNAR GRAVITY ASSIST' },
    { lat: 28.5, lon: 110.4, name: 'WP-03 SUN-EARTH L2 INSERTION' }
  ];

  function render3DRoute(waypoints = (currentWorld === 'moon' ? moonRouteWaypoints : currentWorld === 'deepspace' ? deepspaceRouteWaypoints : marsRouteWaypoints)) {
    if (routeLine) globeGroup.remove(routeLine);
    if (!waypoints || waypoints.length < 2) return;
    const pts = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = latLonToVector(waypoints[i].lat, waypoints[i].lon, PLANET_RADIUS * 1.004);
      const p2 = latLonToVector(waypoints[i + 1].lat, waypoints[i + 1].lon, PLANET_RADIUS * 1.004);
      for (let step = 0; step <= 8; step++) {
        const alpha = step / 8;
        const pt = p1.clone().lerp(p2, alpha).normalize().multiplyScalar(PLANET_RADIUS * 1.004);
        pts.push(pt);
      }
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({
      color: currentWorld === 'moon' ? 0x58c6ff : currentWorld === 'deepspace' ? 0xc084fc : 0xf0643d,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });
    routeLine = new THREE.Line(lineGeo, lineMat);
    globeGroup.add(routeLine);
  }
  render3DRoute(marsRouteWaypoints);

  // --- 3D RELIEF MESHES: JEZERO CRATER (MARS) & HADLEY RILLE (MOON) ---
  // Mars: Jezero Delta Relief
  const jezeroGeo = new THREE.PlaneGeometry(2.8, 2.2, 90, 70);
  const posAttrMars = jezeroGeo.attributes.position;
  for (let i = 0; i < posAttrMars.count; i++) {
    const x = posAttrMars.getX(i);
    const y = posAttrMars.getY(i);
    const distToCenter = Math.hypot(x, y);
    let z = 0;
    if (distToCenter < 0.65) {
      z = -0.18 + Math.cos((distToCenter / 0.65) * Math.PI) * 0.08;
    } else if (distToCenter < 0.88) {
      z = Math.sin(((distToCenter - 0.65) / 0.23) * Math.PI) * 0.14;
    } else {
      z = (Math.sin(x * 6) + Math.cos(y * 6)) * 0.02;
    }
    if (x > -0.65 && x < 0.1 && Math.abs(y) < 0.28) {
      z += 0.05 * (1 - Math.abs(y) / 0.28);
    }
    posAttrMars.setZ(i, z);
  }
  jezeroGeo.computeVertexNormals();

  const jezeroCanvas = document.createElement('canvas');
  jezeroCanvas.width = 512;
  jezeroCanvas.height = 512;
  const jCtx = jezeroCanvas.getContext('2d');
  const jGrad = jCtx.createRadialGradient(256, 256, 30, 256, 256, 240);
  jGrad.addColorStop(0, '#59291f');
  jGrad.addColorStop(0.55, '#3b1c16');
  jGrad.addColorStop(0.75, '#8c3c28');
  jGrad.addColorStop(1, '#2e1511');
  jCtx.fillStyle = jGrad;
  jCtx.fillRect(0, 0, 512, 512);
  jCtx.strokeStyle = 'rgba(240, 100, 61, 0.28)';
  jCtx.lineWidth = 1.5;
  for (let r = 40; r < 240; r += 26) {
    jCtx.beginPath();
    jCtx.arc(256, 256, r, 0, Math.PI * 2);
    jCtx.stroke();
  }
  jCtx.strokeStyle = '#f0643d';
  jCtx.lineWidth = 2.5;
  jCtx.beginPath();
  jCtx.moveTo(80, 256);
  jCtx.bezierCurveTo(160, 240, 220, 250, 280, 260);
  jCtx.stroke();

  const jezeroMat = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(jezeroCanvas),
    roughness: 0.82,
    metalness: 0.05,
    flatShading: true
  });
  const jezeroMesh = new THREE.Mesh(jezeroGeo, jezeroMat);
  jezeroMesh.rotation.x = -Math.PI / 2.4;
  reliefGroup.add(jezeroMesh);

  // Moon: Hadley Rille Sinuous Canyon & Apennine Front Relief
  const hadleyGeo = new THREE.PlaneGeometry(2.8, 2.2, 90, 70);
  const posAttrMoon = hadleyGeo.attributes.position;
  for (let i = 0; i < posAttrMoon.count; i++) {
    const x = posAttrMoon.getX(i);
    const y = posAttrMoon.getY(i);
    // Sinuous canyon curving across the x-axis: center at y = sin(x*3)*0.35
    const rilleY = Math.sin(x * 2.8) * 0.32;
    const distToRille = Math.abs(y - rilleY);
    let z = 0;
    // Rille gorge channel (steep drop)
    if (distToRille < 0.18) {
      z = -0.22 * Math.cos((distToRille / 0.18) * (Math.PI / 2));
    }
    // Montes Apenninus mountain range rising on the positive-x side
    if (x > 0.2) {
      z += Math.sin(((x - 0.2) / 1.0) * Math.PI) * 0.24 + Math.cos(y * 4) * 0.04;
    }
    // Regolith undulations
    z += (Math.sin(x * 5) + Math.cos(y * 5)) * 0.015;
    posAttrMoon.setZ(i, z);
  }
  hadleyGeo.computeVertexNormals();

  const hadleyCanvas = document.createElement('canvas');
  hadleyCanvas.width = 512;
  hadleyCanvas.height = 512;
  const hCtx = hadleyCanvas.getContext('2d');
  const hGrad = hCtx.createLinearGradient(0, 0, 512, 512);
  hGrad.addColorStop(0, '#2c2e33');
  hGrad.addColorStop(0.4, '#3e4148');
  hGrad.addColorStop(0.7, '#6b6e76');
  hGrad.addColorStop(1, '#8f939e');
  hCtx.fillStyle = hGrad;
  hCtx.fillRect(0, 0, 512, 512);
  // Sinuous rille gorge line
  hCtx.strokeStyle = '#58c6ff';
  hCtx.lineWidth = 3;
  hCtx.beginPath();
  hCtx.moveTo(40, 256 + Math.sin(-1.4 * 2.8) * 80);
  for (let px = 40; px <= 480; px += 20) {
    const nx = (px / 512) * 2.8 - 1.4;
    const ny = Math.sin(nx * 2.8) * 0.32;
    const py = 256 - ny * 300;
    hCtx.lineTo(px, py);
  }
  hCtx.stroke();

  const hadleyMat = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(hadleyCanvas),
    roughness: 0.78,
    metalness: 0.08,
    flatShading: true
  });
  const hadleyMesh = new THREE.Mesh(hadleyGeo, hadleyMat);
  hadleyMesh.rotation.x = -Math.PI / 2.4;
  hadleyMesh.visible = false;
  reliefGroup.add(hadleyMesh);

  // 3. Deep Space Sun-Earth L2 Gravitational Potential Relief
  const lagrangeGeo = new THREE.PlaneGeometry(2.8, 2.8, 70, 70);
  const posAttrLagrange = lagrangeGeo.attributes.position;
  for (let i = 0; i < posAttrLagrange.count; i++) {
    const x = posAttrLagrange.getX(i);
    const y = posAttrLagrange.getY(i);
    const dEarth = Math.sqrt(x * x + y * y);
    const dSun = Math.sqrt((x + 2.2) * (x + 2.2) + y * y);
    let pot = -0.16 / (dEarth + 0.32) - 0.32 / (dSun + 0.75);
    pot += 0.07 * (x * x + y * y);
    posAttrLagrange.setZ(i, pot * 0.45);
  }
  lagrangeGeo.computeVertexNormals();

  const lagrangeCanvas = document.createElement('canvas');
  lagrangeCanvas.width = 512;
  lagrangeCanvas.height = 512;
  const lCtx = lagrangeCanvas.getContext('2d');
  const lGrad = lCtx.createRadialGradient(256, 256, 20, 256, 256, 250);
  lGrad.addColorStop(0, '#130d24');
  lGrad.addColorStop(0.5, '#24143d');
  lGrad.addColorStop(1, '#080512');
  lCtx.fillStyle = lGrad;
  lCtx.fillRect(0, 0, 512, 512);

  lCtx.strokeStyle = 'rgba(192, 132, 252, 0.45)';
  lCtx.lineWidth = 1.5;
  for (let r = 25; r < 240; r += 26) {
    lCtx.beginPath();
    lCtx.arc(256, 256, r, 0, Math.PI * 2);
    lCtx.stroke();
  }
  lCtx.strokeStyle = '#38bdf8';
  lCtx.lineWidth = 2.5;
  lCtx.beginPath();
  lCtx.ellipse(360, 256, 32, 18, 0, 0, Math.PI * 2);
  lCtx.stroke();
  lCtx.fillStyle = '#38bdf8';
  lCtx.font = 'bold 15px "DM Mono", monospace';
  lCtx.fillText('L2 HALO ORBIT (JWST)', 260, 225);

  const lagrangeMat = new THREE.MeshStandardMaterial({
    map: new THREE.CanvasTexture(lagrangeCanvas),
    roughness: 0.65,
    metalness: 0.25,
    flatShading: true
  });
  const lagrangeMesh = new THREE.Mesh(lagrangeGeo, lagrangeMat);
  lagrangeMesh.rotation.x = -Math.PI / 2.3;
  lagrangeMesh.visible = false;
  reliefGroup.add(lagrangeMesh);

  // --- RAYCASTING & INTERACTION ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredSite = null;
  const tooltip = hudOverlay.querySelector('#minimap-tooltip');

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const targets = siteMarkers.map(m => m.head);
    const intersects = raycaster.intersectObjects(targets, false);

    if (intersects.length > 0) {
      canvas.style.cursor = 'pointer';
      const hit = intersects[0].object;
      const marker = siteMarkers.find(m => m.head === hit);
      if (marker && marker.data) {
        hoveredSite = marker.data;
        tooltip.innerHTML = `
          <strong>${hoveredSite.name}</strong> (${hoveredSite.year})<br/>
          <span>${hoveredSite.site} · LAT ${hoveredSite.lat}°, LON ${hoveredSite.lon}°</span><br/>
          <small>Status: ${hoveredSite.status} · Click to Focus</small>
        `;
        tooltip.style.left = `${e.clientX - rect.left + 14}px`;
        tooltip.style.top = `${e.clientY - rect.top - 12}px`;
        tooltip.classList.add('visible');
      }
    } else {
      canvas.style.cursor = 'grab';
      hoveredSite = null;
      tooltip.classList.remove('visible');
    }
  }

  function onPointerDown() {
    canvas.style.cursor = 'grabbing';
  }

  function onPointerUp() {
    canvas.style.cursor = 'grab';
    if (hoveredSite) {
      focusSite(hoveredSite.id);
      if (onSiteSelect) onSiteSelect(hoveredSite.id);
    }
  }

  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mouseup', onPointerUp);

  // --- CAMERA INTERPOLATION / FOCUS ---
  let targetCamPos = null;
  let targetLookAt = null;

  function focusSite(siteId) {
    const target = currentSitesData.find(s => s.id === siteId) || currentSitesData[0];
    if (!target) return;
    const surfacePos = latLonToVector(target.lat, target.lon, PLANET_RADIUS);
    const normal = surfacePos.clone().normalize();
    targetCamPos = normal.clone().multiplyScalar(2.7);
    targetLookAt = new THREE.Vector3(0, 0, 0);

    const hudCoord = hudOverlay.querySelector('#hud-coord-val');
    if (hudCoord) {
      hudCoord.innerHTML = `${target.name.toUpperCase()} · ${target.site} · LAT ${target.lat.toFixed(2)}° · LON ${target.lon.toFixed(2)}°`;
    }
    if (onCoordinateUpdate) {
      onCoordinateUpdate(target.lat, target.lon);
    }
  }

  function resetView() {
    if (currentWorld === 'moon') {
      targetCamPos = latLonToVector(26.13, 3.63, 2.8);
      targetLookAt = new THREE.Vector3(0, 0, 0);
      const hudCoord = hudOverlay.querySelector('#hud-coord-val');
      if (hudCoord) hudCoord.innerHTML = 'HADLEY RILLE · LAT 26.13° N · LON 3.63° E · APOLLO 15';
    } else {
      targetCamPos = latLonToVector(18.4446, 77.4509, 2.8);
      targetLookAt = new THREE.Vector3(0, 0, 0);
      const hudCoord = hudOverlay.querySelector('#hud-coord-val');
      if (hudCoord) hudCoord.innerHTML = 'JEZERO CRATER · LAT 18.44° N · LON 77.45° E';
    }
  }

  // --- UI CONTROLS BINDING ---
  const btnGlobe = hudOverlay.querySelector('[data-action="globe"]');
  const btnRelief = hudOverlay.querySelector('[data-action="relief"]');
  const btnSpin = hudOverlay.querySelector('[data-action="spin"]');
  const btnReset = hudOverlay.querySelector('[data-action="reset"]');

  btnGlobe.addEventListener('click', () => {
    btnGlobe.classList.add('active');
    btnRelief.classList.remove('active');
    globeGroup.visible = true;
    reliefGroup.visible = false;
    controls.maxDistance = 7.5;
  });

  btnRelief.addEventListener('click', () => {
    btnRelief.classList.add('active');
    btnGlobe.classList.remove('active');
    globeGroup.visible = false;
    reliefGroup.visible = true;
    jezeroMesh.visible = (currentWorld === 'mars');
    hadleyMesh.visible = (currentWorld === 'moon');
    lagrangeMesh.visible = (currentWorld === 'deepspace');
    camera.position.set(0, 2.2, 1.8);
    controls.target.set(0, 0, 0);
    controls.maxDistance = 4.5;
  });

  btnSpin.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnSpin.classList.toggle('active', controls.autoRotate);
    btnSpin.textContent = controls.autoRotate ? 'SPIN: ON' : 'SPIN: OFF';
  });

  btnReset.addEventListener('click', () => {
    if (globeGroup.visible) {
      resetView();
    } else {
      camera.position.set(0, 2.2, 1.8);
      controls.target.set(0, 0, 0);
    }
  });

  // Dynamic Compass Needle Tracker
  const compassNeedle = hudOverlay.querySelector('#compass-needle');
  function updateCompass() {
    if (!compassNeedle) return;
    const northPt = new THREE.Vector3(0, 1, 0).project(camera);
    const centerPt = new THREE.Vector3(0, 0, 0).project(camera);
    const dx = northPt.x - centerPt.x;
    const dy = northPt.y - centerPt.y;
    const angleRad = Math.atan2(dx, dy);
    const angleDeg = (angleRad * 180) / Math.PI;
    compassNeedle.style.transform = `rotate(${angleDeg}deg)`;
  }

  // Layer highlight synchronization with tabs
  function setLayer(layer) {
    if (layer === 'terrain') {
      gridGroup.visible = true;
      gridMat.opacity = 0.35;
      dustCloud.visible = false;
      planetMaterial.bumpScale = currentWorld === 'moon' ? 0.055 : 0.055;
    } else if (layer === 'climate' || layer === 'conditions') {
      gridGroup.visible = true;
      gridMat.opacity = 0.12;
      dustCloud.visible = (currentWorld === 'mars');
      planetMaterial.bumpScale = 0.038;
    } else if (layer === 'sites') {
      gridGroup.visible = true;
      dustCloud.visible = false;
      siteMarkers.forEach(m => {
        m.head.scale.set(1.4, 1.4, 1.4);
      });
    } else if (layer === 'route') {
      dustCloud.visible = false;
      if (routeLine) {
        routeLine.material.opacity = 1.0;
        routeLine.material.color.setHex(currentWorld === 'moon' ? 0x58c6ff : 0xff7744);
      }
      focusSite(currentWorld === 'moon' ? 'apollo15' : 'perseverance');
    }
  }

  // Set World method (Mars ⇄ Moon ⇄ Deep Space)
  function setWorld(world) {
    currentWorld = (world === 'moon' || world === 'deepspace') ? world : 'mars';
    const isMoon = (currentWorld === 'moon');
    const isDeepSpace = (currentWorld === 'deepspace');

    const titleEl = hudOverlay.querySelector('#minimap-title');
    const reliefBtn = hudOverlay.querySelector('#btn-relief');
    const coordVal = hudOverlay.querySelector('#hud-coord-val');

    if (isDeepSpace) {
      planetMaterial.map = deepspaceTextures.diffuseTexture;
      planetMaterial.bumpMap = deepspaceTextures.bumpTexture;
      planetMaterial.bumpScale = 0.02;
      planetMaterial.roughness = 0.70;
      planetMaterial.metalness = 0.35;
      planetMaterial.needsUpdate = true;

      ambientLight.color.setHex(0x181028);
      sunLight.color.setHex(0xc084fc);
      fillLight.color.setHex(0x38bdf8);

      atmosMesh.visible = false;
      dustCloud.visible = false;

      populateSiteMarkers(deepspaceSitesData);
      render3DRoute(deepspaceRouteWaypoints);

      jezeroMesh.visible = false;
      hadleyMesh.visible = false;
      lagrangeMesh.visible = reliefGroup.visible;

      if (titleEl) titleEl.textContent = 'DEEP SPACE 3D // HELIOSPHERE & L2 POINT';
      if (reliefBtn) reliefBtn.textContent = 'LAGRANGE 3D';
      if (coordVal) coordVal.innerHTML = 'SUN-EARTH L2 · 1.5M KM · JWST HALO ORBIT';

      focusSite('jwst');
    } else if (isMoon) {
      planetMaterial.map = moonTextures.diffuseTexture;
      planetMaterial.bumpMap = moonTextures.bumpTexture;
      planetMaterial.bumpScale = 0.055;
      planetMaterial.roughness = 0.90;
      planetMaterial.metalness = 0.04;
      planetMaterial.needsUpdate = true;

      ambientLight.color.setHex(0x161a22);
      sunLight.color.setHex(0xffffff);
      fillLight.color.setHex(0x334466);

      atmosMesh.visible = false;
      dustCloud.visible = false;

      populateSiteMarkers(moonSitesData);
      render3DRoute(moonRouteWaypoints);

      jezeroMesh.visible = false;
      hadleyMesh.visible = reliefGroup.visible;
      lagrangeMesh.visible = false;

      if (titleEl) titleEl.textContent = 'LUNAR ORBITAL 3D // HADLEY-APENNINE SECTOR';
      if (reliefBtn) reliefBtn.textContent = 'RILLE 3D';
      if (coordVal) coordVal.innerHTML = 'HADLEY RILLE · LAT 26.13° N · LON 3.63° E · APOLLO 15';

      focusSite('apollo15');
    } else {
      planetMaterial.map = marsTextures.diffuseTexture;
      planetMaterial.bumpMap = marsTextures.bumpTexture;
      planetMaterial.bumpScale = 0.038;
      planetMaterial.roughness = 0.86;
      planetMaterial.metalness = 0.04;
      planetMaterial.needsUpdate = true;

      ambientLight.color.setHex(0x281914);
      sunLight.color.setHex(0xfff2e6);
      fillLight.color.setHex(0x803820);

      atmosMesh.visible = true;

      populateSiteMarkers(marsSitesData);
      render3DRoute(marsRouteWaypoints);

      jezeroMesh.visible = reliefGroup.visible;
      hadleyMesh.visible = false;
      lagrangeMesh.visible = false;

      if (titleEl) titleEl.textContent = 'MARS ORBITAL 3D // JEZERO SECTOR';
      if (reliefBtn) reliefBtn.textContent = 'CRATER 3D';
      if (coordVal) coordVal.innerHTML = 'JEZERO CRATER · LAT 18.44° N · LON 77.45° E';

      focusSite('perseverance');
    }
  }

  // --- ANIMATION LOOP ---
  let animId = null;
  let pulseTimer = 0;

  function animate() {
    animId = requestAnimationFrame(animate);
    pulseTimer += 0.03;

    if (targetCamPos) {
      camera.position.lerp(targetCamPos, 0.06);
      controls.target.lerp(targetLookAt, 0.06);
      if (camera.position.distanceTo(targetCamPos) < 0.04) {
        targetCamPos = null;
        targetLookAt = null;
      }
    }

    controls.update();
    updateCompass();

    siteMarkers.forEach((m, idx) => {
      if (m.data.status.includes('ACTIVE') || m.data.status.includes('LRV')) {
        const s = 1.0 + Math.sin(pulseTimer * 3 + idx) * 0.45;
        m.ring.scale.set(s, s, s);
        m.ring.material.opacity = 0.9 - (s - 1.0) * 0.8;
      }
    });

    if (dustCloud.visible) {
      dustCloud.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w && h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
  }
  window.addEventListener('resize', onResize);

  return {
    destroy() {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onPointerMove);
      canvas.removeEventListener('mousedown', onPointerDown);
      canvas.removeEventListener('mouseup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    },
    setLayer,
    focusSite,
    setWorld,
    updateRoute(route) {
      if (route && route.waypoints) {
        render3DRoute(route.waypoints);
      }
    }
  };
}

/**
 * Procedural generation of Mars Diffuse and Bump textures
 */
function generateMarsTextures() {
  const width = 2048;
  const height = 1024;

  const dCanvas = document.createElement('canvas');
  dCanvas.width = width;
  dCanvas.height = height;
  const dCtx = dCanvas.getContext('2d');

  const bCanvas = document.createElement('canvas');
  bCanvas.width = width;
  bCanvas.height = height;
  const bCtx = bCanvas.getContext('2d');

  const baseGrad = dCtx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#5a2d22');
  baseGrad.addColorStop(0.18, '#8c3d28');
  baseGrad.addColorStop(0.5, '#b05332');
  baseGrad.addColorStop(0.82, '#823724');
  baseGrad.addColorStop(1, '#4e241c');
  dCtx.fillStyle = baseGrad;
  dCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  const mariaFeatures = [
    { x: 0.68 * width, y: 0.44 * height, rx: 160, ry: 130, color: '#381c15', depth: -35 },
    { x: 0.70 * width, y: 0.72 * height, rx: 190, ry: 160, color: '#44221a', depth: -45 },
    { x: 0.38 * width, y: 0.32 * height, rx: 240, ry: 140, color: '#3f1f18', depth: -30 },
    { x: 0.52 * width, y: 0.55 * height, rx: 220, ry: 70,  color: '#341913', depth: -25 },
    { x: 0.18 * width, y: 0.58 * height, rx: 210, ry: 110, color: '#3b1c16', depth: -25 }
  ];

  mariaFeatures.forEach(feat => {
    const grad = dCtx.createRadialGradient(feat.x, feat.y, 10, feat.x, feat.y, feat.rx);
    grad.addColorStop(0, feat.color);
    grad.addColorStop(0.65, feat.color + 'aa');
    grad.addColorStop(1, 'transparent');
    dCtx.fillStyle = grad;
    dCtx.beginPath();
    dCtx.ellipse(feat.x, feat.y, feat.rx, feat.ry, 0, 0, Math.PI * 2);
    dCtx.fill();

    const bGrad = bCtx.createRadialGradient(feat.x, feat.y, 10, feat.x, feat.y, feat.rx);
    const bVal = Math.max(0, 128 + feat.depth);
    bGrad.addColorStop(0, `rgb(${bVal},${bVal},${bVal})`);
    bGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.ellipse(feat.x, feat.y, feat.rx, feat.ry, 0, 0, Math.PI * 2);
    bCtx.fill();
  });

  // Valles Marineris Canyon
  dCtx.strokeStyle = '#27120e';
  dCtx.lineWidth = 14;
  dCtx.beginPath();
  dCtx.moveTo(0.25 * width, 0.53 * height);
  dCtx.bezierCurveTo(0.32 * width, 0.55 * height, 0.38 * width, 0.56 * height, 0.44 * width, 0.52 * height);
  dCtx.stroke();

  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 14;
  bCtx.beginPath();
  bCtx.moveTo(0.25 * width, 0.53 * height);
  bCtx.bezierCurveTo(0.32 * width, 0.55 * height, 0.38 * width, 0.56 * height, 0.44 * width, 0.52 * height);
  bCtx.stroke();

  // Tharsis Volcanoes
  const volcanoes = [
    { x: 0.14 * width, y: 0.42 * height, r: 42, heightVal: 80 },
    { x: 0.22 * width, y: 0.48 * height, r: 24, heightVal: 50 },
    { x: 0.20 * width, y: 0.54 * height, r: 24, heightVal: 50 },
    { x: 0.18 * width, y: 0.60 * height, r: 24, heightVal: 50 }
  ];
  volcanoes.forEach(v => {
    const vGrad = dCtx.createRadialGradient(v.x, v.y, 2, v.x, v.y, v.r);
    vGrad.addColorStop(0, '#753424');
    vGrad.addColorStop(0.4, '#c25e3b');
    vGrad.addColorStop(1, 'transparent');
    dCtx.fillStyle = vGrad;
    dCtx.beginPath();
    dCtx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
    dCtx.fill();

    const bGrad = bCtx.createRadialGradient(v.x, v.y, 2, v.x, v.y, v.r);
    bGrad.addColorStop(0, `rgb(${128 + v.heightVal},${128 + v.heightVal},${128 + v.heightVal})`);
    bGrad.addColorStop(0.8, '#808080');
    bGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
    bCtx.fill();
  });

  // Polar Ice Caps
  const npGrad = dCtx.createRadialGradient(width / 2, 0, 5, width / 2, 0, 95);
  npGrad.addColorStop(0, '#f2f8fc');
  npGrad.addColorStop(0.55, '#c8dfe8');
  npGrad.addColorStop(0.85, '#896458');
  npGrad.addColorStop(1, 'transparent');
  dCtx.fillStyle = npGrad;
  dCtx.fillRect(0, 0, width, 110);

  const spGrad = dCtx.createRadialGradient(width / 2, height, 5, width / 2, height, 90);
  spGrad.addColorStop(0, '#f2f8fc');
  spGrad.addColorStop(0.55, '#c8dfe8');
  spGrad.addColorStop(0.85, '#7b5346');
  spGrad.addColorStop(1, 'transparent');
  dCtx.fillStyle = spGrad;
  dCtx.fillRect(0, height - 105, width, 105);

  // Impact Craters
  for (let i = 0; i < 45; i++) {
    const cx = Math.random() * width;
    const cy = 0.15 * height + Math.random() * 0.7 * height;
    const cr = Math.random() * 18 + 5;
    bCtx.strokeStyle = '#b0b0b0';
    bCtx.lineWidth = 2.5;
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    bCtx.stroke();
    bCtx.fillStyle = '#656565';
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr - 1, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Regolith noise
  const imgData = dCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 8) {
    const noise = (Math.random() - 0.5) * 14;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5));
  }
  dCtx.putImageData(imgData, 0, 0);

  const diffuseTexture = new THREE.CanvasTexture(dCanvas);
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;
  const bumpTexture = new THREE.CanvasTexture(bCanvas);

  return { diffuseTexture, bumpTexture };
}

/**
 * Procedural generation of Lunar Surface Diffuse and Bump textures
 * Generates dark basaltic lunar Maria (Tranquillitatis, Imbrium, Procellarum, Serenitatis, Crisium),
 * bright anorthosite Highlands, prominent high-albedo crater ray systems (Tycho, Copernicus, Kepler),
 * and rugged impact crater topography.
 */
function generateMoonTextures() {
  const width = 2048;
  const height = 1024;

  const dCanvas = document.createElement('canvas');
  dCanvas.width = width;
  dCanvas.height = height;
  const dCtx = dCanvas.getContext('2d');

  const bCanvas = document.createElement('canvas');
  bCanvas.width = width;
  bCanvas.height = height;
  const bCtx = bCanvas.getContext('2d');

  // 1. Base Lunar Highlands Anorthosite Gradient (Pale silver-gray)
  const highlandGrad = dCtx.createLinearGradient(0, 0, 0, height);
  highlandGrad.addColorStop(0, '#787a80');
  highlandGrad.addColorStop(0.2, '#92959c');
  highlandGrad.addColorStop(0.5, '#a4a7af');
  highlandGrad.addColorStop(0.8, '#8e9198');
  highlandGrad.addColorStop(1, '#74767c');
  dCtx.fillStyle = highlandGrad;
  dCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // 2. Dark Basaltic Maria (Ancient lava flooding plains)
  const lunarMaria = [
    // Oceanus Procellarum (Ocean of Storms - massive western dark expanse)
    { x: 0.28 * width, y: 0.46 * height, rx: 270, ry: 230, color: '#27292c', depth: -36 },
    // Mare Imbrium (Sea of Rains - Apollo 15 Hadley site on southeast rim)
    { x: 0.38 * width, y: 0.33 * height, rx: 170, ry: 145, color: '#212326', depth: -42 },
    // Mare Serenitatis (Sea of Serenity)
    { x: 0.52 * width, y: 0.36 * height, rx: 125, ry: 115, color: '#242629', depth: -32 },
    // Mare Tranquillitatis (Sea of Tranquility - Apollo 11 touchdown site)
    { x: 0.58 * width, y: 0.47 * height, rx: 135, ry: 115, color: '#25272a', depth: -30 },
    // Mare Crisium (Sea of Crises - sharp circular basin on eastern limb)
    { x: 0.70 * width, y: 0.42 * height, rx: 90, ry: 80, color: '#202225', depth: -38 },
    // Mare Nubium & Humorum (Southern maria)
    { x: 0.36 * width, y: 0.65 * height, rx: 140, ry: 120, color: '#282a2d', depth: -28 },
    // Mare Fecunditatis & Nectaris
    { x: 0.63 * width, y: 0.62 * height, rx: 130, ry: 110, color: '#292b2e', depth: -28 },
    // South Pole-Aitken Basin (Far side giant impact depression)
    { x: 0.88 * width, y: 0.76 * height, rx: 230, ry: 170, color: '#2e3034', depth: -48 }
  ];

  lunarMaria.forEach(feat => {
    const grad = dCtx.createRadialGradient(feat.x, feat.y, 15, feat.x, feat.y, feat.rx);
    grad.addColorStop(0, feat.color);
    grad.addColorStop(0.7, feat.color + 'ee');
    grad.addColorStop(1, 'transparent');
    dCtx.fillStyle = grad;
    dCtx.beginPath();
    dCtx.ellipse(feat.x, feat.y, feat.rx, feat.ry, 0, 0, Math.PI * 2);
    dCtx.fill();

    const bGrad = bCtx.createRadialGradient(feat.x, feat.y, 15, feat.x, feat.y, feat.rx);
    const bVal = Math.max(0, 128 + feat.depth);
    bGrad.addColorStop(0, `rgb(${bVal},${bVal},${bVal})`);
    bGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.ellipse(feat.x, feat.y, feat.rx, feat.ry, 0, 0, Math.PI * 2);
    bCtx.fill();
  });

  // 3. High-Albedo Impact Crater Ray Systems (Tycho, Copernicus, Kepler)
  // Tycho Crater Rays (Shooting across southern hemisphere)
  const tychoX = 0.48 * width;
  const tychoY = 0.73 * height;
  dCtx.strokeStyle = 'rgba(235, 238, 245, 0.42)';
  dCtx.lineWidth = 3.5;
  for (let a = 0; a < 24; a++) {
    const angle = (a / 24) * Math.PI * 2;
    const rayLength = 320 + Math.random() * 380;
    dCtx.beginPath();
    dCtx.moveTo(tychoX, tychoY);
    dCtx.lineTo(tychoX + Math.cos(angle) * rayLength, tychoY + Math.sin(angle) * rayLength);
    dCtx.stroke();
  }

  // Copernicus Crater Rays
  const copX = 0.37 * width;
  const copY = 0.45 * height;
  dCtx.strokeStyle = 'rgba(230, 234, 242, 0.35)';
  dCtx.lineWidth = 2.5;
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    const rayLength = 140 + Math.random() * 160;
    dCtx.beginPath();
    dCtx.moveTo(copX, copY);
    dCtx.lineTo(copX + Math.cos(angle) * rayLength, copY + Math.sin(angle) * rayLength);
    dCtx.stroke();
  }

  // Prominent Bright Crater Bullets
  const brightCraters = [
    { x: tychoX, y: tychoY, r: 18, rimH: 70 },
    { x: copX, y: copY, r: 14, rimH: 55 },
    { x: 0.30 * width, y: 0.46 * height, r: 10, rimH: 45 }, // Kepler
    { x: 0.25 * width, y: 0.38 * height, r: 11, rimH: 60 }  // Aristarchus
  ];
  brightCraters.forEach(c => {
    // Diffuse brilliant white center
    const cGrad = dCtx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r * 1.5);
    cGrad.addColorStop(0, '#ffffff');
    cGrad.addColorStop(0.4, '#d8dbe2');
    cGrad.addColorStop(1, 'transparent');
    dCtx.fillStyle = cGrad;
    dCtx.beginPath();
    dCtx.arc(c.x, c.y, c.r * 1.5, 0, Math.PI * 2);
    dCtx.fill();

    // Bump raised rim
    const bGrad = bCtx.createRadialGradient(c.x, c.y, 2, c.x, c.y, c.r);
    bGrad.addColorStop(0, `rgb(${128 + c.rimH},${128 + c.rimH},${128 + c.rimH})`);
    bGrad.addColorStop(0.8, '#808080');
    bGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    bCtx.fill();
  });

  // 4. Heavily Pockmarked Impact Craters across Lunar Highlands
  for (let i = 0; i < 75; i++) {
    const cx = Math.random() * width;
    const cy = 0.08 * height + Math.random() * 0.84 * height;
    const cr = Math.random() * 22 + 4;

    // Raised crater rim
    bCtx.strokeStyle = '#c8c8c8';
    bCtx.lineWidth = Math.max(1.8, cr * 0.18);
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    bCtx.stroke();

    // Deep shadowed crater floor
    bCtx.fillStyle = '#424242';
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr - 1.5, 0, Math.PI * 2);
    bCtx.fill();

    // Subtle diffuse rim highlight
    dCtx.strokeStyle = 'rgba(235, 238, 245, 0.25)';
    dCtx.lineWidth = 1.2;
    dCtx.beginPath();
    dCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    dCtx.stroke();
  }

  // 5. Powdery Lunar Regolith Noise Grain
  const imgData = dCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 8) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  dCtx.putImageData(imgData, 0, 0);

  const diffuseTexture = new THREE.CanvasTexture(dCanvas);
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;
  const bumpTexture = new THREE.CanvasTexture(bCanvas);

  return { diffuseTexture, bumpTexture };
}

/**
 * Procedural generation of Deep Space Celestial Sphere textures
 * Generates dark cosmic void background, swirling galactic plane / Milky Way band,
 * celestial coordinate grid (RA/Dec), and radiant star clusters / deep-space nebulae.
 */
function generateDeepSpaceTextures() {
  const width = 2048;
  const height = 1024;

  const dCanvas = document.createElement('canvas');
  dCanvas.width = width;
  dCanvas.height = height;
  const dCtx = dCanvas.getContext('2d');

  const bCanvas = document.createElement('canvas');
  bCanvas.width = width;
  bCanvas.height = height;
  const bCtx = bCanvas.getContext('2d');

  // 1. Cosmic Void Background
  const baseGrad = dCtx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#04020a');
  baseGrad.addColorStop(0.3, '#0b0618');
  baseGrad.addColorStop(0.5, '#130a28');
  baseGrad.addColorStop(0.7, '#0b0618');
  baseGrad.addColorStop(1, '#04020a');
  dCtx.fillStyle = baseGrad;
  dCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  // 2. Swirling Galactic Plane / Milky Way Band across the celestial sphere
  dCtx.save();
  dCtx.translate(width / 2, height / 2);
  dCtx.rotate(-Math.PI / 6);
  const mwGrad = dCtx.createLinearGradient(-width, 0, width, 0);
  mwGrad.addColorStop(0, 'rgba(192, 132, 252, 0.0)');
  mwGrad.addColorStop(0.28, 'rgba(147, 51, 234, 0.18)');
  mwGrad.addColorStop(0.45, 'rgba(192, 132, 252, 0.35)');
  mwGrad.addColorStop(0.50, 'rgba(56, 189, 248, 0.42)');
  mwGrad.addColorStop(0.55, 'rgba(251, 191, 36, 0.30)');
  mwGrad.addColorStop(0.72, 'rgba(126, 34, 206, 0.18)');
  mwGrad.addColorStop(1, 'rgba(192, 132, 252, 0.0)');
  dCtx.fillStyle = mwGrad;
  dCtx.fillRect(-width, -180, width * 2, 360);
  dCtx.restore();

  // 3. Celestial Grid Lines (Right Ascension & Declination)
  dCtx.strokeStyle = 'rgba(192, 132, 252, 0.15)';
  dCtx.lineWidth = 1;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    dCtx.beginPath();
    dCtx.moveTo(0, y);
    dCtx.lineTo(width, y);
    dCtx.stroke();
  }
  for (let lon = 0; lon <= 360; lon += 30) {
    const x = (lon / 360) * width;
    dCtx.beginPath();
    dCtx.moveTo(x, 0);
    dCtx.lineTo(x, height);
    dCtx.stroke();
  }

  // 4. Bright Celestial Stars & Constellation Nodes
  dCtx.fillStyle = '#ffffff';
  for (let s = 0; s < 450; s++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height;
    const sr = Math.random() * 2.2 + 0.6;
    dCtx.beginPath();
    dCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    dCtx.fill();
    if (sr > 1.8) {
      dCtx.fillStyle = 'rgba(192, 132, 252, 0.35)';
      dCtx.beginPath();
      dCtx.arc(sx, sy, sr * 3, 0, Math.PI * 2);
      dCtx.fill();
      dCtx.fillStyle = '#ffffff';
    }
  }

  const diffuseTexture = new THREE.CanvasTexture(dCanvas);
  diffuseTexture.wrapS = THREE.RepeatWrapping;
  diffuseTexture.wrapT = THREE.ClampToEdgeWrapping;
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;
  const bumpTexture = new THREE.CanvasTexture(bCanvas);

  return { diffuseTexture, bumpTexture };
}
