// Entry point: game loop and state machine.
import { PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { CONFIG, MAP, MAPS, consumeAutostart, switchMap } from './config.js';
import { Environment } from './environment.js';
import { getTextures } from './textures.js';
import { groundHeight } from './trail.js';
import { WIND_UNIFORMS } from './terrainMaterial.js';
import { warmPropCache } from './props.js';
import { Terrain } from './terrain.js';
import { TrailFeatures } from './features.js';
import { BikePhysics } from './physics.js';
import { TrickSystem } from './tricks.js';
import { BikeRig, loadBikeModel } from './bikeModel.js';
import { ChaseCamera } from './camera.js';
import { AmbientMotes, DustParticles } from './particles.js';
import { PostFX } from './postfx.js';
import { Hud, formatTime } from './hud.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { Tank } from './tank.js';

const nextFrame = () => new Promise((e) => requestAnimationFrame(() => e()));

const MAIN_TRAIL_LENGTH = CONFIG.trailLength;

const game = new (class {
  constructor() {
    (this.canvas = document.getElementById(`game`)),
      (this.hud = new Hud()),
      (this.input = new Input()),
      (this.audio = new AudioEngine()),
      (this.state = `loading`),
      (this.time = 0),
      (this.runTime = 0),
      (this.stateTime = 0),
      (this.flash = 0),
      (this.fade = 0),
      (this.resScale = 1),
      (this.frameTimes = []),
      (this.stats = {
        crashes: 0,
        topSpeed: 0,
      });
  }
  async init() {
    let e = (this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: !1,
      powerPreference: `high-performance`,
    }));
    e.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio)),
      e.setSize(window.innerWidth, window.innerHeight, !1),
      (e.toneMapping = 4),
      (e.toneMappingExposure = 0.92),
      (e.shadowMap.enabled = !0),
      (e.shadowMap.type = 1),
      (this.scene = new Scene()),
      (this.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6e3));
    let t = async (e, t, n) => {
      this.hud.setLoading(e, t), await nextFrame(), n();
    };
    await t(0.05, `Painting textures…`, () => getTextures()),
      await t(0.15, `Lighting the golden hour…`, () => {
        this.env = new Environment(this.scene, e);
      }),
      await t(0.25, `Growing pines…`, () => warmPropCache()),
      await t(0.35, `Carving singletrack & berms…`, () => {
        this.terrain = new Terrain(this.scene);
      }),
      await t(0.5, `Building wooden features…`, () => {
        this.props = new TrailFeatures(this.scene);
      }),
      this.hud.setLoading(0.53, `Building the bike…`),
      await loadBikeModel(),
      (this.phys = new BikePhysics()),
      this.phys.spawnAt(0, 0),
      (this.tricks = new TrickSystem()),
      (this.player = new BikeRig(this.scene)),
      (this.tank = new Tank(this.scene)),
      (this.chase = new ChaseCamera(this.camera)),
      (this.dust = new DustParticles(this.scene)),
      (this.motes = new AmbientMotes(this.scene)),
      (this.post = new PostFX(e, this.scene, this.camera));
    let n = 1 / 0,
      r = null;
    for (; n > 0; )
      (n = this.terrain.update(this.phys.pos, !0)),
        (r ??= n + 1),
        this.hud.setLoading(0.55 + 0.35 * (1 - n / r), `Raising the mountain…`),
        await nextFrame();
    this.hud.setLoading(0.95, `Compiling shaders…`),
      await nextFrame(),
      this.player.update(0.016, this.phys, this.tricks, this._visState()),
      this.chase.update(0.016, this.phys, 0, `title`);
    try {
      await e.compileAsync(this.scene, this.camera);
    } catch {}
    this._wireEvents(),
      document.getElementById(`title`).addEventListener(`click`, () => {
        window.focus(), this.audio.start();
      }),
      document.getElementById(`finish`).addEventListener(`click`, () => {
        window.focus(),
          this.audio.start(),
          this.state === `finished` && this.stateTime > 1.3 && this.startRun();
      }),
      this._buildMapMenu(),
      this.canvas.addEventListener(`click`, () => window.focus()),
      this.onResize(),
      window.addEventListener(`resize`, () => this.onResize()),
      this.hud.setLoading(1, `Ready`),
      this.hud.ready(),
      (this.state = `title`),
      consumeAutostart() && this.startRun(),
      (this.last = performance.now()),
      requestAnimationFrame((e) => this.loop(e));
  }
  _buildMapMenu() {
    let e = document.getElementById(`maps`);
    (this.mapIds = Object.keys(MAPS)),
      (this.selectedMap = MAP.id),
      (e.innerHTML = ``),
      (this.mapCards = this.mapIds.map((t) => {
        let n = MAPS[t],
          r = document.createElement(`button`);
        return (
          (r.type = `button`),
          (r.className = `map-card`),
          (r.innerHTML = `<div class="mk">${n.kicker}</div><div class="mn">${n.name}</div><div class="mb">${n.blurb}</div><div class="ms">${n.stats.map((e) => `<span>${e}</span>`).join(``)}</div>`),
          r.addEventListener(`click`, (e) => {
            e.stopPropagation(), window.focus(), this.audio.start(), this.selectMap(t), this.playSelected();
          }),
          r.addEventListener(`mouseenter`, () => this.selectMap(t)),
          e.appendChild(r),
          r
        );
      })),
      this.selectMap(MAP.id);
  }
  selectMap(e) {
    (this.selectedMap = e),
      this.mapIds.forEach((t, n) => this.mapCards[n].classList.toggle(`selected`, t === e));
  }
  playSelected() {
    this.state === `title` &&
      (this.selectedMap === MAP.id
        ? this.startRun()
        : ((this.state = `switching`),
          this.hud.showSwitching(MAPS[this.selectedMap].name),
          setTimeout(() => switchMap(this.selectedMap), 30)));
  }
  goHome() {
    this.hud.showPause(!1),
      this.hud.hideFinish(),
      this.hud.countdown(null),
      this.hud.clearAir(),
      this.hud.showHUD(!1),
      this.hud.showTitle(!0),
      (this.finishStats = null),
      this.phys.spawnAt(0, 0),
      this.tricks._resetAir(),
      this.tricks.resetStance(),
      this.tricks.snapVisual(),
      this.tank.reset(),
      (this.chase.initialised = !1),
      (this.fade = 0),
      this.selectMap(MAP.id),
      this.setState(`title`);
  }
  _wireEvents() {
    this.tricks.on((e) => {
      e.type === `airTricks`
        ? (this.hud.airTricks(e.tricks), this.audio.chime(e.tricks.length - 1))
        : e.type === `landed`
          ? (this.hud.landed(e),
            e.fakie && this.hud.toast(`RIDING FAKIE · PRESS B TO NOSE BUTTER`, 2.2),
            e.tricks.length && this.audio.chime(e.quality === `PERFECT` ? 4 : e.quality === `CLEAN` ? 2 : 0))
          : e.type === `crash`
            ? this.hud.bail(e.reason, e.lostMultiplier)
            : e.type === `comboEnd` && this.hud.toast(`COMBO ×${e.multiplier} COOLED OFF`);
    });
  }
  onResize() {
    let e = window.innerWidth,
      t = window.innerHeight,
      n = Math.max(
        CONFIG.minPixelRatio,
        Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio) * this.resScale,
      );
    this.renderer.setPixelRatio(n),
      this.renderer.setSize(e, t, !1),
      (this.camera.aspect = e / t),
      this.camera.updateProjectionMatrix(),
      this.post.setSize(e, t, n),
      this.dust.setViewportHeight(t * n),
      (this.motes.material.uniforms.uScale.value = 0.09 * t * n);
  }
  _visState() {
    return {
      crashed: this.phys.crashed,
      time: this.time,
      groundAt: groundHeight,
    };
  }
  setState(e) {
    (this.state = e), (this.stateTime = 0);
  }
  startRun() {
    this.hud.hideFinish(),
      this.hud.showTitle(!1),
      this.hud.showHUD(!0),
      clearTimeout(this.helpTimer),
      (this.helpTimer = setTimeout(() => this.hud.collapseHelp(), 1e4)),
      this.tricks.resetRun(),
      this.tank.reset(),
      this.phys.spawnAt(0, 0),
      (this.phys.lastRespawnZ = void 0),
      (this.phys.crashZ = void 0),
      (this.runTime = 0),
      (this.stats = {
        crashes: 0,
        topSpeed: 0,
      }),
      (this.chase.initialised = !1),
      this.setState(`countdown`);
  }
  crash(e, t = !1) {
    this.state !== `riding` ||
      this.phys.grace > 0 ||
      (t || this.tricks.bail(e),
      this.phys.crash(e),
      this.stats.crashes++,
      (this.flash = 1),
      this.chase.addShake(1),
      this.audio.crash(),
      this.dust.burst(this.phys.pos, 40, 3),
      this.setState(`crashed`));
  }
  respawn() {
    let e = this.phys.respawnZ();
    this.phys.spawnAt(e, MAP.respawnSpeed),
      (this.phys.grace = 1.5),
      this.tricks._resetAir(),
      this.tricks.resetStance(),
      this.tricks.snapVisual(),
      (this.chase.initialised = !1),
      this.hud.clearAir(),
      this.setState(`riding`);
  }
  finish() {
    this.setState(`finished`);
    let e = this._loadBest(),
      t = this.runTime,
      n = this.tricks.score,
      r = ``,
      i = !e.time || t < e.time,
      a = !e.score || n > e.score;
    i || a
      ? ((r = `${i ? `NEW BEST TIME! ` : ``}${a ? `NEW HIGH SCORE!` : ``}`),
        this._saveBest({
          time: i ? t : e.time,
          score: a ? n : e.score,
        }))
      : (r = `Best: ${formatTime(e.time)} · ${Math.round(e.score).toLocaleString(`en-US`)} pts`),
      (this.finishStats = {
        time: t,
        score: n,
        bestCombo: this.tricks.bestCombo,
        tricks: this.tricks.tricksLanded,
        crashes: this.stats.crashes,
        topSpeed: this.stats.topSpeed,
        bestText: r,
      });
  }
  _loadBest() {
    try {
      return JSON.parse(localStorage.getItem(`ridgeline-best-${MAP.id}`) || `{}`);
    } catch {
      return {};
    }
  }
  _saveBest(e) {
    try {
      localStorage.setItem(`ridgeline-best-${MAP.id}`, JSON.stringify(e));
    } catch {}
  }
  loop(e) {
    requestAnimationFrame((e) => this.loop(e));
    let t = (e - this.last) / 1e3;
    this.last = e;
    let n = Math.min(0.05, Math.max(0, t));
    this._perf(t);
    let r = this.input;
    if (
      (r.pressed.size && this.audio.start(),
      r.hit(`KeyH`) && this.hud.toggleHelp(),
      r.hit(`KeyM`) && this.hud.toast(this.audio.toggleMute() ? `SOUND OFF` : `SOUND ON`, 1),
      r.hit(`Escape`) && [`riding`, `countdown`, `crashed`, `paused`, `finished`].includes(this.state))
    ) {
      this.goHome(), r.endFrame();
      return;
    }
    if (this.state === `paused`) {
      r.hit(`KeyP`)
        ? (this.hud.showPause(!1), (this.state = this.prevState))
        : r.hit(`KeyR`) && (this.hud.showPause(!1), (this.state = this.prevState), this.respawn()),
        this.audio.tank(0),
        r.endFrame(),
        this.post.render(0, {
          speed01: 0,
          time: this.time,
          flash: 0,
          fade: 0.35,
        });
      return;
    }
    if (r.hit(`KeyP`) && [`riding`, `countdown`, `crashed`].includes(this.state)) {
      (this.prevState = this.state), (this.state = `paused`), this.hud.showPause(!0), r.endFrame();
      return;
    }
    switch (((this.time += n), (this.stateTime += n), (WIND_UNIFORMS.uTime.value = this.time), this.state)) {
      case `title`: {
        let e = this.mapIds.indexOf(this.selectedMap),
          t = this.mapIds.length;
        r.hit(`ArrowRight`, `KeyD`, `ArrowDown`, `KeyS`) && this.selectMap(this.mapIds[(e + 1) % t]),
          r.hit(`ArrowLeft`, `KeyA`, `ArrowUp`, `KeyW`) && this.selectMap(this.mapIds[(e + t - 1) % t]),
          r.hit(`Digit1`) && this.selectMap(this.mapIds[0]),
          r.hit(`Digit2`) && t > 1 && this.selectMap(this.mapIds[1]),
          r.hit(`Enter`, `NumpadEnter`, `Space`) && this.playSelected();
        break;
      }
      case `countdown`: {
        let e = 3 - Math.floor(this.stateTime / 0.8);
        this.hud.countdown(e > 0 ? String(e) : `GO!`),
          this.stateTime > 2.4 && (this.setState(`riding`), setTimeout(() => this.hud.countdown(null), 600));
        break;
      }
      case `riding`: {
        this.runTime += n;
        let e = r.snapshot();
        this._simulate(n, e),
          this.state === `riding` &&
            this.phys.grounded &&
            !this.phys.crashed &&
            this.tricks.updateGroundTricks(n, e, this.phys.speed),
          r.hit(`KeyR`) && (this.hud.toast(`RESPAWN`, 0.8), this.respawn()),
          r.hit(`KeyT`) &&
            !this.tank.active &&
            (this.tank.summon(this.phys), this.hud.toast(`TANK INCOMING!`, 2)),
          this.phys.pos.z < -MAIN_TRAIL_LENGTH && this.finish();
        break;
      }
      case `crashed`:
        (this.runTime += n),
          (this.fade = Math.max(0, Math.min(1, (this.stateTime - 1.5) / 0.4))),
          this.stateTime > 1.95 && this.respawn();
        break;
      case `finished`:
        this._simulate(n, {
          throttle: !1,
          brake: !0,
          steer: 0,
          hop: !1,
          mod: !1,
        }),
          this.stateTime > 1.3 &&
            this.finishStats &&
            (this.hud.showFinish(this.finishStats), (this.finishStats = null)),
          this.stateTime > 1.3 && r.hit(`Enter`, `NumpadEnter`) && this.startRun();
    }
    this._updateTank(n),
      this.state !== `crashed` && (this.fade = Math.max(0, this.fade - n * 3)),
      (this.flash = Math.max(0, this.flash - n * 1.5));
    let i = this._visState();
    this.tricks.updateVisual(n);
    this.player.update(n, this.phys, this.tricks, i),
      this.state !== `crashed` && this.tricks.updateGround(this.phys.grounded ? n : 0),
      this._effects(n);
    let a = this.state === `title` ? `title` : `ride`,
      o = this.state === `crashed` ? this.player.root.position : this.phys.pos;
    this.chase.update(
      n,
      this.state === `crashed`
        ? {
            ...this._physView(),
            pos: o,
          }
        : this.phys,
      this.time,
      a,
    ),
      this.env.update(o, this.time),
      this.env.followCamera(this.camera),
      this.terrain.update(o),
      this.motes.update(this.time, this.camera),
      this.dust.update(n);
    let s = this.phys.speed;
    this.hud.update(n, {
      score: this.tricks.score,
      multiplier: this.tricks.multiplier,
      comboFrac: this.tricks.comboTimer / this.tricks.comboWindow,
      time: this.runTime,
      progress: -this.phys.pos.z / MAIN_TRAIL_LENGTH,
      speed: this.state === `crashed` ? 0 : s,
      airborne: !this.phys.grounded && this.state === `riding`,
    }),
      this.audio.update(
        this.state === `riding` || this.state === `finished` ? s : 0,
        this.phys.grounded,
        this.phys.slip,
        this.phys.onTrail,
      );
    let c = this.state === `riding` ? Math.min(1, Math.max(0, (s - 9) / 15)) : 0;
    this.post.render(n, {
      speed01: c,
      time: this.time,
      flash: this.flash,
      fade: this.fade,
    }),
      r.endFrame();
  }
  _updateTank(e) {
    let t = this.tank;
    if (!t.active) {
      this.audio.tank(0);
      return;
    }
    let n = this.phys;
    t.update(e, n.pos, n.speed, this.state === `riding`) &&
      ((n.grace = 0),
      (this.player.flatten = !0),
      n.vel.set(0, 0, 0),
      this.crash(`Run over by a tank!`),
      this.chase.addShake(1.2),
      this.audio.noiseHit(1, 600, 0.9),
      this.audio.thump(6));
    let r = t.distTo(n.pos);
    t.active
      ? (this.audio.tank(Math.max(0, Math.min(1, 1.4 - r / 90)), Math.min(1, t.speed / 30)),
        r < 45 && this.chase.addShake(e * (1 - r / 45) * 1.2),
        Math.random() < e * 14 && this.dust.burst(t.pos, 3, 1.4))
      : this.audio.tank(0);
  }
  _physView() {
    let e = this.phys;
    return {
      speed: 0,
      vel: new Vector3(),
      yaw: this.chase.yaw,
      grounded: !0,
      airTime: 0,
      pos: e.pos,
    };
  }
  _simulate(e, t) {
    let n = this.phys,
      r = this.tricks,
      i = 1 / CONFIG.physicsHz;
    this.acc = Math.min((this.acc || 0) + e, i * 8);
    let a = !n.grounded,
      o = {
        throttle: t.throttle && !(a && t.mod),
        brake: t.brake && !(a && t.mod),
        steer: a ? 0 : t.steer,
        hop: t.hop,
        airPitch: a && !t.mod ? +!!t.brake - !!t.throttle : 0,
        spinning: r.isSpinning || (a && t.mod),
      };
    this._steerHeld = t.steer || 0;
    let s = !0;
    for (
      ;
      this.acc >= i &&
      ((this.acc -= i),
      n.step(
        i,
        s
          ? o
          : {
              ...o,
              hop: !1,
            },
      ),
      (s = !1),
      !n.grounded &&
        !n.crashed &&
        this.state === `riding` &&
        r.updateAir(i, t, n.heightAboveGround(), n.vel.y),
      this._handleEvents(),
      !n.crashed);

    );
    this.state === `riding` &&
      ((this.stats.topSpeed = Math.max(this.stats.topSpeed, n.speed)),
      n.trailOffset > 70 && (this.hud.toast(`OUT OF BOUNDS`, 1.2), this.crash(`Out of bounds!`)));
  }
  _handleEvents() {
    let e = this.phys,
      t = e.events;
    if (t.length) {
      e.events = [];
      for (let n of t)
        if (n.type === `takeoff`) this.tricks.takeoff(n.hop, this._steerHeld || 0);
        else if (n.type === `land`) {
          if (this.state !== `riding` || e.grace > 0) {
            this.tricks._resetAir(), e.confirmLanding(n.impact);
            continue;
          }
          let t = this.tricks.judgeLanding(n);
          if (t.crashed) {
            this.crash(t.reason, !0);
            return;
          }
          e.confirmLanding(n.impact),
            this.chase.land(n.impact),
            this.audio.thump(n.impact),
            this.dust.burst(e.pos, Math.min(60, 8 + n.impact * 4), 1.2 + n.impact * 0.15);
        } else n.type === `crash` && this.state === `riding` && this.crash(n.reason);
    }
  }
  _effects(e) {
    let t = this.phys;
    if ((this.state !== `riding` && this.state !== `finished`) || !t.grounded || t.crashed) return;
    let n = t.speed,
      r = 0.3 + 0.7 * t.onTrail,
      i = (n * 3.2 + t.slip * 22 + (t.braking ? n * 4 : 0)) * r;
    if (i < 0.5) return;
    let a = this.player.rearContact(new Vector3()),
      o = new Vector3().copy(t.forward).multiplyScalar(-n * 0.12);
    (o.y += 0.5), this.dust.stream(e, a, o, i, 0.9 + n * 0.04, 0.32 + 0.25 * r);
  }
  _perf(e) {
    if ((this.frameTimes.push(e), (this.perfClock = (this.perfClock || 0) + e), this.perfClock < 1.5)) return;
    let t = this.frameTimes.reduce((e, t) => e + t, 0) / this.frameTimes.length,
      n = Math.round(1 / t);
    (this.frameTimes = []), (this.perfClock = 0);
    let r = !1;
    (this.state === `riding` || this.state === `title`) &&
      (t > 1 / 52 && this.resScale > 0.55
        ? ((this.resScale = Math.max(0.55, this.resScale - 0.1)), (r = !0))
        : t < 1 / 59 && this.resScale < 1 && ((this.resScale = Math.min(1, this.resScale + 0.05)), (r = !0))),
      r && this.onResize(),
      this.hud.setFPS(n, this.resScale);
  }
})();

game.init().catch((e) => {
  console.error(e);
  let t = document.getElementById(`load-text`);
  t && (t.textContent = `Failed to start: ${e.message}. WebGL2 is required.`);
}),
  (window.__game = game);
