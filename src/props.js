// Trees, rocks and grass instancing plus the collider grid.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG, MAP } from './config.js';
import { SimplexNoise, mulberry32, smoothstep } from './noise.js';
import { getTextures } from './textures.js';
import {
  JUMPS,
  terrainHeight,
  terrainNormal,
  toJumpLocal,
  trailCenterX,
  trailMask,
  trailSlopeX,
} from './trail.js';
import { WIND_UNIFORMS } from './terrainMaterial.js';

const PROP_TRAIL_HALF_WIDTH = CONFIG.trailHalfWidth;

const propNoise = new SimplexNoise(CONFIG.seed + 7);

function setVertexColor(e, t) {
  let n = e.attributes.position.count,
    r = new Float32Array(n * 3);
  for (let e = 0; e < n; e++) (r[e * 3] = t.r), (r[e * 3 + 1] = t.g), (r[e * 3 + 2] = t.b);
  return e.setAttribute(`color`, new BufferAttribute(r, 3)), e;
}

function buildPineCanopy(e, t, n, r, i, a, o) {
  let s = [],
    c = [],
    l = [],
    u = r * 0.38,
    d = [
      {
        r: 1,
        y: -u,
        c: 1,
        jag: 0.5,
      },
      {
        r: 0.78,
        y: -u * 0.35,
        c: 0.9,
        jag: 0.3,
      },
      {
        r: 0.5,
        y: r * 0.3,
        c: 0.72,
        jag: 0.15,
      },
      {
        r: 0.2,
        y: r * 0.7,
        c: 0.66,
        jag: 0.1,
      },
    ],
    f = new Color().setHSL(0.33 + a * 0.04, 0.38, 0.11 + a * 0.03),
    p = new Color().setHSL(0.25 + a * 0.04, 0.42, 0.22 + a * 0.05),
    m = new Color().setHSL(0.31, 0.45, 0.05),
    h = e() * Math.PI * 2,
    g = Array.from(
      {
        length: i,
      },
      () => 0.75 + e() * 0.45,
    );
  for (let a = 0; a < d.length; a++) {
    let l = d[a];
    for (let d = 0; d < i; d++) {
      let m = h + (d / i) * Math.PI * 2 + (a === 0 ? (e() - 0.5) * 0.15 : 0),
        _ = d % 2 == 0,
        v = _ ? g[d] : 1 - l.jag * (0.8 + e() * 0.4),
        y = n * l.r * (a < 2 ? v : 0.92 + e() * 0.16),
        b = a === 0 && _ ? -u * 0.25 * g[d] : 0;
      s.push(Math.cos(m) * y + o.x * l.y, t + l.y + b + (e() - 0.5) * r * 0.1, Math.sin(m) * y + o.z * l.y);
      let x = (a === 0 && _ ? p : f.clone().lerp(p, 0.25 * (3 - a))).clone();
      x.multiplyScalar(0.85 + e() * 0.3), c.push(x.r * l.c, x.g * l.c, x.b * l.c);
    }
  }
  s.push(o.x * r, t + r, o.z * r), c.push(f.r, f.g, f.b);
  let _ = s.length / 3 - 1;
  s.push(0, t + r * 0.08, 0), c.push(m.r, m.g, m.b);
  let v = s.length / 3 - 1;
  for (let e = 0; e < d.length - 1; e++)
    for (let t = 0; t < i; t++) {
      let n = e * i + t,
        r = e * i + ((t + 1) % i),
        a = (e + 1) * i + t,
        o = (e + 1) * i + ((t + 1) % i);
      l.push(n, a, r, r, a, o);
    }
  let y = (d.length - 1) * i;
  for (let e = 0; e < i; e++) l.push(y + e, _, y + ((e + 1) % i));
  for (let e = 0; e < i; e++) l.push(e, (e + 1) % i, v);
  let b = new BufferGeometry();
  return (
    b.setAttribute(`position`, new Float32BufferAttribute(s, 3)),
    b.setAttribute(`color`, new Float32BufferAttribute(c, 3)),
    b.setIndex(l),
    b
  );
}

