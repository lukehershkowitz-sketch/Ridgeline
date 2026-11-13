# RIDGELINE

Mountain-bike freeride game for the browser, built on Three.js (r187). Two maps: **Ridgeline Downhill** and **Big Air Jump Park**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
```

## Layout

`index.html` holds the page shell, HUD/overlay markup and all CSS. Game code lives in `src/`, one ES module per system, importing `three` and `three/addons` from npm:

| Module | What it does |
|---|---|
| `main.js` | Entry point: game loop, state machine (title → countdown → riding → finish), wiring |
| `config.js` | Tunables (`CONFIG`), map definitions (`MAPS`), map selection |
| `trail.js` | Trail centreline, terrain height field, jump layout. `groundHeight(x, z)` lives here |
| `terrain.js` | Streaming terrain chunks around the rider |
| `terrainMaterial.js` | Shader patches for trail blending and rock |
| `props.js` | Trees, rocks, grass instancing, collider grid |
| `features.js` | Wooden jumps, start/finish gates, trail markers |
| `physics.js` | `BikePhysics`: ground contact, air, landings, crashes |
| `tricks.js` | `TrickSystem`: trick detection, combos, scoring |
| `bikeModel.js` | Bike and rider meshes plus the pose rig (`BikeRig`) |
| `camera.js` | Chase camera |
| `environment.js` | Sky, sun, fog, lighting |
| `textures.js` | Procedurally painted canvas textures |
| `noise.js` | Seeded PRNG, simplex noise, math helpers |
| `particles.js` | Dust and ambient motes |
| `postfx.js` | Bloom, speed effect, output pass |
| `hud.js` / `input.js` / `audio.js` | DOM HUD, keyboard, synthesized WebAudio |
| `tank.js` | The tank (press T) |

## Provenance

The source was recovered from a minified production build. Module boundaries and top-level names (classes, functions, constants) were restored by hand. **Local variables inside functions are still minified** (`e`, `t`, `n`…), so expect to rename those as you work on a given area. The extraction was checked statement-for-statement against the original bundle, and a headless physics run produces identical results.
