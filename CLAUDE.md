# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**DropSpot – High Ground Vantage Navigator.** A client-only React app: the user photographs the street from a balcony/tower, taps a spot in the photo, and the app projects that pixel to real-world GPS coordinates, then shows a walking route (Leaflet map + Google Maps deep link).

Scaffolded from Google AI Studio (`metadata.json`, `.aistudio/`, app ID in `README.md`). There is no backend.

## Commands

```bash
npm install                              # bun.lock also exists; either works
npm run dev                              # Vite dev server on http://localhost:3000 (binds 0.0.0.0)
npm run build                            # Production build to dist/
npm run lint                             # Type-check only (tsc --noEmit) — no ESLint/Prettier
npx tsx --test src/utils/geoCalc.test.ts # Unit tests (node:test); there is no npm test script
```

Run `npm run lint` and the tests after any change to `src/utils/geoCalc.ts`.

## Stack

React 19 · TypeScript 7 · Vite 8 · Tailwind CSS v4 (via `@tailwindcss/vite`, no config file) · Leaflet (OpenStreetMap tiles) · lucide-react icons.

Declared but currently unused: `@google/genai`, `express`, `dotenv`, `motion`. Don't assume a Gemini integration or server exists.

## Architecture

```
src/
  main.tsx                         # React root
  App.tsx                          # Owns ALL state: photoUrl, vantage, selectedPoint, gpsStatus, UI toggles
  utils/geoCalc.ts                 # Pure math engine — no React, no DOM
  utils/geoCalc.test.ts            # node:test + node:assert/strict
  components/
    PhotoViewfinder.tsx            # Click/tap on photo → normalized { xRatio, yRatio } in 0..1
    VantageCalibrationPanel.tsx    # Floor/height, heading, pitch, FOV sliders; GPS + DeviceOrientation
    RouteMap.tsx                   # Imperative Leaflet map (created/destroyed in useEffect)
    RouteAnalysisCard.tsx          # Distance/ETA stats, waypoint list, Google Maps button
    ProductTourModal.tsx           # First-run tour (localStorage key: dropspot_tour_seen)
  assets/images/                   # Sample high-ground photos
```

**Data flow:** `App` holds a `VantagePoint` + selected click ratios → `useMemo(calculateTargetGroundPoint(...))` → result passed down as props. Child components are presentational and report changes via callbacks (`onChange`, `onPointSelected`, `onFloorChange`); they don't hold shared state.

**Core math (`calculateTargetGroundPoint`):**
- Click offset from image center × half-FOV → yaw/pitch deltas added to `compassHeadingDeg` / `cameraPitchDeg`.
- Depression angle is clamped to `[2°, 89.5°]`; ground distance = `height / tan(depression)`.
- Target coords via great-circle projection (`projectCoordinates`, rounded to 6 decimals).
- `generateShortestWalkingRoute` is a **simulated** L-shaped route, not real routing.

## Conventions

- Angles: degrees everywhere in public APIs; `0° = North`, clockwise. `cameraPitchDeg` is **negative when looking down**.
- Floor ↔ height uses **3 m per floor** (`altitudeMeters = floor * 3`). Keep this consistent across components.
- Defaults: phone FOV 68° horizontal / 54° vertical.
- Named exports for components (`export function X`); `App` is the only default export.
- Styling is Tailwind utility classes inline; mobile-first with `sm:`/`lg:` breakpoints. Fonts: Plus Jakarta Sans (UI), JetBrains Mono (numbers/coords).
- Wrap `localStorage` access in `try/catch` — the app runs inside AI Studio iframes where storage may be blocked.
- Keep `geoCalc.ts` pure and covered by tests; put new math there, not in components.

## Gotchas

- **Do not modify the HMR/watch settings in `vite.config.ts`.** AI Studio sets `DISABLE_HMR=true` to stop flicker during agent edits.
- Reference images via ES imports (`import img from './assets/images/x.jpg'`), never string paths like `'/src/assets/...'` — those work in `vite dev` but are not bundled by `vite build`.
- `esbuild` must stay within Vite 8's peer range (`^0.27 || ^0.28`) or `npm install` fails with ERESOLVE.
- Google Maps directions URLs are built inline in `App.tsx` and `RouteAnalysisCard.tsx` instead of using `getGoogleMapsDirectionsUrl()` from `geoCalc.ts`. Prefer the helper when touching these.
- Leaflet CSS is loaded from unpkg in `index.html`, not imported in JS. Leaflet markers use `L.divIcon` with inline HTML/SVG.
- Geolocation and `DeviceOrientationEvent` require HTTPS (or localhost); iOS needs `DeviceOrientationEvent.requestPermission()` from a user gesture.
- `@/*` path alias maps to the **project root**, not `src/`.

## Environment

Copy `.env.example` → `.env.local`. `GEMINI_API_KEY` and `APP_URL` are injected by AI Studio at runtime; neither is read by the current code. Never commit `.env*` files (already gitignored).
