// Game constants, map definitions and map selection.

const CONFIG = {
  seed: 1337,
  trailLength: 2600,
  trailHalfWidth: 1.9,
  chunkSize: 128,
  chunkSegments: 96,
  chunkLoadRadius: 520,
  treeHiDistance: 190,
  grassDistance: 115,
  sunElevationDeg: 9.5,
  sunAzimuthDeg: 232,
  fogDensity: 0.00185,
  maxPixelRatio: 1.5,
  minPixelRatio: 0.6,
  shadowMapSize: 2048,
  shadowExtent: 70,
  gravity: 9.81,
  physicsHz: 120,
};

const MAPS = {
  downhill: {
    id: `downhill`,
    name: `Ridgeline Downhill`,
    kicker: `DOWNHILL · SINGLETRACK`,
    blurb: `2.6 km of golden-hour singletrack. Berms, gaps, drops and kickers all the way down.`,
    stats: [`2.6 KM`, `17 JUMPS`, `BERMS & DROPS`],
    trailLength: 2600,
    trailHalfWidth: 1.9,
    waves: [
      [48, 0.0042, 0],
      [20, 0.011, 1.3],
      [9, 0.03, 0.5],
      [4, 0.061, 2.1],
    ],
    gradient: `mountain`,
    jumpSpacing: 88,
    jumpStart: -90,
    maxJumpCurvature: 0.013,
    jumpOrder: [
      `kicker`,
      `gap`,
      `drop`,
      `gap`,
      `bigGap`,
      `kicker`,
      `table`,
      `gap`,
      `bigGap`,
      `drop`,
      `gap`,
      `table`,
      `bigGap`,
      `kicker`,
    ],
    treeClearance: 2.6,
    respawnSpeed: 7,
  },
  park: {
    id: `park`,
    name: `Big Air Jump Park`,
    kicker: `JUMP PARK · BIG AIR ONLY`,
    blurb: `A wide, fast lane of huge wooden jumps, one after another. Pedal in hard and send it.`,
    stats: [`1.5 KM`, `22 BIG JUMPS`, `NO CORNERS`],
    trailLength: 1500,
    trailHalfWidth: 3.4,
    waves: [
      [7, 0.003, 0.4],
      [2.5, 0.008, 1.2],
    ],
    gradient: `park`,
    jumpSpacing: 64,
    jumpStart: -70,
    maxJumpCurvature: 0.02,
    jumpOrder: [`parkTable`, `parkGap`, `parkTable`, `megaGap`, `parkGap`, `megaTable`, `megaGap`, `parkGap`],
    treeClearance: 14,
    respawnSpeed: 13,
  },
};

function readSelectedMapId() {
  let e = (location.hash || ``).replace(`#`, ``);
  if (MAPS[e]) return e;
  try {
    let e = sessionStorage.getItem(`ridgeline-map`);
    if (MAPS[e]) return e;
  } catch {}
  return `downhill`;
}

const MAP = MAPS[readSelectedMapId()];

(CONFIG.trailLength = MAP.trailLength), (CONFIG.trailHalfWidth = MAP.trailHalfWidth);

function switchMap(e, t = !0) {
  try {
    sessionStorage.setItem(`ridgeline-map`, e), t && sessionStorage.setItem(`ridgeline-autostart`, `1`);
  } catch {}
  (location.hash = e), location.reload();
}

function consumeAutostart() {
  try {
    let e = sessionStorage.getItem(`ridgeline-autostart`) === `1`;
    return sessionStorage.removeItem(`ridgeline-autostart`), e;
  } catch {
    return !1;
  }
}

export { CONFIG, MAP, consumeAutostart, MAPS, switchMap };
