# Forgepath

Forgepath is an interactive hardware atlas and 3D exploration experience built for the NASA Space Apps Challenge. Explore artifacts from missions to the Moon, Mars, and deep space through an immersive, browser-based interface.

> Current prototype: a Vite-powered frontend with a Three.js scene, mission dashboard, procedural terrain, and a Node.js API that proxies NASA data.

## Highlights

- **Multi-world explorer** — switch between Mars, the Moon, and deep space.
- **Procedural 3D environments** — explore procedural terrain, planetary globes, starfields, and a lunar relief view.
- **Hardware atlas** — browse and inspect Moon, Mars, and deep-space artifacts.
- **Mission telemetry** — view terrain, environment, surface-assets, and route-planning information.
- **Route scoring** — evaluate routes for water, sample, or safe objectives.
- **NASA live-data integrations** — browse Perseverance imagery and NASA Image and Video Library content through the local API.
- **Offline fallback** — cached and bundled mission imagery keep the experience usable when NASA services are unavailable.

## Tech stack

- JavaScript (ES modules)
- HTML and CSS
- [Vite](https://vite.dev/) 6
- [Three.js](https://threejs.org/) for 3D scenes and visualizations
- [Lucide](https://lucide.dev/) for icons
- Node.js API server
- NASA public APIs
- Vercel serverless deployment support

## Project structure

```text
forgepath/
├── api/
│   └── index.js          Vercel serverless API entry point
├── server/
│   └── index.js          Local Node.js API and route handlers
├── src/
│   ├── data/
│   │   ├── client.js     API base configuration
│   │   └── nasa.js       Rover-photo client and offline cache
│   ├── main.js           Application shell and interactions
│   ├── minimap3d.js      3D globe and relief visualizations
│   └── style.css         Responsive visual system
├── index.html
├── slides.html
├── vite.config.js
├── vercel.json
└── package.json
```

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Run locally

Start the Vite frontend and Node.js API together:

```bash
npm run dev
```

The development services are available at:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`

`npm run dev:all` is also available as an explicit alias for the combined development command.

### Optional NASA API configuration

Copy the example environment file and add a key:

```bash
cp .env.example .env
```

```dotenv
NASA_API_KEY=your_nasa_api_key_here
PORT=8787
```

A key is optional. When `NASA_API_KEY` is omitted, the backend uses `DEMO_KEY`. If NASA requests are unavailable or rate-limited, the application uses local fallback data and continues to render the 3D experience.

## Production build

```bash
npm run build
npm run preview
```

The Vite production preview is served on `http://localhost:4173`. The API must be running on port `8787` for backend-backed features in the local preview environment.

## API

The backend is implemented once in `server/index.js` and can run as a local Node server or through the Vercel entry point in `api/index.js`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/mars/missions` | Pathfinder, Curiosity, and Perseverance registry |
| `GET` | `/api/hardware` | Moon, Mars, and deep-space hardware atlas |
| `GET` | `/api/hardware/:id` | Detailed hardware and mission story |
| `GET` | `/api/mars/photos` | Cached NASA Mars Rover Photos proxy |
| `GET` | `/api/live/images?q=<query>` | NASA Image and Video Library search |
| `GET` | `/api/live/apod` | NASA Astronomy Picture of the Day |
| `GET` | `/api/live/overview` | Combined NASA image overview |
| `GET` | `/api/mars/terrain` | Terrain metadata contract |
| `GET` | `/api/mars/map` | Mars exploration layers and route waypoints |
| `GET` | `/api/mars/environment` | Environment telemetry contract; values are simulated |
| `POST` | `/api/routes/score` | Score a water, sample, or safe route |
| `POST` | `/api/messages` | Validate and archive Golden Record-style messages |

## Development roadmap

### Foundation — in progress

- Vite and Three.js baseline
- Procedural terrain and atmospheric scenes
- Multi-world switching and mission dashboard
- Hardware filtering and artifact detail views
- Route-planning interactions

### NASA data expansion

- Replace more generated assets with NASA imagery and elevation products
- Add typed adapters for NASA Eyes, MOLA elevation, and mission metadata
- Add loading states, attribution, and request caching
- Expand offline coverage

### Exploration tools

- Score routes using elevation, slope, science targets, communications, and energy cost
- Add editable waypoints and route comparison
- Persist routes in URL state or local storage

### Accessibility and performance

- Add reduced-motion behavior and keyboard route navigation
- Provide 2D fallbacks for environments without WebGL support
- Add captions and transcripts
- Add GPU-aware quality controls for mobile devices
- Add automated visual smoke tests and performance budgets

## Contributing

Contributions are welcome. Please open an issue to discuss a substantial feature or bug fix before submitting a pull request.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run `npm run build` to verify the production bundle.
5. Open a pull request with a clear summary and testing notes.

## License

Forgepath is available under the [MIT License](LICENSE).

## NASA data attribution

Forgepath uses public NASA APIs and imagery. NASA data remains subject to NASA's applicable usage and attribution policies. Interface telemetry and environment values that are not sourced from NASA are marked as simulated in the application or API responses.
