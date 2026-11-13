// WebAudio synthesized sound effects.

const AudioEngine = class {
  constructor() {
    (this.ctx = null), (this.muted = !1);
  }
  start() {
    if (this.ctx) return;
    let e = window.AudioContext || window.webkitAudioContext;
    if (!e) return;
    let t = (this.ctx = new e());
    (this.master = t.createGain()), (this.master.gain.value = 0.7), this.master.connect(t.destination);
    let n = t.createBuffer(1, t.sampleRate * 2, t.sampleRate),
      r = n.getChannelData(0),
      i = 0;
    for (let e = 0; e < r.length; e++) {
      let t = Math.random() * 2 - 1;
      (i = (i + 0.02 * t) / 1.02), (r[e] = t * 0.5 + i * 3);
    }
    this.noiseBuf = n;
    let a = (e, r, i) => {
      let a = t.createBufferSource();
      (a.buffer = n), (a.loop = !0);
      let o = t.createBiquadFilter();
      (o.type = e), (o.frequency.value = r), (o.Q.value = i);
      let s = t.createGain();
      return (
        (s.gain.value = 0),
        a.connect(o),
        o.connect(s),
        s.connect(this.master),
        a.start(),
        {
          f: o,
          g: s,
        }
      );
    };
    (this.wind = a(`bandpass`, 500, 0.6)),
      (this.rumble = a(`lowpass`, 180, 0.8)),
      (this.skid = a(`bandpass`, 2400, 1.4));
  }
  toggleMute() {
    return (
      (this.muted = !this.muted), this.master && (this.master.gain.value = this.muted ? 0 : 0.7), this.muted
    );
  }
  update(e, t, n, r) {
    if (!this.ctx) return;
    let i = this.ctx.currentTime,
      a = Math.min(1, e / 22);
    this.wind.g.gain.setTargetAtTime(0.02 + a * a * 0.35, i, 0.1),
      this.wind.f.frequency.setTargetAtTime(350 + a * 900, i, 0.2),
      this.rumble.g.gain.setTargetAtTime(t ? Math.min(0.5, e * 0.03) * (0.6 + r * 0.4) : 0, i, 0.05),
      this.rumble.f.frequency.setTargetAtTime(120 + e * 8, i, 0.1),
      this.skid.g.gain.setTargetAtTime(t ? Math.min(0.22, Math.max(0, n - 0.8) * 0.06) : 0, i, 0.05);
  }
  _env(e, t, n, r) {
    let i = this.ctx.currentTime;
    e.gain.setValueAtTime(0, i),
      e.gain.linearRampToValueAtTime(t, i + n),
      e.gain.exponentialRampToValueAtTime(1e-4, i + n + r);
  }
  thump(e = 1) {
    if (!this.ctx) return;
    let t = this.ctx,
      n = t.createOscillator();
    (n.type = `sine`),
      n.frequency.setValueAtTime(110, t.currentTime),
      n.frequency.exponentialRampToValueAtTime(38, t.currentTime + 0.25);
    let r = t.createGain();
    n.connect(r),
      r.connect(this.master),
      this._env(r, Math.min(0.9, 0.25 + e * 0.08), 0.005, 0.3),
      n.start(),
      n.stop(t.currentTime + 0.4),
      this.noiseHit(0.25 + e * 0.03, 900, 0.18);
  }
  noiseHit(e, t, n) {
    if (!this.ctx) return;
    let r = this.ctx,
      i = r.createBufferSource();
    i.buffer = this.noiseBuf;
    let a = r.createBiquadFilter();
    (a.type = `lowpass`), (a.frequency.value = t);
    let o = r.createGain();
    i.connect(a),
      a.connect(o),
      o.connect(this.master),
      this._env(o, e, 0.005, n),
      i.start(r.currentTime, Math.random()),
      i.stop(r.currentTime + n + 0.1);
  }
  chime(e = 0) {
    if (!this.ctx) return;
    let t = this.ctx,
      n = [659.25, 783.99, 987.77, 1174.66, 1318.5][Math.min(4, e)];
    for (let [e, r] of [
      [1, 0.12],
      [2, 0.04],
    ]) {
      let i = t.createOscillator();
      (i.type = `triangle`), (i.frequency.value = n * e);
      let a = t.createGain();
      i.connect(a),
        a.connect(this.master),
        this._env(a, r, 0.01, 0.5),
        i.start(),
        i.stop(t.currentTime + 0.6);
    }
  }
  tank(e, t = 0.5) {
    if (!this.ctx || (!this.tankEng && e <= 0)) return;
    let n = this.ctx,
      r = n.currentTime;
    if (!this.tankEng) {
      let e = n.createOscillator();
      (e.type = `sawtooth`), (e.frequency.value = 34);
      let t = n.createOscillator();
      (t.type = `square`), (t.frequency.value = 51);
      let r = n.createBufferSource();
      (r.buffer = this.noiseBuf), (r.loop = !0);
      let i = n.createBiquadFilter();
      (i.type = `lowpass`), (i.frequency.value = 260), (i.Q.value = 2);
      let a = n.createGain();
      a.gain.value = 0;
      let o = n.createGain();
      (o.gain.value = 0.35),
        e.connect(o),
        t.connect(o),
        o.connect(i),
        r.connect(i),
        i.connect(a),
        a.connect(this.master),
        e.start(),
        t.start(),
        r.start(),
        (this.tankEng = {
          o: e,
          o2: t,
          f: i,
          g: a,
        });
    }
    let i = this.tankEng;
    i.g.gain.setTargetAtTime(e * 0.9, r, 0.1),
      i.o.frequency.setTargetAtTime(30 + t * 26, r, 0.2),
      i.o2.frequency.setTargetAtTime(45 + t * 39, r, 0.2),
      i.f.frequency.setTargetAtTime(200 + t * 260, r, 0.2);
  }
  crash() {
    this.noiseHit(0.8, 1400, 0.6), this.thump(4);
  }
};

export { AudioEngine };
