// Seeded PRNG, simplex noise and small math helpers.

const SIMPLEX_F2 = 0.5 * (Math.sqrt(3) - 1);

const SIMPLEX_G2 = (3 - Math.sqrt(3)) / 6;

const SIMPLEX_GRAD2 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function mulberry32(e) {
  let t = e >>> 0;
  return function () {
    (t |= 0), (t = (t + 1831565813) | 0);
    let e = Math.imul(t ^ (t >>> 15), 1 | t);
    return (e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e), ((e ^ (e >>> 14)) >>> 0) / 4294967296;
  };
}

const SimplexNoise = class {
  constructor(e = 1) {
    let t = mulberry32(e),
      n = new Uint8Array(256);
    for (let e = 0; e < 256; e++) n[e] = e;
    for (let e = 255; e > 0; e--) {
      let r = Math.floor(t() * (e + 1)),
        i = n[e];
      (n[e] = n[r]), (n[r] = i);
    }
    this.perm = new Uint8Array(512);
    for (let e = 0; e < 512; e++) this.perm[e] = n[e & 255];
  }
  noise(e, t) {
    let n = this.perm,
      r = (e + t) * SIMPLEX_F2,
      i = Math.floor(e + r),
      a = Math.floor(t + r),
      o = (i + a) * SIMPLEX_G2,
      s = e - (i - o),
      c = t - (a - o),
      l = +(s > c),
      u = s > c ? 0 : 1,
      d = s - l + SIMPLEX_G2,
      f = c - u + SIMPLEX_G2,
      p = s - 1 + 2 * SIMPLEX_G2,
      m = c - 1 + 2 * SIMPLEX_G2,
      h = i & 255,
      g = a & 255,
      _ = 0,
      v = 0,
      y = 0,
      b = 0.5 - s * s - c * c;
    if (b > 0) {
      let e = SIMPLEX_GRAD2[n[h + n[g]] & 7];
      (b *= b), (_ = b * b * (e[0] * s + e[1] * c));
    }
    let x = 0.5 - d * d - f * f;
    if (x > 0) {
      let e = SIMPLEX_GRAD2[n[h + l + n[g + u]] & 7];
      (x *= x), (v = x * x * (e[0] * d + e[1] * f));
    }
    let S = 0.5 - p * p - m * m;
    if (S > 0) {
      let e = SIMPLEX_GRAD2[n[h + 1 + n[g + 1]] & 7];
      (S *= S), (y = S * S * (e[0] * p + e[1] * m));
    }
    return 70 * (_ + v + y);
  }
  fbm(e, t, n = 4, r = 2, i = 0.5) {
    let a = 1,
      o = 1,
      s = 0,
      c = 0;
    for (let l = 0; l < n; l++) (s += a * this.noise(e * o, t * o)), (c += a), (a *= i), (o *= r);
    return s / c;
  }
  ridged(e, t, n = 5) {
    let r = 0.5,
      i = 1,
      a = 0,
      o = 1;
    for (let s = 0; s < n; s++) {
      let n = 1 - Math.abs(this.noise(e * i, t * i));
      (n *= n), (n *= o), (o = Math.min(1, Math.max(0, n * 2))), (a += n * r), (r *= 0.5), (i *= 2.05);
    }
    return a;
  }
};

function makeValueNoise(e, t) {
  let n = mulberry32(e),
    r = new Float32Array(t * t);
  for (let e = 0; e < r.length; e++) r[e] = n();
  let i = (e, n) => r[(((n % t) + t) % t) * t + (((e % t) + t) % t)];
  return function (e, t) {
    let n = Math.floor(e),
      r = Math.floor(t),
      a = e - n,
      o = t - r,
      s = a * a * (3 - 2 * a),
      c = o * o * (3 - 2 * o),
      l = i(n, r),
      u = i(n + 1, r),
      d = i(n, r + 1),
      f = i(n + 1, r + 1);
    return l + (u - l) * s + (d - l) * c + (l - u - d + f) * s * c;
  };
}

const smoothstep = (e, t, n) => {
  let r = Math.min(1, Math.max(0, (n - e) / (t - e)));
  return r * r * (3 - 2 * r);
};

const clamp = (e, t, n) => (e < t ? t : e > n ? n : e);

export { makeValueNoise, mulberry32, SimplexNoise, smoothstep, clamp };
