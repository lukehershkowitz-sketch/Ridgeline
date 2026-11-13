// Trick detection, combos and scoring.
import { CONFIG } from './config.js';
import { springStep } from './noise.js';

const TAU = Math.PI * 2;

const wrapAnglePi = (e) => Math.atan2(Math.sin(e), Math.cos(e));

// Stiffness of the springs that the drawn bike follows. Lower = floatier.
const VIS_YAW_OMEGA = 28;

const VIS_FLIP_OMEGA = 26;

const VIS_WHIP_OMEGA = 30;

// Shift s.x by whole turns so it is within half a turn of target (targets get
// re-based by multiples of 2*PI on landing).
const wrapNear = (s, target) => {
  const d = target - s.x;
  Math.abs(d) > Math.PI && (s.x += TAU * Math.round(d / TAU));
};

const GRABS = {
  superman: {
    name: `Superman Seat Grab`,
    base: 350,
    perSec: 700,
  },
  nohander: {
    name: `No-Hander`,
    base: 220,
    perSec: 450,
  },
  cancan: {
    name: `Can-Can`,
    base: 260,
    perSec: 500,
  },
};

const TrickSystem = class {
  constructor() {
    (this.score = 0),
      (this.multiplier = 1),
      (this.comboTimer = 0),
      (this.comboWindow = 9),
      (this.bestCombo = 1),
      (this.tricksLanded = 0),
      (this.listeners = []),
      (this.vis = {
        yaw: { x: 0, v: 0 },
        flip: { x: 0, v: 0 },
        whip: { x: 0, v: 0 },
      }),
      (this.whipPose = 0),
      (this._snapVis = !0),
      (this.pose = {
        superman: 0,
        nohander: 0,
        cancan: 0,
      }),
      this.resetStance(),
      this._resetAir();
  }
  resetStance() {
    (this.stance = 0), (this.yawFix = 0), (this.butter = null), (this.wheelie = 0), (this.wheelieTime = 0);
  }
  get isFakie() {
    return Math.abs(wrapAnglePi(this.stance)) > Math.PI / 2;
  }
  // What is drawn: the logic angles below, followed through springs so spins,
  // flips and whips ease in and out and landings settle instead of snapping.
  get visualYaw() {
    return this.vis.yaw.x;
  }
  get visualYawVel() {
    return this.vis.yaw.v;
  }
  get visualFlip() {
    return this.vis.flip.x;
  }
  get visualFlipVel() {
    return this.vis.flip.v;
  }
  get visualWhip() {
    return this.vis.whip.x;
  }
  updateVisual(dt) {
    const yaw = this.targetYaw,
      flip = this.flip,
      whip = (this.whipCount + (this.whipActive ? this.whip : 0)) * TAU,
      v = this.vis;
    if (this._snapVis) {
      (this._snapVis = !1),
        (v.yaw.x = yaw),
        (v.flip.x = flip),
        (v.whip.x = whip),
        (v.yaw.v = v.flip.v = v.whip.v = 0),
        (this.whipPose = 0);
      return;
    }
    wrapNear(v.yaw, yaw), wrapNear(v.flip, flip), wrapNear(v.whip, whip);
    springStep(v.yaw, yaw, VIS_YAW_OMEGA, dt),
      springStep(v.flip, flip, VIS_FLIP_OMEGA, dt),
      springStep(v.whip, whip, VIS_WHIP_OMEGA, dt),
      (this.whipPose += (+this.whipActive - this.whipPose) * (1 - Math.exp(-dt * 11)));
  }
  // Drop any in-flight easing (respawn, restart).
  snapVisual() {
    this._snapVis = !0;
    for (let e of Object.keys(this.pose)) this.pose[e] = 0;
  }
  get targetYaw() {
    if (this.butter) {
      let e = this.butter.t,
        t = e * e * (3 - 2 * e);
      return this.butter.from + (this.butter.to - this.butter.from) * t;
    }
    return this.stance + this.yawFix + this.spin;
  }
  get butterPitch() {
    return this.butter ? Math.sin(Math.PI * Math.min(1, this.butter.t)) * 0.3 : 0;
  }
  on(e) {
    this.listeners.push(e);
  }
  emit(e) {
    for (let t of this.listeners) t(e);
  }
  _resetAir() {
    (this.spin = 0),
      (this.spinVel = 0),
      (this.spinDir = 0),
      (this.spinTarget = null),
      (this.spinHeld = !1),
      (this.spinDone = !1),
      (this.flip = 0),
      (this.flipVel = 0),
      (this.flipDir = 0),
      (this.flipTarget = null),
      (this.whip = 0),
      (this.whipActive = !1),
      (this.whipCount = 0),
      (this.poseHold = {
        superman: 0,
        nohander: 0,
        cancan: 0,
      }),
      (this.airTricks = []),
      (this.spinCount = 0),
      (this.flipCount = 0);
  }
  get isSpinning() {
    return this.spinVel !== 0;
  }
  get isBusy() {
    return this.spinVel !== 0 || this.flipVel !== 0 || this.whipActive;
  }
  takeoff(e = !1, t = 0) {
    this.butter && ((this.butter.t = 1), this._finishButter()),
      this._endWheelie(),
      (this.wheelie = 0),
      this._resetAir(),
      (this.steerLatch = e ? 0 : t);
  }
  updateGroundTricks(e, t, n) {
    if (((this.yawFix *= Math.exp(-e * 5)), Math.abs(this.yawFix) < 0.001 && (this.yawFix = 0), this.butter))
      (this.butter.t += e / 0.6), this.butter.t >= 1 && this._finishButter();
    else if (t.butter && n > 0.8) {
      let e = t.steer === 0 ? (this.isFakie ? -1 : 1) : Math.sign(t.steer),
        n = this.stance + this.yawFix;
      (this.butter = {
        from: n,
        to: this.stance + e * Math.PI,
        t: 0,
        wasFakie: this.isFakie,
      }),
        (this.yawFix = 0),
        this._endWheelie();
    }
    if (t.wheelie && !this.butter && n > 1) {
      this.wheelieTime += e;
      let n = 0.4 + (t.throttle ? 0.14 : 0) - (t.brake ? 0.2 : 0) + 0.05 * Math.sin(this.wheelieTime * 2.6);
      this.wheelie += (n - this.wheelie) * Math.min(1, e * 5);
    } else
      this.wheelieTime > 0 && this._endWheelie(), (this.wheelie += (0 - this.wheelie) * Math.min(1, e * 7));
  }
  _finishButter() {
    let e = this.butter;
    (this.butter = null),
      (this.stance = Math.abs(wrapAnglePi(e.to)) > Math.PI / 2 ? Math.PI : 0),
      (this.yawFix = 0),
      this._awardGround(e.wasFakie ? `Nose Butter 180 (back to forward)` : `Nose Butter 180`, 350);
  }
  _endWheelie() {
    let e = this.wheelieTime;
    (this.wheelieTime = 0),
      e >= 0.7 && this._awardGround(`Wheelie ${e.toFixed(1)}s`, Math.round(100 + 180 * e));
  }
  _awardGround(e, t) {
    let n = this.multiplier,
      r = Math.round(t * n);
    (this.score += r),
      (this.multiplier = Math.min(16, this.multiplier + 1)),
      (this.comboTimer = this.comboWindow),
      this.tricksLanded++,
      (this.bestCombo = Math.max(this.bestCombo, this.multiplier)),
      this.emit({
        type: `landed`,
        quality: `STYLE`,
        tricks: [
          {
            name: e,
            points: t,
          },
        ],
        points: r,
        usedMult: n,
        label: null,
        airTime: 0,
        ground: !0,
      });
  }
  updateAir(e, t, n, r = 0) {
    let i = t.mod;
    t.steer !== this.steerLatch && (this.steerLatch = 0);
    let a = TAU / 0.68,
      o = n > 0 || r > 0 ? (r + Math.sqrt(Math.max(0, r * r + 2 * CONFIG.gravity * Math.max(0, n)))) / CONFIG.gravity : 0;
    if (
      (t.steer === 0 && (this.spinDone = !1),
      t.steer !== 0 && !this.spinDone && (i || this.steerLatch === 0) && !(this.spinVel === 0 && o < 0.35))
    ) {
      let e = Math.sign(t.steer);
      if (this.spinVel === 0 || e !== this.spinDir || this.spinHeld) {
        // The spin runs for as long as the key is held, right down to the
        // ground. Letting go is what stops it (at the nearest half turn).
        (this.spinDir = e), (this.spinVel = e * a), (this.spinHeld = !0), (this.spinTarget = null);
      }
    } else if (
      this.spinVel !== 0 &&
      (this.spinHeld || this.spinTarget === null) &&
      ((this.spinHeld = !1), this.spinTarget === null)
    ) {
      let e = this.spin / Math.PI,
        t = this.spinDir > 0 ? Math.ceil(e - 0.3) : Math.floor(e + 0.3);
      this.spinTarget = t * Math.PI;
    }
    this.spinVel !== 0 &&
      ((this.spin += this.spinVel * e),
      this.spinTarget !== null &&
        (this.spinDir > 0 ? this.spin >= this.spinTarget : this.spin <= this.spinTarget) &&
        ((this.spin = this.spinTarget),
        (this.spinVel = 0),
        (this.spinTarget = null),
        (this.spinHeld &&= ((this.spinDone = !0), !1))),
      this.spinTarget !== null &&
        Math.sign(this.spinTarget - this.spin) !== this.spinDir &&
        this.spinTarget !== this.spin &&
        ((this.spinVel = -this.spinVel), (this.spinDir = -this.spinDir)));
    let s = Math.floor(Math.abs(this.spin) / Math.PI + 0.02);
    s > this.spinCount && ((this.spinCount = s), this._announce());
    let c = t.throttle ? 1 : t.brake ? -1 : 0;
    if (i && c !== 0) (this.flipDir = c), (this.flipVel = (TAU / 1.05) * c), (this.flipTarget = null);
    else if (this.flipVel !== 0 && this.flipTarget === null) {
      let e = this.flip / TAU,
        t = this.flipDir > 0 ? Math.ceil(e - 0.15) : Math.floor(e + 0.15);
      this.flipTarget = t * TAU;
    }
    this.flipVel !== 0 &&
      ((this.flip += this.flipVel * e),
      this.flipTarget !== null &&
        (this.flipDir > 0 ? this.flip >= this.flipTarget : this.flip <= this.flipTarget) &&
        ((this.flip = this.flipTarget), (this.flipVel = 0), (this.flipTarget = null)));
    let l = Math.floor(Math.abs(this.flip) / TAU + 0.02);
    l > this.flipCount && ((this.flipCount = l), this._announce()),
      !this.whipActive && t.whip && (this.whipActive = !0),
      this.whipActive &&
        ((this.whip += e / 0.5),
        this.whip >= 1 &&
          (this.whipCount++,
          this._announce(),
          t.whip ? --this.whip : ((this.whip = 0), (this.whipActive = !1))));
    for (let n of Object.keys(GRABS)) {
      let r = t[n],
        i = +!!r,
        a = r ? 6 : 7;
      if (((this.pose[n] += (i - this.pose[n]) * Math.min(1, e * a)), this.pose[n] > 0.8)) {
        let t = this.poseHold[n];
        (this.poseHold[n] += e), t < 0.15 && this.poseHold[n] >= 0.15 && this._announce();
      }
    }
  }
  updateGround(e) {
    for (let t of Object.keys(this.pose)) this.pose[t] += (0 - this.pose[t]) * Math.min(1, e * 8);
    this.comboTimer > 0 &&
      ((this.comboTimer -= e),
      this.comboTimer <= 0 &&
        this.multiplier > 1 &&
        (this.emit({
          type: `comboEnd`,
          multiplier: this.multiplier,
        }),
        (this.multiplier = 1)));
  }
  currentTricks() {
    let e = [];
    if (this.spinCount > 0) {
      let t = this.spinCount * 180,
        n =
          [0, 220, 500, 850, 1250, 1700, 2200, 2800, 3400][Math.min(8, this.spinCount)] +
          Math.max(0, this.spinCount - 8) * 600;
      e.push({
        name: `${t}`,
        points: n,
      });
    }
    if (this.flipCount > 0) {
      let t = this.flip < 0,
        n = [``, ``, `Double `, `Triple `][Math.min(3, this.flipCount)];
      e.push({
        name: `${n}${t ? `Backflip` : `Frontflip`}`,
        points: (t ? 900 : 1050) * this.flipCount * (1 + (this.flipCount - 1) * 0.4),
      });
    }
    if (this.whipCount > 0) {
      let t = [``, ``, `Double `, `Triple `][Math.min(3, this.whipCount)];
      e.push({
        name: `${t}Tailwhip`,
        points: 600 * this.whipCount * (1 + (this.whipCount - 1) * 0.5),
      });
    }
    for (let [t, n] of Object.entries(GRABS))
      this.poseHold[t] >= 0.15 &&
        e.push({
          name: n.name,
          points: Math.round(n.base + n.perSec * this.poseHold[t]),
        });
    return e;
  }
  _announce() {
    this.emit({
      type: `airTricks`,
      tricks: this.currentTricks(),
    });
  }
  judgeLanding(e) {
    this.spinVel !== 0 &&
      this.spinTarget === null &&
      (this.spinTarget =
        (this.spinDir > 0 ? Math.ceil(this.spin / Math.PI) : Math.floor(this.spin / Math.PI)) * Math.PI);
    this.spinVel !== 0 &&
      Math.abs(this.spinTarget - this.spin) < 0.9 &&
      ((this.spin = this.spinTarget),
      (this.spinVel = 0),
      (this.spinTarget = null),
      (this.spinCount = Math.max(this.spinCount, Math.floor(Math.abs(this.spin) / Math.PI + 0.02))));
    let t = this.stance + this.yawFix + this.spin,
      n = Math.abs(wrapAnglePi(t)),
      r = n > Math.PI / 2,
      i = r ? Math.PI - n : n,
      a = Math.abs(wrapAnglePi(this.flip)),
      o = Math.abs(wrapAnglePi(e.pitchError)),
      s = Math.abs(e.yawError),
      c = this.whipActive ? Math.min(this.whip, 1 - this.whip) * TAU : 0,
      l = Math.max(this.pose.superman, this.pose.nohander, this.pose.cancan),
      u = null;
    a > 1.6
      ? (u = `Landed upside down!`)
      : a + o > 1.25
        ? (u = a > 0.5 ? `Under-rotated the flip!` : e.pitchError > 0 ? `Looped out!` : `Went over the bars!`)
        : i > 1.22
          ? (u = `Landed sideways!`)
          : c > 1.3
            ? (u = `Tailwhip not caught!`)
            : l > 0.6
              ? (u = `Off the pedals!`)
              : e.impact > 17 && (u = `Landed too hard!`);
    let d = this.currentTricks();
    if (u) {
      let e = this.multiplier;
      return (
        (this.multiplier = 1),
        (this.comboTimer = 0),
        this._resetAir(),
        this.resetStance(),
        this.emit({
          type: `crash`,
          reason: u,
          lostMultiplier: e,
        }),
        {
          crashed: !0,
          reason: u,
        }
      );
    }
    let f = r ? Math.PI : 0;
    (this.yawFix = wrapAnglePi(t - f)), (this.stance = f);
    let p = Math.max(i * 0.75, a + o * 0.8, c, s * 0.6, l) + Math.max(0, e.impact - 10) * 0.04,
      m,
      h;
    p < 0.17
      ? ((m = `PERFECT`), (h = 1.5))
      : p < 0.42
        ? ((m = `CLEAN`), (h = 1))
        : ((m = `SKETCHY`), (h = 0.5));
    let g = d.reduce((e, t) => e + t.points, 0),
      _ = 0;
    e.airTime > 0.55 && (_ = Math.round(e.airTime * 120 + e.height * 25));
    let v = null;
    e.airTime > 1.6 && (v = `BIG AIR`), d.length > 1 && (g *= 1 + 0.25 * (d.length - 1));
    let y = Math.round((g + _) * h),
      b = Math.round(y * this.multiplier);
    this.score += b;
    let x = this.multiplier;
    return (
      d.length
        ? ((this.multiplier = Math.min(16, this.multiplier + d.length)),
          (this.comboTimer = this.comboWindow),
          (this.tricksLanded += d.length),
          (this.bestCombo = Math.max(this.bestCombo, this.multiplier)))
        : this.comboTimer > 0 && (this.comboTimer = Math.min(this.comboWindow, this.comboTimer + 1.5)),
      this.emit({
        type: `landed`,
        quality: m,
        tricks: d,
        points: b,
        usedMult: x,
        label: v,
        airTime: e.airTime,
        fakie: r,
      }),
      this._resetAir(),
      {
        crashed: !1,
        quality: m,
        points: b,
        fakie: r,
      }
    );
  }
  bail(e) {
    let t = this.multiplier;
    (this.multiplier = 1),
      (this.comboTimer = 0),
      this._resetAir(),
      this.resetStance(),
      this.emit({
        type: `crash`,
        reason: e,
        lostMultiplier: t,
      });
  }
  resetRun() {
    (this.score = 0),
      (this.multiplier = 1),
      (this.comboTimer = 0),
      (this.bestCombo = 1),
      (this.tricksLanded = 0),
      this._resetAir(),
      this.resetStance(),
      this.snapVisual();
  }
};

export { TrickSystem };