function buildPine(e, t) {
  let n = mulberry32(e),
    r = 11 + n() * 3,
    i = 2.6 + n() * 0.8,
    a = [],
    o = new CylinderGeometry(0.09, 0.3, r * 0.92, t ? 7 : 5, 1, !0);
  o.translate(0, r * 0.46, 0),
    o.deleteAttribute(`uv`),
    o.deleteAttribute(`normal`),
    a.push(setVertexColor(o, new Color(`#4a3424`)));
  let s = t ? 10 : 3,
    c = n();
  for (let e = 0; e < s; e++) {
    let o = e / (s - 1),
      l = i * (1 - o * 0.86) ** 1.1 * (0.82 + n() * 0.36),
      u = r * (t ? 0.2 : 0.42) * (1 - o * 0.3),
      d = r * (0.16 + o * (t ? 0.7 : 0.55) + (t ? (n() - 0.5) * 0.03 : 0)),
      f = {
        x: (n() - 0.5) * 0.25,
        z: (n() - 0.5) * 0.25,
      };
    a.push(buildPineCanopy(n, d, l, u, t ? 18 : 8, c, f));
  }
  let l = mergeGeometries(a, !1);
  l.computeVertexNormals();
  let u = l.attributes.position,
    d = l.attributes.normal,
    f = new Vector3(),
    p = new Vector3();
  for (let e = 0; e < u.count; e++)
    f.set(u.getX(e), u.getY(e) - r * 0.55, u.getZ(e)),
      (Math.hypot(u.getX(e), u.getZ(e)) < 0.32 && u.getY(e) < r * 0.92) ||
        (f.normalize(),
        p.set(d.getX(e), d.getY(e), d.getZ(e)).lerp(f, 0.6).normalize(),
        d.setXYZ(e, p.x, p.y, p.z));
  return l.computeBoundingSphere(), l;
}

function buildRock(e) {
  let t = mulberry32(e),
    n = new SimplexNoise(e),
    r = new IcosahedronGeometry(1, 3);
  r.deleteAttribute(`uv`), r.deleteAttribute(`normal`), (r = mergeVertices(r));
  let i = r.attributes.position,
    a = new Vector3(),
    o = 0.8 + t() * 0.6,
    s = 0.45 + t() * 0.35,
    c = 0.8 + t() * 0.5;
  for (let e = 0; e < i.count; e++) {
    a.set(i.getX(e), i.getY(e), i.getZ(e));
    let t =
      1 + n.fbm(a.x * 1.3 + 3, a.y * 1.3 + a.z * 0.7, 4) * 0.35 + Math.abs(n.noise(a.x * 3, a.z * 3)) * 0.08;
    a.multiplyScalar(t),
      a.set(a.x * o, a.y * s, a.z * c),
      a.y < -0.15 && (a.y = -0.15 + (a.y + 0.15) * 0.3),
      i.setXYZ(e, a.x, a.y, a.z);
  }
  r.computeVertexNormals();
  let l = r.attributes.normal,
    u = new Float32Array(i.count * 3),
    d = new Color(`#6d7a3c`),
    f = new Color(`#d8d2c8`),
    p = new Color(`#5c544c`),
    m = new Color();
  for (let e = 0; e < i.count; e++) {
    let t = l.getY(e);
    m.copy(f).lerp(p, smoothstep(0.1, -0.6, t)),
      m.lerp(d, smoothstep(0.55, 0.9, t) * 0.65 * (0.5 + 0.5 * n.noise(i.getX(e) * 2, i.getZ(e) * 2))),
      (u[e * 3] = m.r),
      (u[e * 3 + 1] = m.g),
      (u[e * 3 + 2] = m.b);
  }
  r.setAttribute(`color`, new BufferAttribute(u, 3));
  let h = new Float32Array(i.count * 2);
  for (let e = 0; e < i.count; e++)
    (h[e * 2] = (i.getX(e) + i.getZ(e) * 0.6) * 0.6), (h[e * 2 + 1] = (i.getY(e) + i.getZ(e) * 0.3) * 0.6);
  return r.setAttribute(`uv`, new BufferAttribute(h, 2)), r;
}

