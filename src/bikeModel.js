// Bike and rider meshes plus the rider pose/animation rig.
import {
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const v3 = (e, t, n) => new Vector3(e, t, n);

const MODEL_UP = v3(0, 1, 0);

const BIKE_POINTS = {
  rearAxle: v3(0, 0.37, -0.63),
  frontAxle: v3(0, 0.37, 0.65),
  bb: v3(0, 0.33, -0.08),
  seatTop: v3(0, 0.84, -0.3),
  htTop: v3(0, 0.99, 0.38),
  htBot: v3(0, 0.83, 0.45),
};

const STEER_AXIS = new Vector3().subVectors(BIKE_POINTS.htBot, BIKE_POINTS.htTop).normalize();

const TRICK_PIVOT_HEIGHT = 0.85;

const MATERIALS = {
  paint: new MeshPhysicalMaterial({
    color: `#e4572e`,
    metalness: 0.35,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  }),
  black: new MeshStandardMaterial({
    color: `#1b1c1f`,
    metalness: 0.55,
    roughness: 0.38,
  }),
  silver: new MeshStandardMaterial({
    color: `#c9ccd1`,
    metalness: 1,
    roughness: 0.25,
  }),
  gold: new MeshStandardMaterial({
    color: `#d9a640`,
    metalness: 1,
    roughness: 0.18,
  }),
  rubber: new MeshStandardMaterial({
    color: `#191716`,
    metalness: 0,
    roughness: 0.93,
  }),
  spring: new MeshStandardMaterial({
    color: `#f2b705`,
    metalness: 0.4,
    roughness: 0.35,
  }),
  saddle: new MeshStandardMaterial({
    color: `#141414`,
    metalness: 0,
    roughness: 0.55,
  }),
  jersey: new MeshStandardMaterial({
    color: `#1f8a8a`,
    metalness: 0,
    roughness: 0.82,
  }),
  jerseyAccent: new MeshStandardMaterial({
    color: `#efe9dc`,
    metalness: 0,
    roughness: 0.8,
  }),
  pants: new MeshStandardMaterial({
    color: `#2b2e35`,
    metalness: 0,
    roughness: 0.88,
  }),
  pads: new MeshStandardMaterial({
    color: `#16171a`,
    metalness: 0.1,
    roughness: 0.6,
  }),
  helmet: new MeshPhysicalMaterial({
    color: `#f4f1ea`,
    metalness: 0.1,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }),
  helmetStripe: new MeshPhysicalMaterial({
    color: `#e4572e`,
    metalness: 0.2,
    roughness: 0.35,
    clearcoat: 1,
  }),
  lens: new MeshPhysicalMaterial({
    color: `#ffb347`,
    metalness: 1,
    roughness: 0.06,
    clearcoat: 1,
    iridescence: 0.6,
  }),
  glove: new MeshStandardMaterial({
    color: `#262626`,
    roughness: 0.7,
  }),
  shoe: new MeshStandardMaterial({
    color: `#2a2a2a`,
    roughness: 0.75,
  }),
  sole: new MeshStandardMaterial({
    color: `#8a5a32`,
    roughness: 0.9,
  }),
  pack: new MeshStandardMaterial({
    color: `#3a3f2c`,
    roughness: 0.85,
  }),
  spokes: new LineBasicMaterial({
    color: `#9ba0a6`,
    transparent: !0,
    opacity: 0.75,
  }),
  blur: new MeshBasicMaterial({
    color: `#2a2b2d`,
    transparent: !0,
    opacity: 0,
    depthWrite: !1,
    side: 2,
  }),
};

function enableShadows(e) {
  return (
    e.traverse((e) => {
      e.isMesh && ((e.castShadow = !0), (e.receiveShadow = !0));
    }),
    e
  );
}

function tube(e, t, n, r, i = n, a = 14) {
  let o = new Vector3().subVectors(t, e),
    s = new Mesh(new CylinderGeometry(i, n, o.length(), a, 1), r);
  return (
    s.position.copy(e).addScaledVector(o, 0.5), s.quaternion.setFromUnitVectors(MODEL_UP, o.normalize()), s
  );
}

function joint(e, t, n) {
  let r = new Mesh(new SphereGeometry(t, 14, 10), n);
  return r.position.copy(e), r;
}

function buildWheel() {
  let e = new Group(),
    t = new TorusGeometry(0.325, 0.048, 16, 144),
    n = t.attributes.position,
    r = new Vector3();
  for (let e = 0; e < n.count; e++) {
    r.fromBufferAttribute(n, e);
    let t = Math.atan2(r.y, r.x),
      i = Math.hypot(r.x, r.y),
      a = Math.atan2(r.z, i - 0.325),
      o = Math.floor(((t + Math.PI) / (Math.PI * 2)) * 72) % 2 == 0 && Math.abs(a) < 1.25 ? 0.008 : 0,
      s =
        Math.abs(a) > 0.9 && Math.abs(a) < 1.5 && Math.floor(((t + Math.PI) / (Math.PI * 2)) * 36) % 2 == 1
          ? 0.006
          : 0,
      c = (i + o + s) / i;
    n.setXYZ(e, r.x * c, r.y * c, r.z);
  }
  t.computeVertexNormals(), t.rotateY(Math.PI / 2), e.add(new Mesh(t, MATERIALS.rubber));
  let i = new Mesh(new TorusGeometry(0.288, 0.014, 8, 72).rotateY(Math.PI / 2), MATERIALS.black);
  e.add(i);
  let a = [];
  for (let e = 0; e < 32; e++) {
    let t = (e / 32) * Math.PI * 2,
      n = e % 2 ? 1 : -1,
      r = t + n * 0.3;
    a.push(n * 0.035, Math.sin(r) * 0.03, Math.cos(r) * 0.03, 0, Math.sin(t) * 0.282, Math.cos(t) * 0.282);
  }
  let o = new BufferGeometry();
  o.setAttribute(`position`, new Float32BufferAttribute(a, 3)), e.add(new LineSegments(o, MATERIALS.spokes));
  let s = new Mesh(new RingGeometry(0.04, 0.28, 40).rotateY(Math.PI / 2), MATERIALS.blur.clone());
  e.add(s),
    (e.userData.blur = s),
    e.add(new Mesh(new CylinderGeometry(0.03, 0.03, 0.11, 16).rotateZ(Math.PI / 2), MATERIALS.black));
  let c = new Mesh(new CylinderGeometry(0.1, 0.1, 0.004, 32, 1, !0).rotateZ(Math.PI / 2), MATERIALS.silver);
  c.position.x = 0.045;
  let l = new Mesh(new RingGeometry(0.075, 0.1, 32).rotateY(Math.PI / 2), MATERIALS.silver);
  return (l.position.x = 0.045), e.add(c, l), enableShadows(e);
}

function buildCoilSpring(e, t) {
  let n = [],
    r = 0.032;
  for (let e = 0; e <= 144; e++) {
    let t = e / 144,
      i = t * 9 * Math.PI * 2;
    n.push(new Vector3(Math.cos(i) * r, t, Math.sin(i) * r));
  }
  let i = new Mesh(new TubeGeometry(new CatmullRomCurve3(n), 144, 0.0065, 6, !1), MATERIALS.spring),
    a = new Vector3().subVectors(t, e);
  return (
    i.scale.set(1, a.length(), 1),
    i.position.copy(e),
    i.quaternion.setFromUnitVectors(MODEL_UP, a.normalize()),
    i
  );
}

function solveTwoBoneIK(e, t, n, r, i, a, o) {
  let s = new Vector3().subVectors(t, e),
    c = s.length(),
    l = s.clone().divideScalar(c || 1);
  c = Math.min(Math.max(c, Math.abs(n - r) + 0.01), (n + r) * 0.999);
  let u = (n * n - r * r + c * c) / (2 * c),
    d = Math.sqrt(Math.max(0, n * n - u * u)),
    f = i.clone().addScaledVector(l, -i.dot(l)).normalize();
  a.copy(e).addScaledVector(l, u).addScaledVector(f, d), o && o.copy(e).addScaledVector(l, c);
}

const Limb = class {
  constructor(e, t, n, r) {
    (this.len = n),
      (this.mesh = new Mesh(new CapsuleGeometry(t, n, 6, 14), r)),
      (this.mesh.castShadow = !0),
      e.add(this.mesh);
  }
  set(e, t) {
    let n = new Vector3().subVectors(t, e),
      r = n.length();
    this.mesh.position.copy(e).addScaledVector(n, 0.5),
      this.mesh.quaternion.setFromUnitVectors(MODEL_UP, n.divideScalar(r || 1)),
      this.mesh.scale.set(1, r / this.len, 1);
  }
};

const BikeRig = class {
  constructor(e) {
    (this.root = new Group()),
      (this.root.rotation.order = `YXZ`),
      (this.trick = new Group()),
      (this.trick.position.y = TRICK_PIVOT_HEIGHT),
      (this.trick.rotation.order = `YXZ`),
      (this.content = new Group()),
      (this.content.position.y = -0.85),
      this.root.add(this.trick),
      this.trick.add(this.content),
      e.add(this.root),
      this._buildBike(),
      this._buildRider(),
      (this.visPitch = 0),
      (this.visRoll = 0),
      (this.crashSpin = new Vector3()),
      (this.crashT = 0),
      (this._v = {}),
      (this.tmp = {
        a: new Vector3(),
        b: new Vector3(),
        c: new Vector3(),
      });
  }
  _buildBike() {
    (this.front = new Group()), this.front.position.copy(BIKE_POINTS.htTop), this.content.add(this.front);
    let e = new Group();
    e.position.copy(BIKE_POINTS.htTop).negate(),
      this.front.add(e),
      e.add(
        tube(
          BIKE_POINTS.htTop.clone().addScaledVector(STEER_AXIS, -0.03),
          BIKE_POINTS.htBot.clone().addScaledVector(STEER_AXIS, 0.03),
          0.032,
          MATERIALS.paint,
        ),
      );
    let t = BIKE_POINTS.htBot.clone().addScaledVector(STEER_AXIS, 0.06);
    for (let n of [-1, 1]) {
      let r = t.clone().add(v3(0.075 * n, 0, 0)),
        i = r.clone().addScaledVector(STEER_AXIS, 0.26),
        a = BIKE_POINTS.frontAxle.clone().add(v3(0.06 * n, 0, 0));
      e.add(tube(r.clone().addScaledVector(STEER_AXIS, -0.05), i, 0.019, MATERIALS.gold)),
        e.add(tube(i.clone().addScaledVector(STEER_AXIS, -0.03), a, 0.026, MATERIALS.black));
    }
    e.add(tube(t.clone().add(v3(-0.09, 0, 0)), t.clone().add(v3(0.09, 0, 0)), 0.022, MATERIALS.black));
    let n = t
      .clone()
      .addScaledVector(STEER_AXIS, 0.3)
      .add(v3(0.065, 0, 0.04));
    e.add(tube(n, n.clone().add(v3(-0.13, 0, 0)), 0.016, MATERIALS.black));
    let r = BIKE_POINTS.htTop.clone().addScaledVector(STEER_AXIS, -0.06);
    e.add(tube(BIKE_POINTS.htTop, r, 0.02, MATERIALS.black));
    let i = r.clone().add(v3(0, 0.015, 0.035));
    e.add(tube(r, i, 0.018, MATERIALS.black)), (this.grips = []);
    for (let t of [-1, 1]) {
      let n = i.clone().add(v3(0.1 * t, 0.025, -0.005)),
        r = i.clone().add(v3(0.39 * t, 0.045, -0.04));
      e.add(tube(i, n, 0.0125, MATERIALS.black)), e.add(tube(n, r, 0.011, MATERIALS.black));
      let a = r.clone().lerp(n, 0.38);
      e.add(tube(a, r.clone().add(v3(0.01 * t, 0, 0)), 0.017, MATERIALS.rubber));
      let o = new Object3D();
      o.position.copy(r.clone().lerp(a, 0.45)),
        e.add(o),
        this.grips.push(o),
        e.add(
          tube(
            a.clone().add(v3(-0.01 * t, 0.01, 0.01)),
            a.clone().add(v3(0.09 * t, -0.005, 0.07)),
            0.006,
            MATERIALS.silver,
          ),
        );
    }
    (this.frontWheel = buildWheel()),
      this.frontWheel.position.copy(BIKE_POINTS.frontAxle),
      e.add(this.frontWheel);
    let a = new Mesh(new RoundedBoxGeometry(0.03, 0.06, 0.09, 2, 0.01), MATERIALS.black);
    a.position.copy(BIKE_POINTS.frontAxle).add(v3(0.065, 0.08, -0.04)),
      e.add(a),
      enableShadows(e),
      (this.whip = new Group()),
      this.whip.position.copy(BIKE_POINTS.htTop),
      this.content.add(this.whip);
    let o = new Group();
    o.position.copy(BIKE_POINTS.htTop).negate(), this.whip.add(o);
    let s = v3(0, 0.8, -0.22);
    o.add(tube(BIKE_POINTS.htTop.clone().add(v3(0, -0.02, 0.01)), s, 0.024, MATERIALS.paint, 0.028)),
      o.add(tube(BIKE_POINTS.htBot, BIKE_POINTS.bb, 0.034, MATERIALS.paint, 0.03)),
      o.add(tube(BIKE_POINTS.bb, BIKE_POINTS.seatTop, 0.026, MATERIALS.paint)),
      o.add(joint(BIKE_POINTS.bb, 0.045, MATERIALS.paint)),
      o.add(joint(s, 0.03, MATERIALS.paint));
    let c = v3(0, 0.42, -0.14),
      l = v3(0, 0.68, -0.26);
    for (let e of [-1, 1]) {
      let t = BIKE_POINTS.rearAxle.clone().add(v3(0.065 * e, 0, 0));
      o.add(tube(c.clone().add(v3(0.04 * e, 0, 0)), t, 0.017, MATERIALS.paint, 0.02)),
        o.add(tube(l.clone().add(v3(0.035 * e, 0, 0)), t, 0.014, MATERIALS.paint));
    }
    o.add(tube(l.clone().add(v3(-0.05, 0, 0)), l.clone().add(v3(0.05, 0, 0)), 0.018, MATERIALS.paint));
    let u = v3(0, 0.72, -0.16),
      d = v3(0, 0.77, -0.06),
      f = v3(0, 0.48, -0.16);
    o.add(tube(l, u, 0.018, MATERIALS.black)),
      o.add(tube(f, d.clone().lerp(f, 0.45), 0.024, MATERIALS.black)),
      o.add(tube(d.clone().lerp(f, 0.4), d, 0.016, MATERIALS.silver)),
      o.add(buildCoilSpring(f.clone().lerp(d, 0.08), f.clone().lerp(d, 0.8)));
    let p = BIKE_POINTS.seatTop.clone().add(v3(0, 0.06, -0.025));
    o.add(tube(BIKE_POINTS.seatTop, p, 0.016, MATERIALS.black));
    let m = new Mesh(new CapsuleGeometry(0.06, 0.18, 6, 12), MATERIALS.saddle);
    (m.rotation.x = Math.PI / 2 - 0.08),
      m.scale.set(1, 1, 0.35),
      m.position.copy(p).add(v3(0, 0.025, 0.02)),
      o.add(m),
      (this.saddle = m),
      (this.rearWheel = buildWheel()),
      this.rearWheel.position.copy(BIKE_POINTS.rearAxle),
      o.add(this.rearWheel);
    let h = a.clone();
    h.position.copy(BIKE_POINTS.rearAxle).add(v3(0.065, 0.09, 0.06)),
      o.add(h),
      (this.crank = new Group()),
      this.crank.position.copy(BIKE_POINTS.bb),
      o.add(this.crank);
    let g = new Mesh(new TorusGeometry(0.085, 0.006, 6, 40).rotateY(Math.PI / 2), MATERIALS.silver);
    (g.position.x = -0.06), this.crank.add(g), (this.pedals = []);
    for (let e of [-1, 1]) {
      let t = e < 0 ? 1 : -1,
        n = v3(0.085 * e, 0, 0.17 * t);
      this.crank.add(tube(v3(0.07 * e, 0, 0), n, 0.013, MATERIALS.black));
      let r = new Mesh(new RoundedBoxGeometry(0.1, 0.022, 0.1, 2, 0.008), MATERIALS.black);
      r.position.copy(n).add(v3(0.065 * e, 0, 0)), this.crank.add(r), this.pedals.push(r);
    }
    let _ = [
        BIKE_POINTS.bb.clone().add(v3(-0.06, 0.085, 0)),
        BIKE_POINTS.rearAxle.clone().add(v3(-0.06, 0.045, 0)),
      ],
      v = [
        BIKE_POINTS.bb.clone().add(v3(-0.06, -0.085, 0)),
        BIKE_POINTS.rearAxle.clone().add(v3(-0.06, -0.045, 0)),
      ];
    o.add(
      tube(_[0], _[1], 0.005, MATERIALS.silver, 0.005, 5),
      tube(v[0], v[1], 0.005, MATERIALS.silver, 0.005, 5),
    );
    let y = new Mesh(new CylinderGeometry(0.05, 0.05, 0.035, 20).rotateZ(Math.PI / 2), MATERIALS.silver);
    y.position.copy(BIKE_POINTS.rearAxle).add(v3(-0.045, 0, 0)), o.add(y), enableShadows(o);
  }
  _buildRider() {
    let e = new Group();
    (this.rider = e),
      this.content.add(e),
      (this.limbs = {
        thighL: new Limb(e, 0.072, 0.45, MATERIALS.pants),
        thighR: new Limb(e, 0.072, 0.45, MATERIALS.pants),
        shinL: new Limb(e, 0.056, 0.45, MATERIALS.pants),
        shinR: new Limb(e, 0.056, 0.45, MATERIALS.pants),
        upperL: new Limb(e, 0.05, 0.3, MATERIALS.jersey),
        upperR: new Limb(e, 0.05, 0.3, MATERIALS.jersey),
        foreL: new Limb(e, 0.043, 0.28, MATERIALS.jerseyAccent),
        foreR: new Limb(e, 0.043, 0.28, MATERIALS.jerseyAccent),
      }),
      (this.torso = new Group()),
      e.add(this.torso);
    let t = new Mesh(new CapsuleGeometry(0.13, 0.26, 8, 18), MATERIALS.jersey);
    t.scale.set(1.32, 1, 0.82), (t.position.y = 0.2);
    let n = new Mesh(new CylinderGeometry(0.135, 0.135, 0.05, 20, 1, !0), MATERIALS.jerseyAccent);
    n.scale.set(1.33, 1, 0.83), (n.position.y = 0.2);
    let r = new Mesh(new SphereGeometry(0.13, 18, 12), MATERIALS.pants);
    r.scale.set(1.25, 0.8, 0.95);
    let i = new Mesh(new RoundedBoxGeometry(0.26, 0.32, 0.1, 3, 0.04), MATERIALS.pack);
    i.position.set(0, 0.26, -0.15);
    let a = new Mesh(new CapsuleGeometry(0.075, 0.26, 6, 12), MATERIALS.jersey);
    (a.rotation.z = Math.PI / 2),
      (a.position.y = 0.4),
      this.torso.add(t, n, r, i, a),
      (this.head = new Group()),
      e.add(this.head);
    let o = new Mesh(new SphereGeometry(0.15, 28, 20), MATERIALS.helmet);
    o.scale.set(1, 1.02, 1.12);
    let s = new Mesh(new SphereGeometry(0.152, 28, 20, 0, Math.PI * 2, 0, 0.9), MATERIALS.helmetStripe);
    s.scale.set(0.35, 1.03, 1.13);
    let c = new Mesh(new TorusGeometry(0.11, 0.035, 10, 24, Math.PI * 0.9), MATERIALS.helmet);
    c.rotation.set(Math.PI / 2 + 0.25, 0, Math.PI * 0.05), c.position.set(0, -0.08, 0.05);
    let l = new Mesh(new RoundedBoxGeometry(0.24, 0.02, 0.12, 2, 0.008), MATERIALS.helmet);
    l.position.set(0, 0.11, 0.15), (l.rotation.x = 0.35);
    let u = new Mesh(new CylinderGeometry(0.155, 0.155, 0.06, 24, 1, !0, -0.8, 1.6), MATERIALS.lens);
    u.position.set(0, 0.02, 0.01), u.scale.set(1, 1, 1.12);
    let d = new Mesh(new TorusGeometry(0.158, 0.012, 6, 32), MATERIALS.black);
    (d.rotation.x = Math.PI / 2),
      (d.position.y = 0.02),
      d.scale.set(1, 1.12, 1),
      this.head.add(o, s, c, l, u, d),
      (this.neck = new Limb(e, 0.05, 0.08, MATERIALS.jersey)),
      (this.hands = [joint(v3(), 0.048, MATERIALS.glove), joint(v3(), 0.048, MATERIALS.glove)]),
      e.add(...this.hands),
      (this.feet = []);
    for (let t = 0; t < 2; t++) {
      let t = new Group(),
        n = new Mesh(new CapsuleGeometry(0.048, 0.16, 6, 12), MATERIALS.shoe);
      (n.rotation.x = Math.PI / 2), (n.position.z = 0.04), n.scale.set(1.1, 1, 0.75);
      let r = new Mesh(new RoundedBoxGeometry(0.1, 0.02, 0.27, 2, 0.008), MATERIALS.sole);
      r.position.set(0, -0.035, 0.04), t.add(n, r), e.add(t), this.feet.push(t);
    }
    (this.kneePads = [0, 1].map(() => {
      let t = new Mesh(new RoundedBoxGeometry(0.12, 0.17, 0.08, 2, 0.03), MATERIALS.pads);
      return e.add(t), t;
    })),
      enableShadows(e);
  }
  _local(e, t) {
    return e.getWorldPosition(t), this.content.worldToLocal(t);
  }
  update(e, t, n, r) {
    let i = this.root,
      a = r.crashed && this.flatten,
      o = Math.min(1, e * (a ? 30 : 6));
    if (
      ((this.root.scale.x += ((a ? 1.45 : 1) - this.root.scale.x) * o),
      (this.root.scale.y += ((a ? 0.12 : 1) - this.root.scale.y) * o),
      (this.root.scale.z += ((a ? 1.3 : 1) - this.root.scale.z) * o),
      r.crashed || (this.flatten = !1),
      a)
    )
      (this.crashT += e),
        i.position.set(t.pos.x, r.groundAt(t.pos.x, t.pos.z) + 0.02, t.pos.z),
        i.rotation.set(0, t.yaw, 0);
    else if (r.crashed) this._updateCrash(e, t, r);
    else {
      (this.crashT = 0), i.position.copy(t.pos);
      let r = this.tmp.a.set(-Math.cos(t.yaw), 0, Math.sin(t.yaw)),
        a = t.grounded ? Math.asin(Math.max(-1, Math.min(1, t.normal.dot(r)))) : 0,
        o = Math.min(1, e * (t.grounded ? 14 : 8));
      (this.visPitch += (t.pitch - this.visPitch) * o),
        (this.visRoll += (a + t.lean - this.visRoll) * o),
        i.rotation.set(-this.visPitch, t.yaw, this.visRoll);
      let s = n.visualYaw,
        c = n.flip,
        l = null;
      t.grounded &&
        (n.butter
          ? ((c = n.butterPitch), (l = BIKE_POINTS.frontAxle.z))
          : n.wheelie > 0.002 && ((c = -n.wheelie), (l = BIKE_POINTS.rearAxle.z))),
        this.trick.rotation.set(c, s, 0);
      let u = this.tmp.b.set(0, TRICK_PIVOT_HEIGHT, 0);
      if (l === null) this.trick.position.copy(u);
      else {
        let e = this.tmp.c.set(0, 0.02, l),
          t = this.trick.quaternion,
          n = (this._yq ||= new Quaternion());
        n.setFromAxisAngle(MODEL_UP, s),
          u.sub(e).applyQuaternion(t),
          this.trick.position.copy(e).applyQuaternion(n).add(u);
      }
      this.content.position.y = -0.85 - t.compression * 0.06;
    }
    let s = r.crashed ? Math.sin(r.time * 9) * 0.6 : (t.steer * 0.42) / (1 + t.speed * 0.12);
    this.front.quaternion.setFromAxisAngle(STEER_AXIS, -s),
      this.whip.quaternion.setFromAxisAngle(STEER_AXIS, n.whipActive ? n.whip * Math.PI * 2 : 0);
    let c = Math.cos(n.visualYaw) < 0 ? -1 : 1;
    (this.frontWheel.rotation.x = t.wheelAngle * c), (this.rearWheel.rotation.x = t.wheelAngle * c);
    let l = Math.min(0.6, Math.abs(t.wheelRate) / 50);
    (this.frontWheel.userData.blur.material.opacity = l),
      (this.rearWheel.userData.blur.material.opacity = l),
      (this.crank.rotation.x = t.crankAngle);
    for (let e of this.pedals) e.rotation.x = -t.crankAngle;
    this.root.updateMatrixWorld(!0), this._poseRider(e, t, n, r);
  }
  _updateCrash(e, t, n) {
    let r = this.root;
    this.crashT === 0 &&
      ((this.crashVel = t.vel.clone()),
      this.crashSpin.set((Math.random() - 0.3) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9)),
      (this.crashT += e),
      (this.crashVel.y -= 9.81 * e),
      r.position.addScaledVector(this.crashVel, e);
    let i = n.groundAt(r.position.x, r.position.z);
    r.position.y < i &&
      ((r.position.y = i),
      (this.crashVel.y = Math.abs(this.crashVel.y) * 0.25),
      (this.crashVel.x *= 0.86),
      (this.crashVel.z *= 0.86),
      this.crashSpin.multiplyScalar(0.8)),
      (r.rotation.x += this.crashSpin.x * e),
      (r.rotation.y += this.crashSpin.y * e),
      (r.rotation.z += this.crashSpin.z * e),
      this.crashSpin.multiplyScalar(Math.exp(-e * 0.8));
  }
  _poseRider(e, t, n, r) {
    let i = r.time,
      a = t.compression,
      o = [this._local(this.grips[0], new Vector3()), this._local(this.grips[1], new Vector3())],
      s = [this._local(this.pedals[0], new Vector3()), this._local(this.pedals[1], new Vector3())],
      c = this._local(this.saddle, new Vector3()),
      l = t.pedalling && t.speed < 9 && t.grounded,
      u = l ? v3(0, 1, -0.27) : v3(0, 1.08, -0.21),
      d = l ? v3(0, 1.42, 0) : v3(0, 1.42, 0.07);
    (u.y -= a * 0.24),
      (d.y -= a * 0.2),
      (d.z += a * 0.05),
      t.braking && ((u.z -= 0.09), (d.z -= 0.06), (u.y -= 0.03)),
      t.grounded || (u.y += 0.04),
      (u.x += t.lean * 0.1),
      (d.x += t.lean * 0.16),
      t.pedalling && ((d.x += Math.sin(t.crankAngle) * 0.025), (u.x += Math.sin(t.crankAngle) * 0.015));
    let f = [o[0].clone(), o[1].clone()],
      p = [s[0].clone().add(v3(0, 0.045, 0)), s[1].clone().add(v3(0, 0.045, 0))],
      m = Math.min(1, n.wheelie / 0.45);
    m > 0.01 && ((u.z -= 0.14 * m), (u.y -= 0.05 * m), (d.z -= 0.16 * m), (d.y -= 0.04 * m));
    let h = n.butterPitch / 0.3;
    h > 0.01 && ((d.z += 0.14 * h), (u.z += 0.08 * h), (u.y += 0.04 * h));
    let g = n.pose.superman,
      _ = n.pose.nohander,
      v = n.pose.cancan;
    if (
      (g > 0.001 &&
        (u.lerp(v3(0, 1.32, -0.62), g),
        d.lerp(v3(0, 1.4, 0.02), g),
        p[0].lerp(v3(-0.13, 1.42, -1.42), g),
        p[1].lerp(v3(0.13, 1.45, -1.4), g),
        f[1].lerp(c.clone().add(v3(0.02, 0.05, -0.03)), g)),
      _ > 0.001 &&
        (d.lerp(v3(0, 1.55, -0.04), _),
        u.lerp(v3(0, 1.12, -0.26), _),
        f[0].lerp(v3(-0.72, 1.72, -0.05), _),
        f[1].lerp(v3(0.72, 1.72, -0.05), _)),
      v > 0.001 && (p[1].lerp(v3(-0.38, 0.9, 0.32), v), u.lerp(v3(-0.04, 1.12, -0.24), v)),
      n.whipActive || n.whip > 0)
    ) {
      let e = Math.sin(Math.min(1, n.whip) * Math.PI) * 0.5 + (n.whipActive ? 0.5 : 0);
      p[0].lerp(v3(-0.34, 0.78, -0.12), e),
        p[1].lerp(v3(0.34, 0.78, -0.12), e),
        u.lerp(v3(0, 1.16, -0.12), e);
    }
    if (r.crashed) {
      let e = Math.min(1, this.crashT * 3);
      f[0].lerp(v3(-0.6 + Math.sin(i * 11) * 0.3, 1.2 + Math.sin(i * 7) * 0.4, Math.cos(i * 9) * 0.4), e),
        f[1].lerp(v3(0.6 + Math.sin(i * 10) * 0.3, 1.2 + Math.cos(i * 8) * 0.4, Math.sin(i * 7) * 0.4), e),
        p[0].lerp(v3(-0.3, 0.6 + Math.sin(i * 9) * 0.3, -0.5 + Math.cos(i * 6) * 0.3), e),
        p[1].lerp(v3(0.3, 0.6 + Math.cos(i * 8) * 0.3, -0.5 + Math.sin(i * 7) * 0.3), e);
    }
    let y = new Vector3().subVectors(d, u).normalize(),
      b = v3(0, 0, 1).addScaledVector(y, -y.z).normalize(),
      x = new Vector3().crossVectors(y, b).normalize(),
      S = new Matrix4().makeBasis(x, y, b);
    this.torso.position.copy(u), this.torso.quaternion.setFromRotationMatrix(S);
    let C = u.distanceTo(d);
    this.torso.scale.set(1, C / 0.42, 1);
    let w = d.clone().addScaledVector(y, -0.02),
      T = [w.clone().addScaledVector(x, -0.2), w.clone().addScaledVector(x, 0.2)],
      E = [u.clone().addScaledVector(x, -0.1), u.clone().addScaledVector(x, 0.1)],
      D = d.clone().addScaledVector(y, 0.06),
      O = D.clone().add(v3(0, 0.2, 0.1));
    this.neck.set(D, O.clone().add(v3(0, -0.1, -0.02))),
      this.head.position.copy(O),
      this.head.rotation.set(
        0.25 - a * 0.15 + (r.crashed ? Math.sin(i * 8) * 0.5 : 0),
        -t.steer * 0.15,
        -t.lean * 0.4,
      );
    let k = this.limbs,
      A = new Vector3(),
      ee = new Vector3();
    for (let e = 0; e < 2; e++) {
      let t = e === 0 ? -1 : 1;
      solveTwoBoneIK(E[e], p[e], 0.45, 0.45, v3(t * 0.18, 0.05, 1), A, ee),
        (e ? k.thighL : k.thighR).set(E[e], A),
        (e ? k.shinL : k.shinR).set(A, ee),
        this.feet[e].position.copy(ee),
        this.feet[e].rotation.set(g > 0.5 ? -1.2 * g : 0, 0, 0);
      let n = this.kneePads[e],
        r = new Vector3().subVectors(ee, A).normalize();
      n.position
        .copy(A)
        .addScaledVector(r, 0.07)
        .add(v3(0, 0, 0.045)),
        n.quaternion.setFromUnitVectors(MODEL_UP, r);
    }
    for (let e = 0; e < 2; e++) {
      let t = e === 0 ? -1 : 1;
      solveTwoBoneIK(T[e], f[e], 0.3, 0.29, v3(t * 1, -0.4, -0.5), A, ee),
        (e ? k.upperL : k.upperR).set(T[e], A),
        (e ? k.foreL : k.foreR).set(A, ee),
        this.hands[e].position.copy(ee);
    }
  }
  rearContact(e) {
    return e.set(0, 0.02, BIKE_POINTS.rearAxle.z).applyMatrix4(this.root.matrixWorld);
  }
  frontContact(e) {
    return e.set(0, 0.02, BIKE_POINTS.frontAxle.z).applyMatrix4(this.root.matrixWorld);
  }
};

export { BikeRig };
