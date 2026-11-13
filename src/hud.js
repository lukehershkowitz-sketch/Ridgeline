// DOM HUD and overlays.
import { CONFIG } from './config.js';

const byId = (e) => document.getElementById(e);

function formatTime(e) {
  let t = Math.floor(e / 60),
    n = e - t * 60;
  return `${t}:${n < 10 ? `0` : ``}${n.toFixed(1)}`;
}

const formatInt = (e) => Math.round(e).toLocaleString(`en-US`);

const Hud = class {
  constructor() {
    (this.el = {
      hud: byId(`hud`),
      score: byId(`score`),
      mult: byId(`mult`),
      comboFill: byId(`combo-fill`),
      timer: byId(`timer`),
      progFill: byId(`progress-fill`),
      progDot: byId(`progress-dot`),
      distance: byId(`distance`),
      speed: byId(`speed`),
      gauge: byId(`gauge-fill`),
      air: byId(`air-indicator`),
      airTricks: byId(`air-tricks`),
      popups: byId(`popups`),
      toast: byId(`toast`),
      help: byId(`help`),
      fps: byId(`fps`),
      title: byId(`title`),
      loading: byId(`loading`),
      loadFill: byId(`load-fill`),
      loadText: byId(`load-text`),
      startPrompt: byId(`start-prompt`),
      countdown: byId(`countdown`),
      finish: byId(`finish`),
      pause: byId(`pause`),
    }),
      (this.shownScore = 0),
      (this.lastMult = 1),
      (this.toastTimer = 0);
  }
  setLoading(e, t) {
    (this.el.loadFill.style.width = `${Math.round(e * 100)}%`), t && (this.el.loadText.textContent = t);
  }
  ready() {
    this.el.loading.classList.add(`hidden`), this.el.startPrompt.classList.remove(`hidden`);
  }
  showSwitching(e) {
    this.el.startPrompt.classList.add(`hidden`),
      this.el.loading.classList.remove(`hidden`),
      this.setLoading(0.02, `Loading ${e}…`);
  }
  showTitle(e) {
    this.el.title.classList.toggle(`hidden`, !e);
  }
  showHUD(e) {
    this.el.hud.classList.toggle(`hidden`, !e);
  }
  showPause(e) {
    this.el.pause.classList.toggle(`hidden`, !e);
  }
  toggleHelp() {
    this.el.help.classList.toggle(`collapsed`);
  }
  collapseHelp() {
    this.el.help.classList.add(`collapsed`);
  }
  countdown(e) {
    let t = this.el.countdown;
    e
      ? (t.classList.remove(`hidden`),
        t.classList.toggle(`go`, e === `GO!`),
        t.textContent !== e &&
          ((t.textContent = e),
          t.animate(
            [
              {
                transform: `translate(-50%,-50%) scale(1.6)`,
                opacity: 0,
              },
              {
                transform: `translate(-50%,-50%) scale(1)`,
                opacity: 1,
              },
            ],
            {
              duration: 250,
              easing: `ease-out`,
            },
          )))
      : t.classList.add(`hidden`);
  }
  update(e, t) {
    (this.shownScore += (t.score - this.shownScore) * Math.min(1, e * 8)),
      Math.abs(t.score - this.shownScore) < 1 && (this.shownScore = t.score),
      (this.el.score.textContent = formatInt(this.shownScore)),
      t.multiplier !== this.lastMult &&
        ((this.el.mult.textContent = `×${t.multiplier}`),
        this.el.mult.classList.toggle(`hot`, t.multiplier > 1),
        t.multiplier > this.lastMult &&
          (this.el.mult.classList.add(`bump`), setTimeout(() => this.el.mult.classList.remove(`bump`), 160)),
        (this.lastMult = t.multiplier)),
      (this.el.comboFill.style.width = `${Math.max(0, t.comboFrac) * 100}%`),
      (this.el.timer.textContent = formatTime(t.time));
    let n = Math.min(1, Math.max(0, t.progress));
    (this.el.progFill.style.width = `${n * 100}%`), (this.el.progDot.style.left = `${n * 100}%`);
    let r = Math.max(0, (1 - n) * CONFIG.trailLength);
    this.el.distance.textContent =
      r > 1e3 ? `${(r / 1e3).toFixed(1)} KM TO FINISH` : `${Math.round(r)} M TO FINISH`;
    let i = Math.round(t.speed * 3.6);
    this.el.speed.textContent = i;
    let a = Math.min(1, i / 80);
    (this.el.gauge.style.strokeDashoffset = `${252 * (1 - a)}`),
      (this.el.gauge.style.stroke = i > 55 ? `#ff5a3c` : i > 35 ? `#ff8a3d` : `#3fd1c6`),
      this.el.air.classList.toggle(`on`, t.airborne),
      this.toastTimer > 0 &&
        ((this.toastTimer -= e), this.toastTimer <= 0 && this.el.toast.classList.remove(`on`));
  }
  setFPS(e, t) {
    this.el.fps.textContent = `${e} FPS · ${Math.round(t * 100)}% res`;
  }
  airTricks(e) {
    this.el.airTricks.innerHTML = e
      .map(
        (e, t) => `${t ? `<span class="t plus">+</span>` : ``}<span class="t">${e.name.toUpperCase()}</span>`,
      )
      .join(``);
  }
  clearAir() {
    this.el.airTricks.innerHTML = ``;
  }
  popup(e, t, n) {
    let r = document.createElement(`div`);
    (r.className = `popup`),
      (r.innerHTML = `<div class="grade ${e.split(` `)[0]}">${e}</div>${t ? `<div class="pts">${t}</div>` : ``}${n ? `<div class="names">${n}</div>` : ``}`),
      (this.el.popups.innerHTML = ``),
      this.el.popups.appendChild(r),
      setTimeout(() => r.remove(), 2300);
  }
  landed(e) {
    if ((this.clearAir(), !e.tricks.length && !e.label && e.airTime < 0.9)) return;
    let t = e.tricks.map((e) => e.name.toUpperCase()).join(` + `) || e.label || `AIRTIME`,
      n = e.tricks.length ? `${e.quality}${e.quality === `PERFECT` ? `!` : ``}` : e.label || e.quality,
      r =
        e.points > 0
          ? `+${formatInt(e.points)}${e.usedMult > 1 ? `  <span class="dim">×${e.usedMult}</span>` : ``}`
          : ``;
    this.popup(n, r, t);
  }
  bail(e, t) {
    this.clearAir(), this.popup(`BAIL`, e, t > 1 ? `COMBO ×${t} LOST` : ``);
  }
  toast(e, t = 1.6) {
    (this.el.toast.textContent = e), this.el.toast.classList.add(`on`), (this.toastTimer = t);
  }
  showFinish(e) {
    this.el.finish.classList.remove(`hidden`),
      (byId(`f-time`).textContent = formatTime(e.time)),
      (byId(`f-score`).textContent = formatInt(e.score)),
      (byId(`f-combo`).textContent = `×${e.bestCombo}`),
      (byId(`f-tricks`).textContent = e.tricks),
      (byId(`f-crashes`).textContent = e.crashes),
      (byId(`f-top`).textContent = `${Math.round(e.topSpeed * 3.6)} km/h`),
      (byId(`f-best`).textContent = e.bestText);
  }
  hideFinish() {
    this.el.finish.classList.add(`hidden`);
  }
};

export { Hud, formatTime };
