# RIDGELINE

Mountain-bike freeride game (Three.js, runs in the browser). Two maps: **Ridgeline Downhill** and **Big Air Jump Park**.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
```

## Layout

- `index.html`: page shell, HUD/overlay markup, and all CSS
- `assets/game.js`: the whole game (terrain generation, bike physics, tricks/scoring, tank, rendering + bloom) **plus Three.js bundled in**

## About the source

This was pulled from a published artifact, which only had the **production build** (a minified Vite bundle). The original separate source modules weren't included, so `assets/game.js` is that bundle run through Prettier. It's readable and editable, but variable names are minified (`e`, `t`, `Ou()`…). Three.js makes up most of the file; the game code is near the end (search for `pinesHi`, `Tailwhip`, `tank`).

Good next step if you plan to work on it seriously: split the game code out of the bundle, import `three` from npm, and rename things module by module.
