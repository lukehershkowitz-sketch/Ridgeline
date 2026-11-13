// Procedurally painted canvas textures (grass, dirt, rock, wood, banners).
import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';
import { makeValueNoise, mulberry32 } from './noise.js';

const TEXTURE_SIZE = 512;

function makeCanvas(e = TEXTURE_SIZE) {
  let t = document.createElement(`canvas`);
  return (t.width = t.height = e), t;
}

function paintPixels(e, t, n) {
  let r = e.createImageData(t, t),
    i = r.data;
  for (let e = 0; e < t; e++)
    for (let r = 0; r < t; r++) {
      let [a, o, s] = n(r / t, e / t),
        c = (e * t + r) * 4;
      (i[c] = a), (i[c + 1] = o), (i[c + 2] = s), (i[c + 3] = 255);
    }
  e.putImageData(r, 0, 0);
}

function makeFbm(e, t, n) {
  let r = [];
  for (let i = 0; i < n; i++)
    r.push({
      n: makeValueNoise(e + i * 17, t << i),
      p: t << i,
      a: 0.5 ** i,
    });
  let i = r.reduce((e, t) => e + t.a, 0);
  return (e, t) => r.reduce((n, r) => n + r.n(e * r.p, t * r.p) * r.a, 0) / i;
}

function forEachWrapped(e, t, n, r, i) {
  for (let a of [-e, 0, e])
    for (let o of [-e, 0, e]) {
      let s = t + a,
        c = n + o;
      s + r < 0 || c + r < 0 || s - r > e || c - r > e || i(s, c);
    }
}

function canvasToTexture(t, { srgb: n = !0, repeat: r = !0 } = {}) {
  let i = new CanvasTexture(t);
  return (
    r && (i.wrapS = i.wrapT = RepeatWrapping),
    (i.colorSpace = n ? SRGBColorSpace : ``),
    (i.anisotropy = 8),
    (i.generateMipmaps = !0),
    (i.minFilter = LinearMipmapLinearFilter),
    (i.needsUpdate = !0),
    i
  );
}

function makeGrassTexture() {
  let e = makeCanvas(),
    t = e.getContext(`2d`),
    n = makeFbm(11, 4, 5),
    r = makeFbm(29, 16, 3);
  paintPixels(t, TEXTURE_SIZE, (e, t) => {
    let i = n(e, t),
      a = r(e, t);
    return [70 + i * 60 + a * 20, 86 + i * 58 + a * 14, 38 + i * 26];
  });
  let i = mulberry32(5);
  for (let e = 0; e < 16e3; e++) {
    let e = i() * TEXTURE_SIZE,
      n = i() * TEXTURE_SIZE,
      r = 4 + i() * 9,
      a = i() * Math.PI * 2,
      o = i(),
      s = 0.55 + i() * 0.6;
    (t.strokeStyle =
      o > 0.8
        ? `rgba(${(178 * s) | 0},${(160 * s) | 0},${(92 * s) | 0},0.85)`
        : `rgba(${(78 * s) | 0},${(112 * s) | 0},${(44 * s) | 0},0.8)`),
      (t.lineWidth = 0.8 + i() * 1.2),
      (t.lineCap = `round`),
      forEachWrapped(TEXTURE_SIZE, e, n, r, (e, n) => {
        t.beginPath(),
          t.moveTo(e, n),
          t.quadraticCurveTo(
            e + Math.cos(a) * r * 0.5 + 2,
            n + Math.sin(a) * r * 0.5,
            e + Math.cos(a) * r,
            n + Math.sin(a) * r,
          ),
          t.stroke();
      });
  }
  return canvasToTexture(e);
}

function makeDirtTexture() {
  let e = makeCanvas(),
    t = e.getContext(`2d`),
    n = makeFbm(41, 4, 6),
    r = makeFbm(77, 32, 2);
  paintPixels(t, TEXTURE_SIZE, (e, t) => {
    let i = n(e, t),
      a = r(e, t),
      o = 0.75 + i * 0.5 + (a - 0.5) * 0.25;
    return [150 * o, 112 * o, 78 * o];
  });
  let i = mulberry32(9);
  for (let e = 0; e < 2600; e++) {
    let e = i() * TEXTURE_SIZE,
      n = i() * TEXTURE_SIZE,
      r = 0.8 + i() ** 3 * 5,
      a = 0.6 + i() * 0.6;
    forEachWrapped(TEXTURE_SIZE, e, n, r + 2, (e, n) => {
      (t.fillStyle = `rgba(40,28,18,0.35)`),
        t.beginPath(),
        t.ellipse(e + 0.8, n + 1, r * 1.1, r * 0.9, 0, 0, Math.PI * 2),
        t.fill(),
        (t.fillStyle = `rgb(${(170 * a) | 0},${(150 * a) | 0},${(128 * a) | 0})`),
        t.beginPath(),
        t.ellipse(e, n, r, r * 0.8, i() * 3, 0, Math.PI * 2),
        t.fill(),
        (t.fillStyle = `rgba(255,240,220,0.25)`),
        t.beginPath(),
        t.ellipse(e - r * 0.25, n - r * 0.25, r * 0.45, r * 0.3, 0, 0, Math.PI * 2),
        t.fill();
    });
  }
  return canvasToTexture(e);
}

