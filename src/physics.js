// Bike physics: ground contact, air, landings and crashes.
import { Vector3 } from 'three';
import { CONFIG } from './config.js';
import { clamp, smoothstep } from './noise.js';
import { JUMPS, groundHeight, groundNormal, sampleGround, trailBank, trailPointAt } from './trail.js';
import { queryColliders } from './props.js';

const GRAVITY = CONFIG.gravity;

const PHYS_UP = new Vector3(0, 1, 0);

const AIR_DRAG = 0.0042;

const MAX_PEDAL_SPEED = 15.5;

const _physA = new Vector3();

const _physB = new Vector3();

const _physC = new Vector3();

function wrapAngle(e) {
  return Math.atan2(Math.sin(e), Math.cos(e));
}

const BikePhysics = class {
  constructor() {
    (this.pos = new Vector3()),
      (this.vel = new Vector3()),
      (this.normal = new Vector3(0, 1, 0)),
      (this.forward = new Vector3(0, 0, -1)),
      (this.yaw = Math.PI),
      (this.steer = 0),
      (this.yawRate = 0),
      (this.lean = 0),
      (this.pitch = 0),
      (this.airPitchInput = 0),
      (this.grounded = !0),
      (this.airTime = 0),
      (this.compression = 0),
      (this.slip = 0),
      (this.braking = !1),
      (this.pedalling = !1),
      (this.onTrail = 1),
      (this.onRamp = !1),
      (this.fwdSpeed = 0),
      (this.crankAngle = 0),
      (this.wheelAngle = 0),
      (this.wheelRate = 0),
      (this.lastHop = 0),
      (this.popWindow = 0),
      (this.time = 0),
      (this.maxHeight = 0),
      (this.takeoffY = 0),
      (this.crashed = !1),
      (this.lastSafeZ = 0),
      (this._info = {
        y: 0,
        onRamp: !1,
        jump: null,
        trail: 0,
        dn: 0,
      }),
      (this.events = []);
  }
  spawnAt(e, t = 0) {
    let n = trailPointAt(e);
    this.pos.set(n.x, n.y, n.z),
      (this.yaw = n.yaw),
      groundNormal(n.x, n.z, this.normal),
      this._updateForward(),
      this.vel.copy(this.forward).multiplyScalar(t),
      (this.grounded = !0),
      (this.crashed = !1),
      (this.steer = 0),
      (this.lean = 0),
      (this.airTime = 0),
      (this.compression = 0),
      (this.airPitchInput = 0),
      (this.pitch = Math.asin(clamp(this.forward.y, -1, 1))),
      (this.lastSafeZ = e),
      (this.grace = 0),
      (this.events = []);
  }
  respawnZ() {
    let e = this.crashZ ?? this.lastSafeZ,
      t = this.lastSafeZ + 4,
      n = this.lastRespawnZ !== void 0 && Math.abs(e - this.lastRespawnZ) < 60,
      r = (e, t) => JUMPS.find((n) => e < n.oz + t && e > n.oz - n.total - 6),
      i = r(e, 40) || r(t, 40);
    i ? (t = i.oz - i.total - 8) : n && (t = e - 25);
    for (let e = 0; e < 20; e++) {
      let e = r(t, 6);
      if (e) {
        t = e.oz - e.total - 8;
        continue;
      }
      let n = trailPointAt(t);
      if (queryColliders(n.x, n.z, 1.2)) t -= 4;
      else break;
    }
    return (t = Math.max(t, -CONFIG.trailLength + 30)), (this.lastRespawnZ = t), Math.min(t, -2);
  }
  _updateForward() {
    _physA.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)),
      this.forward.copy(_physA).addScaledVector(this.normal, -_physA.dot(this.normal)).normalize();
  }
  get speed() {
    return this.vel.length();
  }
  step(e, t) {
    if (((this.time += e), (this.popWindow += e), t.hop && (this.popWindow = 0), !this.crashed)) {
      if (
        (this.grace > 0 && (this.grace -= e),
        this.grounded ? this._stepGround(e, t) : this._stepAir(e, t),
        (this.compression += (0 - this.compression) * Math.min(1, e * 5)),
        (this.wheelRate = this.grounded ? this.fwdSpeed / 0.37 : this.wheelRate * Math.exp(-e * 0.4)),
        (this.wheelAngle += this.wheelRate * e),
        this.pedalling && this.grounded)
      )
        this.crankAngle += Math.min(10, 2 + Math.abs(this.fwdSpeed) * 0.6) * e;
      else {
        let t = Math.round(this.crankAngle / Math.PI) * Math.PI;
        this.crankAngle += (t - this.crankAngle) * Math.min(1, e * 4);
      }
      if (!this.crashed && this.pos.y - this._info.y < 1.6) {
        let e = queryColliders(this.pos.x, this.pos.z, 0.3);
        e && this.speed > 2.5 && !(this.grace > 0)
          ? this._crash(e.type === `tree` ? `Hit a tree!` : `Hit a rock!`)
          : e &&
            (_physC.set(this.pos.x - e.x, 0, this.pos.z - e.z).normalize(),
            this.pos.addScaledVector(_physC, 0.05),
            this.vel.multiplyScalar(0.8));
      }
    }
  }
  _stepGround(e, t) {
    let n = this._info;
    this.steer += (t.steer - this.steer) * Math.min(1, e * 7);
    let r = this.fwdSpeed,
      i = clamp(2.5 / (1 + Math.abs(r) * 0.085), 0.55, 2.5) * smoothstep(0, 1.8, Math.abs(r));
    (this.yawRate = this.steer * i * Math.sign(r || 1)),
      (this.yaw += this.yawRate * e),
      this._updateForward(),
      _physB.crossVectors(this.normal, this.forward).normalize();
    let a = this.vel.dot(this.forward),
      o = this.vel.dot(_physB),
      s = -GRAVITY * this.forward.y;
    (this.pedalling = t.throttle && a < MAX_PEDAL_SPEED),
      this.pedalling && (s += 5.2 * (1 - Math.max(0, a) / MAX_PEDAL_SPEED) + (a < 3 ? 2 : 0)),
      (this.braking = !1);
    let c = (0.06 + -0.048 * this.onTrail) * GRAVITY;
    this.onRamp && (c = 0.01 * GRAVITY),
      t.brake &&
        (a > 0.4 ? ((c += 8.5 * (0.6 + 0.4 * this.onTrail)), (this.braking = !0)) : a > -2.5 && (s -= 2.6)),
      (s -= AIR_DRAG * a * Math.abs(a));
    let l = a;
    a += s * e;
    let u = c * e;
    a > 0 ? (a = Math.max(0, a - u)) : a < 0 && (a = Math.min(0, a + u)),
      Math.sign(l) !== Math.sign(a) &&
        !t.brake &&
        !t.throttle &&
        Math.abs(a) < 0.2 &&
        this.forward.y > -0.02 &&
        (a = 0);
    let d = trailBank(this.pos.z),
      f = Math.sign(-d) === Math.sign(this.yawRate * -1) || Math.abs(d) < 0.05,
      p = 5 + 5 * this.onTrail + (f ? Math.abs(d) * 12 : 0);
    this.braking && (p *= 0.6);
    let m = o * Math.exp(-p * e),
      h = Math.max(0, o * o - m * m) * 0.88;
    (a = Math.sign(a || 1) * Math.sqrt(a * a + h) * (a === 0 && h === 0 ? 0 : 1)),
      (this.slip = Math.abs(m) + (this.braking ? Math.abs(a) * 0.12 : 0)),
      (this.fwdSpeed = a),
      this.vel.copy(this.forward).multiplyScalar(a).addScaledVector(_physB, m);
    let g = this.pos.x + this.vel.x * e,
      _ = this.pos.z + this.vel.z * e,
      v = this.pos.y + this.vel.y * e,
      y = v - 0.5 * GRAVITY * e * e;
    if ((sampleGround(g, _, n), t.hop && this.time - this.lastHop > 0.35)) {
      (this.lastHop = this.time),
        this.pos.set(g, Math.max(n.y, v) + 0.02, _),
        this.vel.addScaledVector(this.normal, 4.6).addScaledVector(PHYS_UP, 0.9),
        this._takeoff(!0);
      return;
    }
    if (n.y < y - 0.012) {
      this.pos.set(g, y, _),
        (this.vel.y -= GRAVITY * e),
        this.popWindow < 0.28 &&
          this.speed > 4 &&
          (this.vel.addScaledVector(this.normal, 2.2),
          this.events.push({
            type: `pop`,
          })),
        this._takeoff();
      return;
    }
    if (n.y > v + 0.42 && this.speed > 3) {
      this.pos.set(this.pos.x, this.pos.y, this.pos.z), this._crash(`Cased it!`);
      return;
    }
    this.pos.set(g, n.y, _), _physC.copy(this.normal), groundNormal(g, _, this.normal);
    let b = this.vel.length(),
      x = this.vel.dot(this.normal);
    x < 0 && (this.compression = Math.min(1, this.compression - x * 0.08)),
      this.vel.addScaledVector(this.normal, -x);
    let S = 1 - Math.min(0.02, Math.max(0, -x) * 0.004);
    this.vel.lengthSq() > 1e-6 && this.vel.setLength(b * S),
      (this.onTrail += (+(n.trail > 0.5) - this.onTrail) * Math.min(1, e * 6)),
      (this.onRamp = n.onRamp),
      (this.pitch = Math.asin(clamp(this.forward.y, -1, 1)));
    let C = clamp(-Math.atan((this.yawRate * Math.abs(a)) / GRAVITY), -0.85, 0.85);
    (this.lean += (C - this.lean) * Math.min(1, e * 8)),
      n.trail > 0.6 &&
        !n.onRamp &&
        Math.abs(this.pos.z - this.lastSafeZ) > 2 &&
        (this.lastSafeZ = this.pos.z);
  }
  _takeoff(e = !1) {
    (this.grounded = !1),
      (this.airTime = 0),
      (this.airPitchInput = 0),
      (this.takeoffY = this.pos.y),
      (this.maxHeight = 0),
      this.events.push({
        type: `takeoff`,
        speed: this.speed,
        hop: e,
      });
  }
  _stepAir(e, t) {
    let n = this.vel;
    if (
      ((n.y -= GRAVITY * e), n.addScaledVector(n, -0.0042 * n.length() * e), (this.airTime += e), !t.spinning)
    ) {
      let r = Math.atan2(n.x, n.z);
      this.yaw += t.steer * 1.3 * e;
      let i = wrapAngle(this.yaw - r);
      Math.abs(i) > 0.5 && (this.yaw = r + Math.sign(i) * 0.5);
    }
    (this.steer += (0 - this.steer) * Math.min(1, e * 3)),
      (this.lean += (t.spinning ? 0 : -t.steer * 0.25 - this.lean) * Math.min(1, e * 4)),
      (this.airPitchInput = clamp(this.airPitchInput + (t.airPitch || 0) * 2.2 * e, -1, 1));
    let r = Math.hypot(n.x, n.z),
      i = Math.atan2(n.y, Math.max(r, 0.1)) * 0.6 + this.airPitchInput;
    if (
      ((this.pitch += (i - this.pitch) * Math.min(1, e * 4)),
      this.pos.addScaledVector(n, e),
      sampleGround(this.pos.x, this.pos.z, this._info),
      (this.maxHeight = Math.max(this.maxHeight, this.pos.y - this._info.y)),
      this.pos.y <= this._info.y)
    ) {
      (this.pos.y = this._info.y), groundNormal(this.pos.x, this.pos.z, this.normal);
      let e = -n.dot(this.normal);
      this._updateForward();
      let t = Math.asin(clamp(this.forward.y, -1, 1)),
        r = Math.atan2(n.x, n.z);
      this.events.push({
        type: `land`,
        impact: e,
        airTime: this.airTime,
        pitchError: this.pitch - t,
        yawError: wrapAngle(this.yaw - r),
        height: this.maxHeight,
      });
    }
  }
  confirmLanding(e) {
    (this.grounded = !0),
      this.vel.addScaledVector(this.normal, -this.vel.dot(this.normal)),
      this.vel.multiplyScalar(1 - Math.min(0.25, Math.max(0, e - 3) * 0.02)),
      (this.compression = Math.min(1, e * 0.11)),
      (this.pitch = Math.asin(clamp(this.forward.y, -1, 1))),
      (this.airPitchInput = 0),
      (this.fwdSpeed = this.vel.dot(this.forward));
  }
  _crash(e) {
    this.grace > 0 ||
      ((this.crashed = !0),
      (this.crashZ = this.pos.z),
      this.events.push({
        type: `crash`,
        reason: e,
        speed: this.speed,
      }));
  }
  crash(e) {
    this.crashed || this._crash(e);
  }
  get trailOffset() {
    return Math.abs(this._info.dn);
  }
  get groundY() {
    return this._info.y;
  }
  heightAboveGround() {
    return this.pos.y - groundHeight(this.pos.x, this.pos.z);
  }
};

export { BikePhysics };
