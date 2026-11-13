// Trail centreline, terrain height field and jump layout. Everything that answers "how high is the ground here?".
import { CONFIG, MAP } from './config.js';
import { SimplexNoise, clamp, smoothstep } from './noise.js';

const TRAIL_LENGTH = CONFIG.trailLength;

const TRAIL_HALF_WIDTH = CONFIG.trailHalfWidth;

const terrainNoise = new SimplexNoise(CONFIG.seed);

const detailNoise = new SimplexNoise(CONFIG.seed + 99);

const TRAIL_WAVES = MAP.waves;

function trailCenterX(e) {
  let t = 0;
  for (let [n, r, i] of TRAIL_WAVES) t += n * Math.sin(e * r + i);
  return t;
}

function trailSlopeX(e) {
  let t = 0;
  for (let [n, r, i] of TRAIL_WAVES) t += n * r * Math.cos(e * r + i);
  return t;
}

function trailSlopeX2(e) {
  let t = 0;
  for (let [n, r, i] of TRAIL_WAVES) t -= n * r * r * Math.sin(e * r + i);
  return t;
}

function trailCurvature(e) {
  let t = trailSlopeX(e);
  return trailSlopeX2(e) / (1 + t * t) ** 1.5;
}

function trailElevation(e) {
  if (MAP.gradient === `park`) {
    let t = 0.15 * e + 4 * Math.sin(0.0021 * e);
    return e < -TRAIL_LENGTH && (t += (e + TRAIL_LENGTH) * -0.1), t;
  }
  let t =
      0.17 * e -
      (0.07 / 0.0045) * (Math.cos(0.0045 * e + 0.7) - Math.cos(0.7)) -
      (0.04 / 0.013) * (Math.cos(0.013 * e) - 1),
    n = smoothstep(0.15, 0.6, Math.sin(0.0031 * e + 1));
  return (t += 0.45 * Math.sin(0.21 * e) * n), e < -TRAIL_LENGTH && (t += (e + TRAIL_LENGTH) * -0.08), t;
}

function trailBank(e) {
  return clamp(-24 * ((trailCurvature(e - 6) + trailCurvature(e) + trailCurvature(e + 6)) / 3), -0.62, 0.62);
}

function trailMask(e) {
  return smoothstep(40, 18, e) * smoothstep(-TRAIL_LENGTH - 120, -TRAIL_LENGTH - 80, e);
}

const JUMP_TYPES = {
  kicker: {
    kickLen: 4,
    kickH: 1.25,
    gap: 0,
    deck: 0,
    landLen: 0,
    landH: 0,
    halfW: 1.45,
  },
  gap: {
    kickLen: 3.8,
    kickH: 1.5,
    gap: 6,
    deck: 1.4,
    landLen: 9.5,
    landH: 1.55,
    halfW: 1.6,
    ditch: 1.1,
  },
  bigGap: {
    kickLen: 4.6,
    kickH: 2,
    gap: 8.5,
    deck: 1.6,
    landLen: 12,
    landH: 2.1,
    halfW: 1.8,
    ditch: 1.6,
  },
  drop: {
    kickLen: 5.5,
    kickH: 1.45,
    gap: 0,
    deck: 0,
    landLen: 0,
    landH: 0,
    halfW: 1.5,
    flatTop: 4,
  },
  table: {
    kickLen: 4.2,
    kickH: 1.6,
    gap: 5.5,
    deck: 0,
    landLen: 9,
    landH: 1.1,
    halfW: 1.7,
    table: !0,
  },
  parkTable: {
    kickLen: 6,
    kickH: 2.5,
    gap: 9,
    deck: 0,
    landLen: 15,
    landH: 1.9,
    halfW: 3,
    table: !0,
  },
  parkGap: {
    kickLen: 6.2,
    kickH: 2.7,
    gap: 10,
    deck: 2,
    landLen: 16,
    landH: 2.9,
    halfW: 3,
    ditch: 2,
  },
  megaTable: {
    kickLen: 7,
    kickH: 3.2,
    gap: 12,
    deck: 0,
    landLen: 18,
    landH: 2.5,
    halfW: 3.1,
    table: !0,
  },
  megaGap: {
    kickLen: 7.2,
    kickH: 3.4,
    gap: 12.5,
    deck: 0.4,
    landLen: 19,
    landH: 3.6,
    halfW: 3.1,
    ditch: 2.6,
  },
};

