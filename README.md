# Forgepath

Forgepath is an immersive hardware atlas for the NASA Space Apps challenge. It introduces school-age space enthusiasts to the machines humans have left on the Moon, Mars, and in deep space—and the science those machines made possible.

## Run locally

```bash
npm install
npm run dev
```

Run the frontend and backend together (recommended):

```bash
npm run dev:all
```

The Vite app runs on `http://localhost:5173` and the API runs on `http://localhost:8787`.

`npm run dev` also starts both services. If you see `API route not found`, stop any previously running Vite process and restart with `npm run dev`; the client will then call the API directly at port `8787` in development.

Production check:

```bash
npm run build
npm run preview
```

Optional NASA API configuration:

```bash
NASA_API_KEY=your_key_here npm run dev
```

Without a key, the app uses NASA's `DEMO_KEY`; if the request is rate-limited or unavailable, the mission log uses a local fallback and the 3D experience remains usable.

## Architecture

```text
index.html
└── src/
    ├── main.js       App shell, narrative data, Three.js scene, interactions
    └── style.css     Visual system, responsive layout, dashboard components
```

The prototype intentionally uses a procedural Three.js scene instead of shipping large terrain textures. This keeps the first iteration fast and makes the data layer easy to replace with NASA assets later.

### Experience flow

1. **Multi-World Explorer** — Seamless topbar world switcher supporting **Mars** (Jezero Crater), **Moon** (Hadley Rille & Apennines), and **Deep Space** (Sun-Earth L2 Lagrange Point & Interstellar).
2. **Landing / Descent** — Fixed WebGL canvas with procedural topography:
   - **Mars**: Rust-orange basaltic topography, dusty atmospheric haze, and warm sunlight.
   - **Moon**: High-contrast lunar regolith, deep vacuum sky, realistic Earthrise in the celestial background, and sharp unscattered lighting.
   - **Deep Space**: Deep cosmic starfield, nebula clouds, and deep-space telemetry.
3. **Interactive 3D MiniMap & Relief** — Dual-mode 3D globe and relief visualizer:
   - **3D Globe Mode**: Procedural planetary globes with dark lunar maria, bright ejecta rays, crater topography, and pulse-animated landing site pins (Apollo 11, Apollo 15, Apollo 17, Luna 17, Chandrayaan-3, Perseverance, Curiosity, Pathfinder).
   - **3D Relief Mode**: Detailed topographic wireframe mesh depicting the sinuous Hadley Rille collapsed lava canyon and towering Apennine mountain range.
4. **Historical narrative & Artifact stories** — Scroll reveal transitions, hover-driven camera movement across exploration milestones, and rich hardware catalog with filter chips (`ALL`, `MOON`, `MARS`, `DEEP SPACE`).
5. **Mission control** — Dynamic multi-world telemetry panel (Terrain, Environment, Surface Assets, Route Planner) and interactive traverse evaluator (Apollo 15 LRV-1 / Artemis III traverse scoring).

## Development plan

### Phase 1 — Foundation (current)

- Vite + Three.js baseline
- Procedural low-poly terrain and atmospheric scene
- Scroll narrative and responsive dashboard shell
- Mission objective selection and route-planner action

### Phase 2 — NASA data layer

- `src/data/nasa.js` now requests recent Perseverance imagery from the Mars Rover Photos API, with caching and offline fallback.
- Add a typed `src/data/` layer for NASA Eyes, MOLA elevation, and mission metadata.
- Replace generated terrain with tiled elevation/imagery textures and LOD terrain chunks.
- Add loading, offline fallback, attribution, and request caching.

### Phase 3 — Exploration tools

- Implement route scoring from elevation, slope, science targets, communications, and energy cost.
- Add a route editor with waypoints, hover inspection, and compare mode.
- Persist a visitor’s route in URL state or local storage.

### Phase 4 — Storytelling and accessibility

- Drive camera choreography from a declarative timeline rather than section conditionals.
- Add reduced-motion mode, keyboard route navigation, captions/transcripts, and a 2D map fallback for WebGL failures.
- Test mobile GPU budgets and progressively reduce geometry, DPR, and post-processing.

### Phase 5 — Ship

- Add automated visual smoke tests and performance budgets.
- Deploy static build to GitHub Pages, Netlify, or NASA Space Apps hosting.
- Document all NASA data sources and open-source licenses.

## Suggested production structure

```text
src/
├── app/              route state and section orchestration
├── components/       dashboard, story cards, controls
├── data/             NASA API adapters and local fallback data
├── scene/            terrain, camera timeline, labels, post-processing
├── styles/           tokens and component styles
└── main.js
```

The current API adapter is `src/data/nasa.js`. It requests the local backend, which proxies NASA's Mars Rover Photos endpoint, caches successful results for 15 minutes, and exposes a fallback payload for offline/error states.

### Backend endpoints

- `GET /api/health` — service health check
- `GET /api/mars/missions` — Pathfinder, Curiosity, and Perseverance registry
- `GET /api/hardware` — Moon, Mars, and deep-space hardware atlas
- `GET /api/hardware/:id` — artifact construction story, materials, science, and NASA image gallery
- `GET /api/mars/photos?rover=perseverance&sol=1284` — cached NASA image proxy
- `GET /api/live/images?q=Mars+rover` — NASA Image and Video Library search
- `GET /api/live/apod` — NASA Astronomy Picture of the Day
- `GET /api/live/overview` — combined current NASA image overview
- `GET /api/mars/terrain` — terrain metadata contract for future MOLA tiles
- `GET /api/mars/map` — integrated Marswalk layers: MOLA terrain, mission sites, route waypoints, and condition status
- `GET /api/mars/environment` — dashboard telemetry contract; currently marked simulated
- `POST /api/routes/score` — scores a `water`, `sample`, or `safe` objective and returns waypoints
- `POST /api/messages` — validates and archives student Golden Record-style messages

The product is structured around the official challenge question and audience: school-age space enthusiasts can ask **what hardware was left behind, why was it built, who carried the mission, what challenges did it face, and what science did it make possible?** The current atlas includes hardware from the Moon, Mars, and deep space.
