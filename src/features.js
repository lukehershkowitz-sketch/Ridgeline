// Wooden jumps, start/finish gates and trail markers.
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from './config.js';
import { mulberry32 } from './noise.js';
import { getTextures, makeBannerTexture } from './textures.js';
import { JUMPS, jumpProfile, terrainHeight, trailCenterX, trailPointAt, trailSlopeX } from './trail.js';

const FEATURE_TRAIL_HALF_WIDTH = CONFIG.trailHalfWidth;

function buildRampSurface(e, t, n) {
  let r = 0.15,
    i = Math.max(2, Math.ceil((n - t) / r) + 1),
    a = 0.07,
    o = [],
    s = [],
    c = (t, n) => [e.ox + e.tx * t - e.tz * n, e.oz + e.tz * t + e.tx * n];
  for (let a = 0; a < i; a++) {
    let i = Math.min(n, t + a * r),
      l = Math.max(0, jumpProfile(e, Math.min(i, n - 1e-4)));
    for (let t = 0; t <= 6; t++) {
      let n = -e.halfW + (t / 6) * e.halfW * 2,
        [r, a] = c(i, n);
      o.push(r, terrainHeight(r, a) + l, a), s.push(n / 2, i / 1.6);
    }
  }
  let l = [];
  for (let e = 0; e < i - 1; e++)
    for (let t = 0; t < 6; t++) {
      let n = e * 7 + t,
        r = n + 1,
        i = n + 6 + 1,
        a = i + 1;
      l.push(n, r, i, r, a, i);
    }
  let u = (e, t, n) => {
      let r = new BufferGeometry();
      return (
        r.setAttribute(`position`, new Float32BufferAttribute(e, 3)),
        r.setAttribute(`uv`, new Float32BufferAttribute(t, 2)),
        r.setIndex(n),
        r.computeVertexNormals(),
        r
      );
    },
    d = u(o, s, l),
    f = o.map((e, t) => (t % 3 == 1 ? e - a : e)),
    p = [];
  for (let e = 0; e < l.length; e += 3) p.push(l[e], l[e + 2], l[e + 1]);
  let m = u(f, s, p),
    h = [];
  for (let e of [0, 6]) {
    let t = [],
      n = [],
      s = [];
    for (let c = 0; c < i; c++) {
      let l = (c * 7 + e) * 3;
      if (
        (t.push(o[l], o[l + 1], o[l + 2], o[l], o[l + 1] - a, o[l + 2]),
        n.push((c * r) / 1.6, 0, (c * r) / 1.6, 0.05),
        c < i - 1)
      ) {
        let t = c * 2;
        e === 0 ? s.push(t, t + 2, t + 1, t + 1, t + 2, t + 3) : s.push(t, t + 1, t + 2, t + 1, t + 3, t + 2);
      }
    }
    h.push(u(t, n, s));
  }
  return [d, m, ...h];
}

function buildStrut(e, t, n = 0.09) {
  let r = new Vector3().subVectors(t, e),
    i = r.length(),
    a = new BoxGeometry(n, i, n);
  a.translate(0, i / 2, 0);
  let o = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), r.normalize());
  a.applyQuaternion(o), a.translate(e.x, e.y, e.z);
  let s = a.attributes.uv;
  for (let e = 0; e < s.count; e++) s.setY(e, s.getY(e) * i * 0.6);
  return a;
}

function buildJumpGeometry(e) {
  let t = [],
    n = [];
  e.type === `drop`
    ? n.push([0, e.kickLen + e.flatTop])
    : e.table
      ? n.push([0, e.total])
      : (n.push([0, e.kickLen]), e.gap > 0 && n.push([e.kickLen + e.gap, e.total]));
  let r = (t, n) => new Vector3(e.ox + e.tx * t - e.tz * n, 0, e.oz + e.tz * t + e.tx * n);
  for (let [i, a] of n) {
    t.push(...buildRampSurface(e, i, a));
    let n = null,
      o = null;
    for (let s = i + 0.15; s <= a + 0.001; s += 0.7) {
      let i = Math.min(s, a - 0.05),
        c = jumpProfile(e, i);
      if (c < 0.12) continue;
      let l = [];
      for (let n of [-e.halfW + 0.06, 0, e.halfW - 0.06]) {
        let e = r(i, n),
          a = terrainHeight(e.x, e.z),
          o = e.clone();
        o.y = a + c - 0.07;
        let s = e.clone();
        (s.y = a - 0.25),
          t.push(buildStrut(s, o, n === 0 ? 0.08 : 0.1)),
          l.push({
            top: o,
            bot: s,
          });
      }
      let u = (e) => e.bot.clone().lerp(e.top, 0.45);
      t.push(buildStrut(u(l[0]), u(l[2]), 0.07)),
        n &&
          c > 0.5 &&
          (t.push(buildStrut(n.bot.clone().lerp(n.top, 0.15), l[0].top.clone().lerp(l[0].bot, 0.12), 0.06)),
          t.push(buildStrut(o.bot.clone().lerp(o.top, 0.15), l[2].top.clone().lerp(l[2].bot, 0.12), 0.06))),
        (n = l[0]),
        (o = l[2]);
    }
  }
  return mergeGeometries(
    t.map((e) => (e.index ? e.toNonIndexed() : e)),
    !1,
  );
}