function buildGrassTuft(e) {
  let t = mulberry32(e),
    n = [],
    r = [],
    i = [],
    a = [],
    o = new Color(`#2f3d17`),
    s = new Color(`#a8a65a`),
    c = new Color(`#7f9a3e`);
  for (let e = 0; e < 12; e++) {
    let e = t() * Math.PI * 2,
      l = Math.cos(e) * t() * 0.28,
      u = Math.sin(e) * t() * 0.28,
      d = 0.16 + t() * 0.3,
      f = 0.011 + t() * 0.009,
      p = 0.15 + t() * 0.35,
      m = t() * Math.PI,
      h = Math.cos(m),
      g = Math.sin(m),
      _ = t() > 0.6 ? s : c,
      v = n.length / 3;
    for (let t = 0; t <= 3; t++) {
      let s = t / 3,
        c = f * (1 - s * 0.92),
        m = p * s * s * d,
        y = l + Math.cos(e) * m,
        b = u + Math.sin(e) * m,
        x = d * s;
      n.push(y - h * c, x, b - g * c, y + h * c, x, b + g * c);
      let S = o.clone().lerp(_, s ** 0.8);
      if ((r.push(S.r, S.g, S.b, S.r, S.g, S.b), i.push(0, 1, 0, 0, 1, 0), t < 3)) {
        let e = v + t * 2;
        a.push(e, e + 1, e + 2, e + 1, e + 3, e + 2);
      }
    }
  }
  let l = new BufferGeometry();
  return (
    l.setAttribute(`position`, new Float32BufferAttribute(n, 3)),
    l.setAttribute(`normal`, new Float32BufferAttribute(i, 3)),
    l.setAttribute(`color`, new Float32BufferAttribute(r, 3)),
    l.setIndex(a),
    l
  );
}