function layoutJumps() {
  let e = [],
    t = MAP.jumpOrder,
    n = 1 / 0;
  for (let r = MAP.jumpStart; r > -TRAIL_LENGTH + 70; r -= 2) {
    let i = t[e.length % t.length],
      a = JUMP_TYPES[i],
      o = a.kickLen + (a.flatTop || 0) + a.gap + a.deck + a.landLen;
    if (n - r < MAP.jumpSpacing) continue;
    if (r - o < -TRAIL_LENGTH + 40) break;
    let s = !0;
    for (let e = -10; e <= o + 10 && s; e += 2)
      Math.abs(trailCurvature(r - e)) > MAP.maxJumpCurvature && (s = !1);
    if (!s || Math.abs(trailSlopeX(r)) > 0.7) continue;
    let c = trailSlopeX(r),
      l = Math.hypot(c, 1),
      u = -c / l,
      d = -1 / l;
    e.push({
      type: i,
      ...a,
      ox: trailCenterX(r),
      oz: r,
      tx: u,
      tz: d,
      total: a.kickLen + (a.flatTop || 0) + a.gap + a.deck + a.landLen,
    }),
      (n = r);
  }
  return e;
}

const JUMPS = layoutJumps();

function toJumpLocal(e, t, n) {
  let r = t - e.ox,
    i = n - e.oz;
  return {
    s: r * e.tx + i * e.tz,
    lat: r * -e.tz + i * e.tx,
  };
}

function jumpProfile(e, t) {
  if (t < 0) return -1;
  if (e.type === `drop`) {
    if (t <= e.kickLen) {
      let n = t / e.kickLen;
      return e.kickH * n * n * (3 - 2 * n);
    }
    return t <= e.kickLen + e.flatTop ? e.kickH : -1;
  }
  if (t <= e.kickLen) {
    let n = t / e.kickLen;
    return e.kickH * n * n;
  }
  if (e.gap <= 0) return -1;
  let n = e.kickLen + e.gap;
  if (t < n) return e.table ? e.landH : -1;
  if (t <= n + e.deck) return e.landH;
  let r = (t - n - e.deck) / e.landLen;
  return r <= 1 ? e.landH * 0.5 * (1 + Math.cos(Math.PI * r)) : -1;
}

function ditchDepth(e, t) {
  let n = 0;
  for (let r of JUMPS) {
    if (!r.ditch || Math.abs(t - r.oz) > 40) continue;
    let { s: i, lat: a } = toJumpLocal(r, e, t);
    if (i <= r.kickLen || i >= r.kickLen + r.gap) continue;
    let o = (i - r.kickLen) / r.gap,
      s = 1 - smoothstep(r.halfW + 1, r.halfW + 4.5, Math.abs(a));
    n += r.ditch * Math.sin(Math.PI * o) ** 0.7 * s;
  }
  return n;
}

function baseTerrainHeight(e, t, n, r) {
  let i = Math.abs(n),
    a = r + (0.3 * Math.sin(0.0023 * t + 0.4) + 0.12 * Math.sin(0.009 * t)) * n;
  return (
    (a += (0.0016 * n * n) / (1 + i / 350)),
    (a += terrainNoise.fbm(e * 0.0035, t * 0.0035, 4) * 38 * smoothstep(8, 120, i)),
    (a += detailNoise.fbm(e * 0.04, t * 0.04, 3) * 1.3 * smoothstep(3, 14, i)),
    i > 380 &&
      (a += terrainNoise.ridged(e * 0.0012 + 5.3, t * 0.0012 - 2.1, 5) * 340 * smoothstep(380, 1100, i)),
    a
  );
}

