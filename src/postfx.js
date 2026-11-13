// Post-processing: bloom, speed effect, output.
import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const SpeedShader = {
  uniforms: {
    tDiffuse: {
      value: null,
    },
    uSpeed: {
      value: 0,
    },
    uTime: {
      value: 0,
    },
    uAspect: {
      value: 1,
    },
    uFlash: {
      value: 0,
    },
    uFade: {
      value: 0,
    },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSpeed, uTime, uAspect, uFlash, uFade;
    varying vec2 vUv;
    float hash(float n){ return fract(sin(n) * 43758.5453); }
    void main(){
      vec2 c = vec2(0.5, 0.54);
      vec2 dir = vUv - c;
      vec2 adir = vec2(dir.x * uAspect, dir.y);
      float dist = length(adir);

      // radial motion blur, strongest at the edges
      float blur = uSpeed * smoothstep(0.12, 0.75, dist) * 0.075;
      vec3 col = vec3(0.0); float tot = 0.0;
      for (int i = 0; i < 10; i++) {
        float t = float(i) / 9.0;
        float w = 1.0 - t * 0.6;
        col += texture2D(tDiffuse, vUv - dir * blur * t).rgb * w;
        tot += w;
      }
      col /= tot;

      // streaking speed lines
      float ang = atan(adir.y, adir.x);
      float bins = 90.0;
      float id = floor((ang + 3.14159) / 6.28318 * bins);
      float rnd = hash(id * 1.37);
      float lane = smoothstep(0.5, 0.0, abs(fract((ang + 3.14159) / 6.28318 * bins) - 0.5) * 2.0 - 0.1);
      float travel = fract(dist * 1.6 - uTime * (2.4 + rnd * 2.0) + rnd * 10.0);
      float streak = smoothstep(0.0, 0.2, travel) * smoothstep(0.55, 0.2, travel);
      float isOn = step(0.72, rnd) * smoothstep(0.28, 0.75, dist);
      float lines = lane * streak * isOn * smoothstep(0.35, 1.0, uSpeed);
      col += vec3(1.0, 0.93, 0.82) * lines * 0.45;

      // warm golden grade: lift shadows slightly towards teal, highlights towards amber
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.92, 1.0, 1.06), (1.0 - smoothstep(0.0, 0.25, l)) * 0.35);
      col = mix(col, col * vec3(1.06, 1.0, 0.9), smoothstep(0.4, 1.5, l) * 0.35);

      // vignette tightens with speed
      float vig = smoothstep(1.05, 0.25 - uSpeed * 0.05, dist);
      col *= mix(1.0, vig, 0.55 + uSpeed * 0.25);

      // crash flash (red-tinted edge pulse) + fade
      col = mix(col, col * vec3(1.6, 0.6, 0.5) + vec3(0.25, 0.02, 0.0), uFlash * smoothstep(0.2, 0.9, dist));
      col *= 1.0 - uFade;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

const PostFX = class {
  constructor(e, t, n) {
    let r = e.getDrawingBufferSize(new Vector2()),
      i = new WebGLRenderTarget(r.x, r.y, {
        type: HalfFloatType,
        samples: 4,
      });
    (this.composer = new EffectComposer(e, i)),
      (this.renderPass = new RenderPass(t, n)),
      (this.bloom = new UnrealBloomPass(new Vector2(r.x / 2, r.y / 2), 0.32, 0.55, 0.92)),
      (this.speedFX = new ShaderPass(SpeedShader)),
      (this.output = new OutputPass()),
      this.composer.addPass(this.renderPass),
      this.composer.addPass(this.bloom),
      this.composer.addPass(this.speedFX),
      this.composer.addPass(this.output);
  }
  setSize(e, t, n) {
    this.composer.setPixelRatio(n),
      this.composer.setSize(e, t),
      (this.speedFX.uniforms.uAspect.value = e / t);
  }
  render(e, { speed01: t, time: n, flash: r, fade: i }) {
    let a = this.speedFX.uniforms;
    (a.uSpeed.value = t),
      (a.uTime.value = n),
      (a.uFlash.value = r),
      (a.uFade.value = i),
      this.composer.render(e);
  }
};

export { PostFX };
