// The tank (press T).
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { groundHeight } from './trail.js';

const TANK_HULL_MAT = new MeshStandardMaterial({
  color: `#4d5a2a`,
  roughness: 0.82,
  metalness: 0.15,
});

const TANK_DARK_MAT = new MeshStandardMaterial({
  color: `#3a4420`,
  roughness: 0.85,
  metalness: 0.15,
});

const TANK_TREAD_MAT = new MeshStandardMaterial({
  color: `#26251f`,
  roughness: 0.95,
  metalness: 0.2,
});

const TANK_METAL_MAT = new MeshStandardMaterial({
  color: `#57584f`,
  roughness: 0.55,
  metalness: 0.6,
});

const TANK_BLACK_MAT = new MeshStandardMaterial({
  color: `#141412`,
  roughness: 0.7,
});

function makeTreadTexture() {
  let e = document.createElement(`canvas`);
  e.width = e.height = 128;
  let t = e.getContext(`2d`);
  (t.fillStyle = `#4d5a2a`),
    t.fillRect(0, 0, 128, 128),
    (t.strokeStyle = `#e9e4cf`),
    (t.lineWidth = 6),
    t.beginPath(),
    t.arc(64, 64, 52, 0, Math.PI * 2),
    t.stroke(),
    (t.fillStyle = `#e9e4cf`),
    t.beginPath();
  for (let e = 0; e < 10; e++) {
    let n = e % 2 ? 19 : 46,
      r = -Math.PI / 2 + (e * Math.PI) / 5;
    t.lineTo(64 + Math.cos(r) * n, 64 + Math.sin(r) * n);
  }
  t.fill();
  let n = new CanvasTexture(e);
  return (n.colorSpace = SRGBColorSpace), n;
}

