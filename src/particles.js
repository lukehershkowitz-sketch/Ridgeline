// Dust particles and ambient floating motes.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { SUN_DIR } from './environment.js';

const DUST_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute float aShade;
varying float vAlpha;
varying float vShade;
varying float vGlow;
uniform float uScale;
uniform vec3 uSunDir;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  vAlpha = aAlpha;
  vShade = aShade;
  vec3 viewDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition);
  vGlow = pow(max(dot(viewDir, uSunDir), 0.0), 5.0);
}`;

const DUST_FRAG = `
varying float vAlpha;
varying float vShade;
varying float vGlow;
uniform vec3 uColor;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float soft = exp(-r * 2.6) - exp(-2.6);
  vec3 lit = uColor * (0.55 + 0.45 * vShade) + vec3(1.0, 0.72, 0.42) * vGlow * 1.6;
  gl_FragColor = vec4(lit, soft * vAlpha);
}`;

const DustParticles = class {
  constructor(e, t = 1800) {
    (this.max = t),
      (this.cursor = 0),
      (this.pos = new Float32Array(t * 3)),
      (this.vel = new Float32Array(t * 3)),
      (this.life = new Float32Array(t)),
      (this.maxLife = new Float32Array(t).fill(1)),
      (this.size0 = new Float32Array(t)),
      (this.alpha0 = new Float32Array(t));
    let n = new BufferGeometry();
    (this.aPos = new BufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage)),
      (this.aSize = new BufferAttribute(new Float32Array(t), 1).setUsage(DynamicDrawUsage)),
      (this.aAlpha = new BufferAttribute(new Float32Array(t), 1).setUsage(DynamicDrawUsage)),
      (this.aShade = new BufferAttribute(new Float32Array(t), 1)),
      n.setAttribute(`position`, this.aPos),
      n.setAttribute(`aSize`, this.aSize),
      n.setAttribute(`aAlpha`, this.aAlpha),
      n.setAttribute(`aShade`, this.aShade),
      (this.material = new ShaderMaterial({
        vertexShader: DUST_VERT,
        fragmentShader: DUST_FRAG,
        uniforms: {
          uScale: {
            value: 400,
          },
          uColor: {
            value: new Color(`#c9a27a`),
          },
          uSunDir: {
            value: SUN_DIR.clone(),
          },
        },
        transparent: !0,
        depthWrite: !1,
      })),
      (this.points = new Points(n, this.material)),
      (this.points.frustumCulled = !1),
      e.add(this.points),
      (this.carry = 0);
  }
  setViewportHeight(e) {
    this.material.uniforms.uScale.value = e * 0.55;
  }
  emit(e, t, n, r, i, a = 0.55) {
    let o = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    let s = o * 3;
    (this.pos[s] = e.x + (Math.random() - 0.5) * 0.3),
      (this.pos[s + 1] = e.y + Math.random() * 0.1),
      (this.pos[s + 2] = e.z + (Math.random() - 0.5) * 0.3),
      (this.vel[s] = t.x + (Math.random() - 0.5) * n),
      (this.vel[s + 1] = t.y + Math.random() * n * 0.6),
      (this.vel[s + 2] = t.z + (Math.random() - 0.5) * n),
      (this.life[o] = i * (0.7 + Math.random() * 0.6)),
      (this.maxLife[o] = this.life[o]),
      (this.size0[o] = r * (0.6 + Math.random() * 0.8)),
      (this.alpha0[o] = a),
      (this.aShade.array[o] = Math.random()),
      (this.aShade.needsUpdate = !0);
  }
  stream(e, t, n, r, i, a) {
    for (this.carry += r * e; this.carry >= 1; ) --this.carry, this.emit(t, n, 1.2, i, 1.6, a);
  }
  burst(e, t, n) {
    let r = new Vector3();
    for (let i = 0; i < t; i++) {
      let t = Math.random() * Math.PI * 2;
      r.set(Math.cos(t) * n, 0.4 + Math.random() * n * 0.4, Math.sin(t) * n), this.emit(e, r, 1, 1.6, 2, 0.6);
    }
  }
  update(e) {
    let t = this.aSize.array,
      n = this.aAlpha.array,
      r = Math.exp(-e * 2.2);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        n[i] !== 0 && (n[i] = 0);
        continue;
      }
      this.life[i] -= e;
      let a = i * 3;
      (this.vel[a] *= r),
        (this.vel[a + 1] = this.vel[a + 1] * r + 0.25 * e),
        (this.vel[a + 2] *= r),
        (this.pos[a] += this.vel[a] * e),
        (this.pos[a + 1] += this.vel[a + 1] * e),
        (this.pos[a + 2] += this.vel[a + 2] * e);
      let o = 1 - this.life[i] / this.maxLife[i];
      (t[i] = this.size0[i] * (0.5 + o * 2.2)),
        (n[i] = this.alpha0[i] * Math.sin(Math.min(1, o * 6) * Math.PI * 0.5) * (1 - o) * (1 - o));
    }
    (this.aPos.needsUpdate = !0), (this.aSize.needsUpdate = !0), (this.aAlpha.needsUpdate = !0);
  }
};

const MOTE_VERT = `
uniform float uTime;
uniform vec3 uCam;
uniform float uScale;
attribute float aSeed;
varying float vA;
void main(){
  vec3 box = vec3(60.0, 24.0, 60.0);
  vec3 p = position + vec3(sin(uTime * 0.3 + aSeed * 6.0) * 2.0, uTime * 0.25 + sin(uTime * 0.5 + aSeed * 3.0), cos(uTime * 0.2 + aSeed * 5.0) * 2.0);
  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = -mv.z;
  gl_PointSize = uScale * (0.6 + aSeed * 0.8) / max(d, 0.5);
  vA = (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 40.0)) * smoothstep(30.0, 6.0, d) * smoothstep(0.5, 2.5, d);
}`;

const MOTE_FRAG = `
varying float vA;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p,p);
  if (r > 1.0) discard;
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * 2.2, exp(-r * 4.0) * vA * 0.7);
}`;

const AmbientMotes = class {
  constructor(e, t = 420) {
    let n = new Float32Array(t * 3),
      r = new Float32Array(t);
    for (let e = 0; e < t; e++)
      (n[e * 3] = Math.random() * 60),
        (n[e * 3 + 1] = Math.random() * 24),
        (n[e * 3 + 2] = Math.random() * 60),
        (r[e] = Math.random());
    let i = new BufferGeometry();
    i.setAttribute(`position`, new BufferAttribute(n, 3)),
      i.setAttribute(`aSeed`, new BufferAttribute(r, 1)),
      (this.material = new ShaderMaterial({
        vertexShader: MOTE_VERT,
        fragmentShader: MOTE_FRAG,
        uniforms: {
          uTime: {
            value: 0,
          },
          uCam: {
            value: new Vector3(),
          },
          uScale: {
            value: 60,
          },
        },
        transparent: !0,
        depthWrite: !1,
        blending: 2,
      })),
      (this.points = new Points(i, this.material)),
      (this.points.frustumCulled = !1),
      e.add(this.points);
  }
  update(e, t) {
    (this.material.uniforms.uTime.value = e), this.material.uniforms.uCam.value.copy(t.position);
  }
};

export { DustParticles, AmbientMotes };
