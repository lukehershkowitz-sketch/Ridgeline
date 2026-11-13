// Sky, sun, fog and lighting.
import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  PMREMGenerator,
  Scene,
  ShaderChunk,
  Vector3,
} from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { CONFIG } from './config.js';

const SUN_DIR = new Vector3().setFromSphericalCoords(
  1,
  MathUtils.degToRad(90 - CONFIG.sunElevationDeg),
  MathUtils.degToRad(CONFIG.sunAzimuthDeg),
);

const FOG_COLOR = new Color(`#b9a690`);

const SUN_COLOR = new Color(`#ffc58a`);

(ShaderChunk.fog_pars_vertex = `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogViewPos;
#endif`),
  (ShaderChunk.fog_vertex = `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogViewPos = mvPosition.xyz;
#endif`),
  (ShaderChunk.fog_pars_fragment = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogViewPos;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`),
  (ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  // in-scattering: haze glows warm when looking towards the low sun
  vec3 sunView = normalize( ( viewMatrix * vec4( ${SUN_DIR.x.toFixed(4)}, ${SUN_DIR.y.toFixed(4)}, ${SUN_DIR.z.toFixed(4)}, 0.0 ) ).xyz );
  float sunAmt = max( dot( normalize( vFogViewPos ), sunView ), 0.0 );
  vec3 fogCol = mix( fogColor, ${((e) => `vec3(${e.r.toFixed(4)}, ${e.g.toFixed(4)}, ${e.b.toFixed(4)})`)(SUN_COLOR.clone().convertSRGBToLinear())} * 1.25, pow( sunAmt, 6.0 ) * 0.85 );
  // a touch of extra haze close to the camera for depth
  fogFactor = clamp( fogFactor + 0.04 * smoothstep( 20.0, 120.0, vFogDepth ), 0.0, 1.0 );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );
#endif`);

const Environment = class {
  constructor(e, t) {
    (this.scene = e), (e.fog = new FogExp2(FOG_COLOR, CONFIG.fogDensity)), (e.background = FOG_COLOR.clone());
    let n = new Sky();
    n.scale.setScalar(4500);
    let r = n.material.uniforms;
    (r.turbidity.value = 7.5),
      (r.rayleigh.value = 2.2),
      (r.mieCoefficient.value = 0.006),
      (r.mieDirectionalG.value = 0.86),
      r.sunPosition.value.copy(SUN_DIR),
      r.cloudCoverage &&
        ((r.cloudCoverage.value = 0.32),
        (r.cloudDensity.value = 0.35),
        (r.cloudScale.value = 18e-5),
        (r.cloudElevation.value = 0.45)),
      (this.sky = n),
      e.add(n);
    let i = new PMREMGenerator(t),
      a = new Scene(),
      o = new Sky();
    o.scale.setScalar(1e3);
    let s = o.material.uniforms;
    for (let e of Object.keys(r)) s[e] && typeof r[e].value == `number` && (s[e].value = r[e].value);
    s.sunPosition.value.copy(SUN_DIR),
      s.showSunDisc && (s.showSunDisc.value = 0),
      a.add(o),
      (this.envRT = i.fromScene(a, 0, 0.1, 2e3)),
      (e.environment = this.envRT.texture),
      (e.environmentIntensity = 0.42),
      i.dispose();
    let c = new DirectionalLight(new Color(`#ffd2a0`), 3.4);
    (c.castShadow = !0), c.shadow.mapSize.set(CONFIG.shadowMapSize, CONFIG.shadowMapSize);
    let l = CONFIG.shadowExtent;
    Object.assign(c.shadow.camera, {
      left: -l,
      right: l,
      top: l,
      bottom: -l,
      near: 1,
      far: 600,
    }),
      (c.shadow.bias = -4e-4),
      (c.shadow.normalBias = 0.06),
      (c.shadow.radius = 3),
      e.add(c, c.target),
      (this.sun = c);
    let u = new HemisphereLight(new Color(`#9fb7d9`), new Color(`#6b5236`), 0.55);
    e.add(u),
      (this._lightZ = SUN_DIR.clone()),
      (this._lightX = new Vector3().crossVectors(new Vector3(0, 1, 0), this._lightZ).normalize()),
      (this._lightY = new Vector3().crossVectors(this._lightZ, this._lightX).normalize()),
      (this._center = new Vector3());
  }
  update(e, t) {
    let n = (CONFIG.shadowExtent * 2) / CONFIG.shadowMapSize,
      r = this._center.copy(e),
      i = Math.round(r.dot(this._lightX) / n) * n,
      a = Math.round(r.dot(this._lightY) / n) * n,
      o = r.dot(this._lightZ);
    r.copy(this._lightX).multiplyScalar(i).addScaledVector(this._lightY, a).addScaledVector(this._lightZ, o),
      this.sun.target.position.copy(r),
      this.sun.position.copy(r).addScaledVector(SUN_DIR, 300),
      this.sun.target.updateMatrixWorld(),
      this.sky.material.uniforms.time && (this.sky.material.uniforms.time.value = t);
  }
  followCamera(e) {
    this.sky.position.copy(e.position);
  }
};

export { SUN_DIR, Environment };
