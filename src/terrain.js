// Streaming terrain chunks around the rider.
import { BufferAttribute, BufferGeometry, Group, Mesh } from 'three';
import { CONFIG } from './config.js';
import { smoothstep } from './noise.js';
import { getTextures } from './textures.js';
import { terrainHeight, terrainNormal, trailCenterX, trailMask, trailSlopeX } from './trail.js';
import { createTerrainMaterial } from './terrainMaterial.js';
import { buildChunkProps } from './props.js';

const CHUNK_TRAIL_HALF_WIDTH = CONFIG.trailHalfWidth;

const RIBBON_HALF_WIDTH = CHUNK_TRAIL_HALF_WIDTH + 3.6;

const CHUNK_UP = {
  x: 0,
  y: 1,
  z: 0,
};

const chunkTrailScratch = {
  trail: 0,
  dn: 0,
};

function buildGridIndex(e) {
  let t = [],
    n = e + 1;
  for (let r = 0; r < e; r++)
    for (let i = 0; i < e; i++) {
      let e = r * n + i,
        a = e + 1,
        o = e + n,
        s = o + 1;
      t.push(e, o, a, a, o, s);
    }
  return new BufferAttribute(new Uint32Array(t), 1);
}

const Terrain = class {
  constructor(e) {
    (this.scene = e),
      (this.material = createTerrainMaterial(getTextures())),
      (this.chunks = new Map()),
      (this.queue = []),
      (this.size = CONFIG.chunkSize),
      (this.seg = CONFIG.chunkSegments),
      (this.index = buildGridIndex(this.seg)),
      this._buildRibbon(),
      this._buildBackdrop();
  }
  _buildChunkMesh(e, t) {
    let { size: n, seg: r } = this,
      i = r + 1,
      a = new Float32Array(i * i * 3),
      o = new Float32Array(i * i * 3),
      s = e * n,
      c = t * n,
      l = n / r;
    for (let e = 0; e < i; e++)
      for (let t = 0; t < i; t++) {
        let n = s + t * l,
          r = c + e * l,
          u = terrainHeight(n, r, chunkTrailScratch),
          d = trailMask(r);
        d > 0 &&
          (u -=
            0.45 *
            (1 -
              smoothstep(
                CHUNK_TRAIL_HALF_WIDTH + 1.4,
                CHUNK_TRAIL_HALF_WIDTH + 3.2,
                Math.abs(chunkTrailScratch.dn),
              )) *
            d),
          terrainNormal(n, r, CHUNK_UP, l * 0.5);
        let f = (e * i + t) * 3;
        (a[f] = n),
          (a[f + 1] = u),
          (a[f + 2] = r),
          (o[f] = CHUNK_UP.x),
          (o[f + 1] = CHUNK_UP.y),
          (o[f + 2] = CHUNK_UP.z);
      }
    let u = new BufferGeometry();
    u.setAttribute(`position`, new BufferAttribute(a, 3)),
      u.setAttribute(`normal`, new BufferAttribute(o, 3)),
      u.setIndex(this.index),
      u.computeBoundingSphere(),
      u.computeBoundingBox();
    let d = new Mesh(u, this.material);
    return (d.receiveShadow = !0), (d.matrixAutoUpdate = !1), d;
  }
  _createChunk(e, t) {
    let n = this._buildChunkMesh(e, t),
      r = buildChunkProps(e, t, this.size),
      i = new Group();
    i.add(n, r.group), this.scene.add(i);
    let a = {
      ix: e,
      iz: t,
      group: i,
      mesh: n,
      veg: r,
      cx: (e + 0.5) * this.size,
      cz: (t + 0.5) * this.size,
    };
    return this.chunks.set(`${e},${t}`, a), a;
  }
  _disposeChunk(e, t) {
    this.scene.remove(t.group), t.mesh.geometry.dispose(), t.veg.dispose(), this.chunks.delete(e);
  }
  update(e, t = !1) {
    let { size: n } = this,
      r = CONFIG.chunkLoadRadius,
      i = Math.floor(e.x / n),
      a = Math.floor(e.z / n),
      o = Math.ceil(r / n),
      s = [];
    for (let t = -o; t <= o; t++)
      for (let c = -o; c <= o; c++) {
        let o = i + t,
          l = a + c,
          u = (o + 0.5) * n,
          d = (l + 0.5) * n,
          f = Math.hypot(u - e.x, d - e.z);
        f > r ||
          this.chunks.has(`${o},${l}`) ||
          s.push({
            ix: o,
            iz: l,
            d: f,
          });
      }
    s.sort((e, t) => e.d - t.d);
    let c = performance.now(),
      l = 0,
      u = t ? 60 : 5;
    for (let e of s) if ((this._createChunk(e.ix, e.iz), l++, performance.now() - c > u)) break;
    for (let [t, i] of this.chunks) {
      let a = Math.hypot(i.cx - e.x, i.cz - e.z);
      a > r + n * 1.2 ? this._disposeChunk(t, i) : i.veg.setDetail(Math.max(0, a - n * 0.5));
    }
    return s.length - l;
  }
  _buildRibbon() {
    let e = -CONFIG.trailLength - 120;
    this.ribbon = new Group();
    for (let t = 40; t > e; t -= 80) {
      let e = new Float32Array(11109),
        n = new Float32Array(11109);
      for (let r = 0; r < 161; r++) {
        let i = t - r * 0.5,
          a = trailCenterX(i),
          o = Math.sqrt(1 + trailSlopeX(i) ** 2);
        for (let t = 0; t <= 22; t++) {
          let s = a + (-RIBBON_HALF_WIDTH + (t / 22) * RIBBON_HALF_WIDTH * 2) * o,
            c = terrainHeight(s, i);
          (t === 0 || t === 22) && (c -= 0.12), terrainNormal(s, i, CHUNK_UP, 0.3);
          let l = (r * 23 + t) * 3;
          (e[l] = s),
            (e[l + 1] = c),
            (e[l + 2] = i),
            (n[l] = CHUNK_UP.x),
            (n[l + 1] = CHUNK_UP.y),
            (n[l + 2] = CHUNK_UP.z);
        }
      }
      let r = [];
      for (let e = 0; e < 160; e++)
        for (let t = 0; t < 22; t++) {
          let n = e * 23 + t,
            i = n + 1,
            a = n + 22 + 1,
            o = a + 1;
          r.push(n, i, a, i, o, a);
        }
      let i = new BufferGeometry();
      i.setAttribute(`position`, new BufferAttribute(e, 3)),
        i.setAttribute(`normal`, new BufferAttribute(n, 3)),
        i.setIndex(r),
        i.computeBoundingSphere();
      let a = new Mesh(i, this.material);
      (a.receiveShadow = !0), (a.matrixAutoUpdate = !1), this.ribbon.add(a);
    }
    this.scene.add(this.ribbon);
  }
  _buildBackdrop() {
    let e = 7200,
      t = -CONFIG.trailLength / 2,
      n = new Float32Array(121203),
      r = new Float32Array(121203);
    for (let i = 0; i < 201; i++)
      for (let a = 0; a < 201; a++) {
        let o = 0 - e / 2 + (a / 200) * e,
          s = t - e / 2 + (i / 200) * e,
          c = (i * 201 + a) * 3;
        (n[c] = o),
          (n[c + 1] = terrainHeight(o, s) - 3),
          (n[c + 2] = s),
          terrainNormal(o, s, CHUNK_UP, e / 200),
          (r[c] = CHUNK_UP.x),
          (r[c + 1] = CHUNK_UP.y),
          (r[c + 2] = CHUNK_UP.z);
      }
    let i = new BufferGeometry();
    i.setAttribute(`position`, new BufferAttribute(n, 3)),
      i.setAttribute(`normal`, new BufferAttribute(r, 3)),
      i.setIndex(buildGridIndex(200)),
      i.computeBoundingSphere();
    let a = new Mesh(i, this.material);
    (a.matrixAutoUpdate = !1), (a.receiveShadow = !1), (this.backdrop = a), this.scene.add(a);
  }
};

export { Terrain };