function terrainHeight(e, t, n) {
  let r = trailCenterX(t),
    i = trailSlopeX(t),
    a = e - r,
    o = a / Math.sqrt(1 + i * i),
    s = Math.abs(o),
    c = trailElevation(t),
    l = trailMask(t),
    u = baseTerrainHeight(e, t, a, c);
  if (l <= 0 || s > TRAIL_HALF_WIDTH + 8) return n && ((n.trail = 0), (n.dn = o)), u;
  let d = trailBank(t),
    f = c + d * o;
  if (d * o > 0 && Math.abs(d) > 0.05) {
    let e = (s - (TRAIL_HALF_WIDTH - 0.4)) / 2.4;
    e > 0 && e < 1 && (f += Math.abs(d) * 1.6 * Math.sin(Math.PI * e));
  }
  (f += detailNoise.noise(e * 0.9, t * 0.9) * 0.035), (f -= ditchDepth(e, t));
  let p = (1 - smoothstep(TRAIL_HALF_WIDTH + 0.6, TRAIL_HALF_WIDTH + 7, s)) * l;
  return (
    n && ((n.trail = (1 - smoothstep(TRAIL_HALF_WIDTH - 0.2, TRAIL_HALF_WIDTH + 0.5, s)) * l), (n.dn = o)),
    u + (f - u) * p
  );
}

const trailInfoScratch = {
  trail: 0,
  dn: 0,
};

function sampleGround(e, t, n) {
  let r = terrainHeight(e, t, trailInfoScratch);
  (n.y = r),
    (n.onRamp = !1),
    (n.jump = null),
    (n.trail = trailInfoScratch.trail),
    (n.dn = trailInfoScratch.dn);
  for (let i = 0; i < JUMPS.length; i++) {
    let a = JUMPS[i];
    if (Math.abs(t - a.oz) > a.total + 6) continue;
    let { s: o, lat: s } = toJumpLocal(a, e, t);
    if (Math.abs(s) > a.halfW) continue;
    let c = jumpProfile(a, o);
    c >= 0 && r + c >= n.y && ((n.y = r + c), (n.onRamp = c > 0.02), (n.jump = a));
  }
  return n;
}

const groundScratch = {
  y: 0,
  onRamp: !1,
  jump: null,
  trail: 0,
  dn: 0,
};

function groundHeight(e, t) {
  return sampleGround(e, t, groundScratch).y;
}

function groundNormal(e, t, n, r = 0.3) {
  let i = groundHeight(e, t),
    a = (e, t) => (Math.abs(e - t) < 0.6 ? (e + t) * 0.5 : Math.abs(e) < Math.abs(t) ? e : t),
    o = a((groundHeight(e + r, t) - i) / r, (i - groundHeight(e - r, t)) / r),
    s = a((groundHeight(e, t + r) - i) / r, (i - groundHeight(e, t - r)) / r),
    c = Math.hypot(o, 1, s);
  return (n.x = -o / c), (n.y = 1 / c), (n.z = -s / c), n;
}

function terrainNormal(e, t, n, r = 0.5) {
  let i = terrainHeight(e - r, t),
    a = terrainHeight(e + r, t),
    o = terrainHeight(e, t - r),
    s = terrainHeight(e, t + r),
    c = i - a,
    l = 2 * r,
    u = o - s,
    d = Math.hypot(c, l, u);
  return (n.x = c / d), (n.y = l / d), (n.z = u / d), n;
}

function trailPointAt(e) {
  let t = trailCenterX(e),
    n = trailSlopeX(e),
    r = Math.atan2(-n, -1);
  return {
    x: t,
    z: e,
    y: groundHeight(t, e),
    yaw: r,
  };
}

export {
  TRAIL_HALF_WIDTH,
  TRAIL_WAVES,
  TRAIL_LENGTH,
  JUMPS,
  toJumpLocal,
  trailSlopeX,
  trailCenterX,
  trailMask,
  terrainNormal,
  terrainHeight,
  jumpProfile,
  trailPointAt,
  groundNormal,
  trailBank,
  sampleGround,
  groundHeight,
};