const Tank = class {
  constructor(e) {
    (this.root = new Group()),
      (this.body = new Group()),
      this.root.add(this.body),
      (this.root.visible = !1),
      e.add(this.root),
      this._build(),
      (this.active = !1),
      (this.pos = new Vector3()),
      (this.yaw = 0),
      (this.pitch = 0),
      (this.roll = 0),
      (this.speed = 0),
      (this.mode = `idle`),
      (this.t = 0);
  }
  _build() {
    let e = (e, t = this.body) => ((e.castShadow = !0), (e.receiveShadow = !0), t.add(e), e);
    e(new Mesh(new RoundedBoxGeometry(3, 0.9, 6.6, 3, 0.12), TANK_HULL_MAT)).position.set(0, 1.25, 0);
    let t = e(new Mesh(new RoundedBoxGeometry(2.9, 0.12, 1.6, 2, 0.05), TANK_HULL_MAT));
    t.position.set(0, 1.45, 3.35), (t.rotation.x = 0.55);
    for (let t of [-1, 1])
      e(new Mesh(new RoundedBoxGeometry(0.95, 0.08, 7.1, 2, 0.03), TANK_DARK_MAT)).position.set(
        t * 1.55,
        1.72,
        0,
      ),
        e(new Mesh(new RoundedBoxGeometry(0.7, 0.42, 1.4, 2, 0.05), TANK_DARK_MAT)).position.set(
          t * 1.55,
          1.98,
          -1.9,
        );
    e(new Mesh(new BoxGeometry(2.2, 0.06, 1.8), TANK_BLACK_MAT)).position.set(0, 1.72, -2.3),
      (this.wheels = []);
    let n = new CylinderGeometry(0.42, 0.42, 0.5, 18);
    n.rotateZ(Math.PI / 2);
    let r = new CylinderGeometry(0.16, 0.16, 0.54, 10);
    r.rotateZ(Math.PI / 2);
    for (let t of [-1, 1]) {
      e(new Mesh(new RoundedBoxGeometry(0.72, 1.05, 7, 3, 0.42), TANK_TREAD_MAT)).position.set(
        t * 1.55,
        0.58,
        0,
      );
      for (let e = 0; e < 22; e++) {
        let n = -3.2 + e * 0.305;
        for (let e of [0.04, 1.12]) {
          let r = new Mesh(new BoxGeometry(0.76, 0.06, 0.12), TANK_BLACK_MAT);
          r.position.set(t * 1.55, e, n), this.body.add(r);
        }
      }
      for (let e = 0; e < 6; e++) {
        let i = new Group();
        i.position.set(t * 1.72, 0.48, -2.55 + e * 1.02);
        let a = new Mesh(n, TANK_METAL_MAT);
        a.castShadow = !0;
        let o = new Mesh(r, TANK_DARK_MAT),
          s = new Mesh(new BoxGeometry(0.53, 0.06, 0.6), TANK_DARK_MAT);
        i.add(a, o, s), this.body.add(i), this.wheels.push(i);
      }
    }
    (this.turret = new Group()),
      this.turret.position.set(0, 1.7, -0.3),
      this.body.add(this.turret),
      e(new Mesh(new RoundedBoxGeometry(2.3, 0.75, 3, 4, 0.3), TANK_HULL_MAT), this.turret).position.set(
        0,
        0.38,
        0,
      ),
      e(new Mesh(new RoundedBoxGeometry(0.9, 0.55, 0.5, 2, 0.12), TANK_DARK_MAT), this.turret).position.set(
        0,
        0.4,
        1.55,
      );
    let i = e(new Mesh(new CylinderGeometry(0.1, 0.13, 4.4, 14), TANK_METAL_MAT), this.turret);
    (i.rotation.x = Math.PI / 2), i.position.set(0, 0.42, 3.9);
    let a = e(new Mesh(new CylinderGeometry(0.17, 0.17, 0.42, 14), TANK_DARK_MAT), this.turret);
    (a.rotation.x = Math.PI / 2),
      a.position.set(0, 0.42, 6.05),
      e(new Mesh(new CylinderGeometry(0.42, 0.45, 0.2, 18), TANK_DARK_MAT), this.turret).position.set(
        0.45,
        0.85,
        -0.4,
      );
    let o = e(new Mesh(new CylinderGeometry(0.035, 0.035, 1, 8), TANK_BLACK_MAT), this.turret);
    (o.rotation.x = Math.PI / 2), o.position.set(0.45, 1.08, 0.15);
    let s = new Mesh(new CylinderGeometry(0.012, 0.012, 2.4, 5), TANK_BLACK_MAT);
    s.position.set(-0.8, 1.9, -1.1), this.turret.add(s);
    let c = new MeshStandardMaterial({
      map: makeTreadTexture(),
      roughness: 0.8,
    });
    for (let e of [-1, 1]) {
      let t = new Mesh(new PlaneGeometry(0.62, 0.62), c);
      t.position.set(e * 1.16, 0.4, 0.1), (t.rotation.y = (e * Math.PI) / 2), this.turret.add(t);
    }
  }
  summon(e) {
    let t = e.vel,
      n = t.x,
      r = t.z,
      i = Math.hypot(n, r);
    i < 1 ? ((n = Math.sin(e.yaw)), (r = Math.cos(e.yaw))) : ((n /= i), (r /= i)),
      this.pos.set(e.pos.x - n * 55, 0, e.pos.z - r * 55),
      (this.pos.y = groundHeight(this.pos.x, this.pos.z)),
      (this.yaw = Math.atan2(n, r)),
      (this.speed = Math.max(10, i)),
      (this.mode = `hunting`),
      (this.t = 0),
      (this.active = !0),
      (this.root.visible = !0),
      (this.turret.rotation.y = 0);
  }
  reset() {
    (this.active = !1), (this.mode = `idle`), (this.root.visible = !1);
  }
  distTo(e) {
    return Math.hypot(e.x - this.pos.x, e.z - this.pos.z);
  }
  update(e, t, n, r) {
    if (!this.active) return null;
    this.t += e;
    let i = null,
      a = t.x - this.pos.x,
      o = t.z - this.pos.z,
      s = Math.hypot(a, o);
    if (this.mode === `hunting`) {
      let t = Math.atan2(a, o),
        c = Math.atan2(Math.sin(t - this.yaw), Math.cos(t - this.yaw));
      this.yaw += Math.max(-1, Math.min(1, c)) * Math.min(1, e * 2.5);
      let l = Math.min(36, Math.max(18, n + 11));
      (this.speed += (l - this.speed) * Math.min(1, e * 1.2)),
        s < 2.8 && r
          ? ((this.mode = `leaving`), (this.t = 0), (i = `hit`))
          : this.t > 30 && ((this.mode = `leaving`), (this.t = 0));
      let u = Math.atan2(Math.sin(t - this.yaw), Math.cos(t - this.yaw));
      this.turret.rotation.y += (u - this.turret.rotation.y) * Math.min(1, e * 3);
    } else
      this.mode === `leaving` &&
        ((this.speed += (14 - this.speed) * Math.min(1, e * 0.6)),
        (this.turret.rotation.y *= Math.exp(-e * 1.5)),
        this.t > 5 && this.reset());
    (this.pos.x += Math.sin(this.yaw) * this.speed * e), (this.pos.z += Math.cos(this.yaw) * this.speed * e);
    let c = Math.sin(this.yaw),
      l = Math.cos(this.yaw),
      u = groundHeight(this.pos.x + c * 2.8, this.pos.z + l * 2.8),
      d = groundHeight(this.pos.x - c * 2.8, this.pos.z - l * 2.8),
      f = groundHeight(this.pos.x + l * 1.5, this.pos.z - c * 1.5),
      p = groundHeight(this.pos.x - l * 1.5, this.pos.z + c * 1.5),
      m = Math.max((u + d) / 2, (f + p) / 2, groundHeight(this.pos.x, this.pos.z));
    this.pos.y += (m - this.pos.y) * Math.min(1, e * 10);
    let h = Math.min(1, e * 6);
    (this.pitch += (Math.atan2(d - u, 5.6) - this.pitch) * h),
      (this.roll += (Math.atan2(f - p, 3) - this.roll) * h),
      this.root.position.copy(this.pos),
      this.root.rotation.set(0, this.yaw, 0),
      this.body.rotation.set(this.pitch, 0, this.roll);
    for (let t of this.wheels) t.rotation.x += (this.speed / 0.42) * e;
    return i;
  }
};

export { Tank };