function buildGate(e, t, n) {
  let r = new Group(),
    i = new MeshStandardMaterial({
      map: getTextures().wood,
      roughness: 0.8,
      color: `#8a6a4a`,
    }),
    a = trailPointAt(e),
    o = Math.sqrt(1 + trailSlopeX(e) ** 2),
    s = FEATURE_TRAIL_HALF_WIDTH + 1.6,
    c = 4.4,
    l = [trailCenterX(e) - s * o, trailCenterX(e) + s * o],
    u = [];
  for (let t of l) {
    let n = terrainHeight(t, e),
      a = new Mesh(new CylinderGeometry(0.13, 0.16, 5, 10), i);
    a.position.set(t, n + c / 2 - 0.3, e), (a.castShadow = !0), r.add(a), u.push(new Vector3(t, n + c, e));
  }
  let d = u[0].distanceTo(u[1]),
    f = Math.max(u[0].y, u[1].y) - 0.55,
    p = new Mesh(
      new PlaneGeometry(d - 0.2, 1),
      new MeshStandardMaterial({
        map: makeBannerTexture(t, n),
        roughness: 0.7,
        side: 2,
      }),
    );
  p.position.set((l[0] + l[1]) / 2, f, e),
    p.lookAt(p.position.x - Math.sin(a.yaw), f, p.position.z - Math.cos(a.yaw)),
    (p.castShadow = !0),
    r.add(p);
  let m = new Mesh(new CylinderGeometry(0.07, 0.07, d + 0.3, 8), i);
  return (
    m.position.set((l[0] + l[1]) / 2, f + 0.6, e),
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3().subVectors(u[1], u[0]).normalize()),
    (m.castShadow = !0),
    r.add(m),
    r
  );
}

function buildTrailMarkers() {
  let e = mulberry32(77),
    t = new CylinderGeometry(0.025, 0.03, 1.1, 6);
  t.translate(0, 0.55, 0);
  let n = new PlaneGeometry(0.32, 0.07);
  n.translate(0.17, 0.98, 0);
  let r = [],
    i = [];
  for (let t = -20; t > -CONFIG.trailLength + 20; t -= 18 + e() * 10) {
    let n = !1;
    for (let e of JUMPS) t < e.oz + 12 && t > e.oz - e.total - 12 && (n = !0);
    if (n) continue;
    let a = e() > 0.5 ? 1 : -1,
      o = Math.sqrt(1 + trailSlopeX(t) ** 2),
      s = trailCenterX(t) + a * (FEATURE_TRAIL_HALF_WIDTH + 0.9 + e() * 0.6) * o,
      c = terrainHeight(s, t) - 0.1,
      l = new Matrix4().compose(
        new Vector3(s, c, t),
        new Quaternion().setFromEuler(new Euler((e() - 0.5) * 0.15, e() * 6.28, (e() - 0.5) * 0.15)),
        new Vector3(1, 0.9 + e() * 0.2, 1),
      );
    r.push(l), i.push(l);
  }
  let a = new MeshStandardMaterial({
      color: `#7a5a3a`,
      roughness: 0.9,
    }),
    o = new MeshStandardMaterial({
      color: `#ff5a1f`,
      roughness: 0.6,
      side: 2,
      emissive: `#401000`,
    }),
    s = new InstancedMesh(t, a, r.length),
    c = new InstancedMesh(n, o, i.length);
  return (
    r.forEach((e, t) => {
      s.setMatrixAt(t, e), c.setMatrixAt(t, e);
    }),
    (s.castShadow = !0),
    (c.castShadow = !0),
    s.computeBoundingSphere(),
    c.computeBoundingSphere(),
    [s, c]
  );
}

const TrailFeatures = class {
  constructor(e) {
    let t = getTextures();
    (this.woodMat = new MeshStandardMaterial({
      map: t.wood,
      bumpMap: t.wood,
      bumpScale: 1.5,
      roughness: 0.82,
      metalness: 0,
      color: `#c9b49a`,
      side: 2,
    })),
      (this.group = new Group());
    for (let e of JUMPS) {
      let t = new Mesh(buildJumpGeometry(e), this.woodMat);
      (t.castShadow = !0), (t.receiveShadow = !0), this.group.add(t);
    }
    this.group.add(buildGate(-6, `START`, `#2b8a8f`)),
      this.group.add(buildGate(-CONFIG.trailLength, `FINISH`, `#d9462b`)),
      this.group.add(...buildTrailMarkers()),
      e.add(this.group);
  }
};

export { TrailFeatures };