function makeRockTexture() {
  let e = makeCanvas(),
    t = e.getContext(`2d`),
    n = makeFbm(51, 4, 6),
    r = makeFbm(63, 8, 3);
  paintPixels(t, TEXTURE_SIZE, (e, t) => {
    let i = n(e, t),
      a = Math.sin((t * 22 + r(e, t) * 6) * Math.PI) * 0.5 + 0.5,
      o = 0.55 + i * 0.55 + a * 0.12;
    return [128 * o, 122 * o, 114 * o];
  });
  let i = mulberry32(13);
  t.lineCap = `round`;
  for (let e = 0; e < 140; e++) {
    let e = i() * TEXTURE_SIZE,
      n = i() * TEXTURE_SIZE,
      r = i() * Math.PI * 2;
    (t.strokeStyle = `rgba(30,26,24,${0.25 + i() * 0.4})`), (t.lineWidth = 0.6 + i() * 1.4);
    let a = (6 + i() * 14) | 0;
    for (let o = 0; o < a; o++) {
      let a = e + Math.cos(r) * 6,
        o = n + Math.sin(r) * 6;
      forEachWrapped(TEXTURE_SIZE, e, n, 8, (r, i) => {
        t.beginPath(), t.moveTo(r, i), t.lineTo(r + a - e, i + o - n), t.stroke();
      }),
        (e = a),
        (n = o),
        (r += (i() - 0.5) * 0.9);
    }
  }
  for (let e = 0; e < 1400; e++) {
    let e = i() * TEXTURE_SIZE,
      n = i() * TEXTURE_SIZE,
      r = 0.5 + i() * 2.5;
    (t.fillStyle = i() > 0.5 ? `rgba(160,170,110,0.35)` : `rgba(200,190,150,0.3)`),
      forEachWrapped(TEXTURE_SIZE, e, n, r, (e, n) => {
        t.beginPath(), t.arc(e, n, r, 0, Math.PI * 2), t.fill();
      });
  }
  return canvasToTexture(e);
}

function makeWoodTexture() {
  let e = makeCanvas(),
    t = e.getContext(`2d`),
    n = makeFbm(91, 4, 4),
    r = mulberry32(21),
    i = Array.from(
      {
        length: 8,
      },
      () => 0.8 + r() * 0.35,
    );
  paintPixels(t, TEXTURE_SIZE, (e, t) => {
    let r = Math.floor(t * 8),
      a = t * 8 - r,
      o = n(e * 0.25, t * 4 + r * 0.37),
      s = Math.sin((t * 8 * 6 + o * 9 + e * 1.5) * Math.PI) * 0.5 + 0.5,
      c = i[r] * (0.78 + s * 0.14 + o * 0.2),
      l = Math.min(a, 1 - a);
    return l < 0.035 && (c *= 0.35 + l * 12), [176 * c, 132 * c, 88 * c];
  });
  for (let e = 0; e < 8; e++)
    for (let n of [0.06, 0.94, 0.5]) {
      let r = ((e + 0.5) / 8) * TEXTURE_SIZE;
      (t.fillStyle = `rgba(50,45,40,0.9)`),
        t.beginPath(),
        t.arc(n * TEXTURE_SIZE, r - 6, 2.2, 0, 7),
        t.arc(n * TEXTURE_SIZE, r + 6, 2.2, 0, 7),
        t.fill();
    }
  return canvasToTexture(e);
}

function makeBannerTexture(e, t = `#d9462b`, n = `#fff6e8`) {
  let r = document.createElement(`canvas`);
  (r.width = 1024), (r.height = 192);
  let i = r.getContext(`2d`),
    a = i.createLinearGradient(0, 0, 0, r.height);
  a.addColorStop(0, t),
    a.addColorStop(1, `#8f2312`),
    (i.fillStyle = a),
    i.fillRect(0, 0, r.width, r.height),
    (i.fillStyle = `rgba(0,0,0,0.25)`),
    i.fillRect(0, r.height - 18, r.width, 18),
    (i.fillStyle = n);
  let o = 120;
  do (i.font = `900 ${o}px "Segoe UI", Helvetica, Arial, sans-serif`), (o -= 6);
  while (i.measureText(e).width > r.width * 0.86 && o > 30);
  return (
    (i.textAlign = `center`),
    (i.textBaseline = `middle`),
    i.fillText(e, r.width / 2, r.height / 2 + 4),
    canvasToTexture(r, {
      repeat: !1,
    })
  );
}

let textureCache = null;

function getTextures() {
  return (
    (textureCache ||= {
      grass: makeGrassTexture(),
      dirt: makeDirtTexture(),
      rock: makeRockTexture(),
      wood: makeWoodTexture(),
    }),
    textureCache
  );
}

export { getTextures, makeBannerTexture };