function applyWind(e, t, n, r) {
  return (
    (e.onBeforeCompile = (e) => {
      (e.uniforms.uTime = WIND_UNIFORMS.uTime),
        (e.vertexShader = e.vertexShader
          .replace(
            `#include <common>`,
            `#include <common>
uniform float uTime;`,
          )
          .replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xyz;
          #endif
          float hw = clamp(position.y / ${n.toFixed(2)}, 0.0, 1.0);
          hw *= hw;
          float ph = ip.x * 0.37 + ip.z * 0.21;
          float sway = sin(uTime * 1.7 + ph) * 0.6 + sin(uTime * 3.1 + ph * 1.7) * 0.25 + sin(uTime * 0.6 + ip.x * 0.02) * 0.5;
          transformed.x += sway * ${t.toFixed(3)} * hw;
          transformed.z += cos(uTime * 1.3 + ph) * ${(t * 0.6).toFixed(3)} * hw;
        }`,
          ));
    }),
    (e.customProgramCacheKey = () => r),
    e
  );
}

let propGeometryCache = null;

function getPropGeometries() {
  if (propGeometryCache) return propGeometryCache;
  let e = getTextures();
  return (
    (propGeometryCache = {
      pinesHi: [buildPine(101, !0), buildPine(202, !0), buildPine(303, !0)],
      pinesLo: [buildPine(101, !1), buildPine(202, !1), buildPine(303, !1)],
      rocks: [buildRock(11), buildRock(22), buildRock(33)],
      grass: buildGrassTuft(7),
      treeMat: applyWind(
        new MeshStandardMaterial({
          vertexColors: !0,
          roughness: 0.88,
          metalness: 0,
        }),
        0.22,
        12,
        `tree-wind`,
      ),
      rockMat: new MeshStandardMaterial({
        vertexColors: !0,
        map: e.rock,
        roughness: 0.85,
        metalness: 0,
        bumpMap: e.rock,
        bumpScale: 2,
      }),
      grassMat: applyWind(
        new MeshStandardMaterial({
          vertexColors: !0,
          roughness: 0.92,
          metalness: 0,
          side: 2,
        }),
        0.09,
        0.6,
        `grass-wind`,
      ),
    }),
    propGeometryCache
  );
}

const COLLIDER_CELL = 8;

const colliderGrid = new Map();

const cellHash = (e, t) => (e * 73856093) ^ (t * 19349663);

function addCollider(e) {
  let t = cellHash(Math.floor(e.x / COLLIDER_CELL), Math.floor(e.z / COLLIDER_CELL)),
    n = colliderGrid.get(t);
  n || colliderGrid.set(t, (n = [])), n.push(e);
}

function removeCollider(e) {
  let t = cellHash(Math.floor(e.x / COLLIDER_CELL), Math.floor(e.z / COLLIDER_CELL)),
    n = colliderGrid.get(t);
  if (!n) return;
  let r = n.indexOf(e);
  r >= 0 && n.splice(r, 1);
}

function queryColliders(e, t, n) {
  let r = Math.floor(e / COLLIDER_CELL),
    i = Math.floor(t / COLLIDER_CELL);
  for (let a = -1; a <= 1; a++)
    for (let o = -1; o <= 1; o++) {
      let s = colliderGrid.get(cellHash(r + a, i + o));
      if (s)
        for (let r of s) {
          let i = e - r.x,
            a = t - r.z;
          if (i * i + a * a < (n + r.r) * (n + r.r)) return r;
        }
    }
  return null;
}

function isNearJump(e, t, n) {
  for (let r of JUMPS) {
    if (Math.abs(t - r.oz) > r.total + 30) continue;
    let { s: i, lat: a } = toJumpLocal(r, e, t);
    if (i > -n - 6 && i < r.total + n && Math.abs(a) < r.halfW + n) return !0;
  }
  return !1;
}

function isNearStartOrFinish(e) {
  return Math.abs(e) < 16 || Math.abs(e + CONFIG.trailLength) < 16;
}

function trailDistance(e, t) {
  let n = trailSlopeX(t);
  return Math.abs((e - trailCenterX(t)) / Math.sqrt(1 + n * n)) / (trailMask(t) > 0.01 ? 1 : 0.001);
}

const _propV1 = new Vector3();

const _propM4 = new Matrix4();

const _propQ = new Quaternion();

const _propV2 = new Vector3();

const _propV3 = new Vector3();

const PROP_UP = new Vector3(0, 1, 0);

function buildChunkProps(e, t, n) {
  let r = getPropGeometries(),
    i = mulberry32((e * 92821) ^ (t * 68917) ^ 1540483477),
    a = e * n,
    o = t * n,
    s = new Group(),
    c = [],
    l = [[], [], []],
    u = 6.2;
  for (let e = 0; e < n; e += u)
    for (let t = 0; t < n; t += u) {
      let n = a + e + i() * u,
        r = o + t + i() * u,
        s = i(),
        d = (i() * 3) | 0,
        f = 0.75 + i() * 0.65,
        p = i() * Math.PI * 2,
        m = trailDistance(n, r);
      if (
        m < PROP_TRAIL_HALF_WIDTH + MAP.treeClearance ||
        isNearJump(n, r, 6) ||
        isNearStartOrFinish(r) ||
        s >
          smoothstep(-0.35, 0.25, propNoise.fbm(n * 0.006, r * 0.006, 3)) *
            (0.25 +
              0.6 *
                smoothstep(
                  PROP_TRAIL_HALF_WIDTH + MAP.treeClearance,
                  PROP_TRAIL_HALF_WIDTH + MAP.treeClearance + 12,
                  m,
                )) +
            0.04 ||
        (terrainNormal(n, r, _propV1, 1), _propV1.y < 0.74)
      )
        continue;
      let h = terrainHeight(n, r) - 0.15;
      l[d].push({
        x: n,
        y: h,
        z: r,
        sc: f,
        rot: p,
      });
      let g = {
        x: n,
        z: r,
        r: 0.35 * f,
        type: `tree`,
      };
      c.push(g);
    }
  let d = [],
    f = [];
  for (let e = 0; e < 3; e++) {
    let t = l[e];
    if (!t.length) continue;
    let n = new InstancedMesh(r.pinesHi[e], r.treeMat, t.length),
      i = new InstancedMesh(r.pinesLo[e], r.treeMat, t.length);
    t.forEach((e, t) => {
      _propQ.setFromAxisAngle(PROP_UP, e.rot),
        _propV2.set(e.sc * (0.9 + (t % 5) * 0.04), e.sc, e.sc * (0.9 + (t % 3) * 0.05)),
        _propM4.compose(_propV3.set(e.x, e.y, e.z), _propQ, _propV2),
        n.setMatrixAt(t, _propM4),
        i.setMatrixAt(t, _propM4);
    }),
      (n.castShadow = !0),
      (n.receiveShadow = !0),
      (i.castShadow = !1),
      (i.receiveShadow = !1),
      n.computeBoundingSphere(),
      i.computeBoundingSphere(),
      d.push(n),
      f.push(i),
      s.add(n, i);
  }
  let p = [[], [], []];
  for (let e = 0; e < n; e += 11)
    for (let t = 0; t < n; t += 11) {
      let n = a + e + i() * 11,
        r = o + t + i() * 11,
        s = trailDistance(n, r),
        l = i(),
        u;
      if (s > PROP_TRAIL_HALF_WIDTH + 0.6 && s < PROP_TRAIL_HALF_WIDTH + 3.5 && l < 0.55)
        u = 0.18 + i() * 0.35;
      else if (s > PROP_TRAIL_HALF_WIDTH + 5 && l < 0.22) u = 0.6 + i() ** 2 * 2.6;
      else continue;
      if (isNearJump(n, r, 2) || isNearStartOrFinish(r)) continue;
      let d = terrainHeight(n, r);
      if (
        (terrainNormal(n, r, _propV1, 1),
        p[(i() * 3) | 0].push({
          x: n,
          y: d - 0.1 * u,
          z: r,
          sc: u,
          rot: i() * 6.28,
          n: _propV1.clone(),
        }),
        u > 0.55)
      ) {
        let e = {
          x: n,
          z: r,
          r: 0.85 * u,
          type: `rock`,
        };
        c.push(e);
      }
    }
  for (let e = 0; e < 3; e++) {
    let t = p[e];
    if (!t.length) continue;
    let n = new InstancedMesh(r.rocks[e], r.rockMat, t.length);
    t.forEach((e, t) => {
      _propQ.setFromUnitVectors(PROP_UP, e.n).multiply(new Quaternion().setFromAxisAngle(PROP_UP, e.rot)),
        _propM4.compose(_propV3.set(e.x, e.y, e.z), _propQ, _propV2.setScalar(e.sc)),
        n.setMatrixAt(t, _propM4);
    }),
      (n.castShadow = !0),
      (n.receiveShadow = !0),
      n.computeBoundingSphere(),
      s.add(n);
  }
  c.forEach(addCollider);
  let m = null;
  function h() {
    if (m) return;
    let i = [],
      c = mulberry32((e * 31337) ^ (t * 7919)),
      l = 1.05;
    for (let e = 0; e < n; e += l)
      for (let t = 0; t < n; t += l) {
        let n = a + e + c() * l,
          r = o + t + c() * l,
          s = c(),
          u = trailDistance(n, r);
        u < PROP_TRAIL_HALF_WIDTH + 0.35 ||
          u > 26 ||
          s > 0.25 + (1 - smoothstep(8, 26, u)) * 0.6 ||
          isNearJump(n, r, 0.5) ||
          (terrainNormal(n, r, _propV1, 0.8),
          _propV1.y < 0.8 ||
            i.push({
              x: n,
              y: terrainHeight(n, r) - 0.03,
              z: r,
              sc: 0.7 + c() * 0.7,
              rot: c() * 6.28,
            }));
      }
    i.length
      ? ((m = new InstancedMesh(r.grass, r.grassMat, i.length)),
        i.forEach((e, t) => {
          _propQ.setFromAxisAngle(PROP_UP, e.rot),
            _propM4.compose(
              _propV3.set(e.x, e.y, e.z),
              _propQ,
              _propV2.set(e.sc, e.sc * (0.8 + (t % 7) * 0.06), e.sc),
            ),
            m.setMatrixAt(t, _propM4);
        }),
        (m.receiveShadow = !0),
        m.computeBoundingSphere(),
        s.add(m))
      : (m = !0);
  }
  return {
    group: s,
    ensureGrass: h,
    setDetail(e) {
      let t = e < CONFIG.treeHiDistance;
      d.forEach((e) => (e.visible = t)),
        f.forEach((e) => (e.visible = !t)),
        e < CONFIG.grassDistance && h(),
        m && m !== !0 && (m.visible = e < CONFIG.grassDistance + 30);
    },
    dispose() {
      c.forEach(removeCollider),
        s.traverse((e) => {
          e.isInstancedMesh && e.dispose();
        });
    },
  };
}

function warmPropCache() {
  getPropGeometries();
}

export { buildChunkProps, queryColliders, warmPropCache };
