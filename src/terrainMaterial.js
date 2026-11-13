// Terrain shader patches (trail blending, triplanar rock).
import { MeshStandardMaterial } from 'three';
import { TRAIL_HALF_WIDTH, TRAIL_LENGTH, TRAIL_WAVES } from './trail.js';

const TRAIL_GLSL = `
#define TRAIL_HALF ${TRAIL_HALF_WIDTH.toFixed(3)}
float trailCX(float z){ return ${TRAIL_WAVES.map(([e, t, n]) => `${e.toFixed(4)}*sin(z*${t.toFixed(5)}+${n.toFixed(3)})`).join(`+`)}; }
float trailDX(float z){ return ${TRAIL_WAVES.map(([e, t, n]) => `${(e * t).toFixed(6)}*cos(z*${t.toFixed(5)}+${n.toFixed(3)})`).join(`+`)}; }
float trailPresence(float z){ return smoothstep(40.0, 18.0, z) * smoothstep(${(-TRAIL_LENGTH - 120).toFixed(1)}, ${(-TRAIL_LENGTH - 80).toFixed(1)}, z); }
`;

const WIND_UNIFORMS = {
  uTime: {
    value: 0,
  },
};

const TERRAIN_FRAG_PARS = `
uniform sampler2D tGrass;
uniform sampler2D tDirt;
uniform sampler2D tRock;
varying vec3 vWPos;
varying vec3 vWNormal;
${TRAIL_GLSL}
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
}
vec3 noTile(sampler2D t, vec2 uv){
  // blend two rotated/scaled lookups to hide texture repetition
  vec3 a = texture2D(t, uv).rgb;
  vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.37 + vec2(0.31, 0.17);
  vec3 b = texture2D(t, uv2).rgb;
  float m = smoothstep(0.3, 0.7, vnoise(uv * 0.21));
  return mix(a, b, m * 0.6);
}
vec3 triplanar(sampler2D t, vec3 p, vec3 n, float s){
  vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
  return texture2D(t, p.zy * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 perturbN(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
  vec3 vSigmaX = normalize(dFdx(surf_pos)); vec3 vSigmaY = normalize(dFdy(surf_pos));
  vec3 R1 = cross(vSigmaY, surf_norm); vec3 R2 = cross(surf_norm, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}
`;

const TERRAIN_FRAG_MAIN = `
  vec2 wuv = vWPos.xz;
  float camDist = length(vWPos - cameraPosition);
  float macro = vnoise(wuv * 0.018) * 0.6 + vnoise(wuv * 0.07) * 0.4;

  // grass
  vec3 grass = noTile(tGrass, wuv * 0.22);
  vec3 lush = vec3(0.86, 1.0, 0.78), dry = vec3(1.22, 1.08, 0.70);
  grass *= mix(lush, dry, smoothstep(0.35, 0.75, macro));

  // trail mask (per-pixel, wobbly natural edges)
  float tz = vWPos.z;
  float tdx = trailDX(tz);
  float dn = (vWPos.x - trailCX(tz)) / sqrt(1.0 + tdx * tdx);
  float edge = TRAIL_HALF + (vnoise(wuv * 1.4) - 0.5) * 0.55 + (vnoise(wuv * 0.23) - 0.5) * 0.9;
  float trailW = (1.0 - smoothstep(edge - 0.35, edge + 0.45, abs(dn))) * trailPresence(tz);
  float trampled = (1.0 - smoothstep(edge + 0.2, edge + 1.8, abs(dn))) * trailPresence(tz);

  vec3 dirt = noTile(tDirt, wuv * 0.3);
  // tyre ruts: two worn, darker, smoother lines
  float rut = exp(-pow((abs(dn) - 0.42) / 0.16, 2.0)) * (0.6 + 0.4 * vnoise(wuv * 2.0));
  float centreDust = exp(-pow(dn / 0.9, 2.0));
  dirt *= 1.0 - rut * 0.22;
  dirt = mix(dirt, dirt * vec3(1.12, 1.06, 0.98), centreDust * 0.5);

  // patches of bare earth in the meadow
  float patchW = smoothstep(0.66, 0.78, vnoise(wuv * 0.045 + 7.0)) * 0.85;

  // rock on steep faces
  vec3 n = normalize(vWNormal);
  float slope = 1.0 - n.y;
  float rockW = smoothstep(0.26, 0.42, slope + (macro - 0.5) * 0.18);
  vec3 rock = triplanar(tRock, vWPos, n, 0.16);

  vec3 col = grass;
  col = mix(col, grass * vec3(1.15, 1.0, 0.72) * 0.92, trampled * 0.65);   // trampled/dry edge
  col = mix(col, dirt, max(trailW, patchW));
  col = mix(col, rock, rockW * (1.0 - trailW));

  // distant canopy tint so faraway hills read as forested
  float forest = smoothstep(0.35, 0.6, vnoise(wuv * 0.009 + 3.1)) * (1.0 - rockW) * (1.0 - trailW);
  col = mix(col, vec3(0.045, 0.07, 0.035), forest * smoothstep(330.0, 560.0, camDist) * 0.85);

  float terrHeight = mix(mix(luma(grass) * 0.8, luma(dirt) * 1.3, max(trailW, patchW)), luma(rock) * 1.8, rockW * (1.0 - trailW));
  float terrRough = mix(mix(0.96, 0.9, trailW), 0.82, rockW);
  diffuseColor.rgb *= col;
`;

function createTerrainMaterial(e) {
  let t = new MeshStandardMaterial({
    color: 16777215,
    roughness: 0.95,
    metalness: 0,
  });
  return (
    (t.onBeforeCompile = (t) => {
      (t.uniforms.tGrass = {
        value: e.grass,
      }),
        (t.uniforms.tDirt = {
          value: e.dirt,
        }),
        (t.uniforms.tRock = {
          value: e.rock,
        }),
        (t.vertexShader = t.vertexShader
          .replace(
            `#include <common>`,
            `#include <common>
varying vec3 vWPos;
varying vec3 vWNormal;`,
          )
          .replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWNormal = normalize(mat3(modelMatrix) * objectNormal);`,
          )),
        (t.fragmentShader = t.fragmentShader
          .replace(
            `#include <common>`,
            `#include <common>
` + TERRAIN_FRAG_PARS,
          )
          .replace(`#include <map_fragment>`, TERRAIN_FRAG_MAIN)
          .replace(`#include <roughnessmap_fragment>`, `float roughnessFactor = roughness * terrRough;`)
          .replace(
            `#include <normal_fragment_maps>`,
            `#include <normal_fragment_maps>
        {
          float bumpFade = 1.0 - smoothstep(25.0, 90.0, camDist);
          vec2 dHdxy = vec2(dFdx(terrHeight), dFdy(terrHeight)) * 1.6 * bumpFade;
          normal = perturbN(-vViewPosition, normal, dHdxy, faceDirection);
        }`,
          ));
    }),
    (t.customProgramCacheKey = () => `terrain-v1`),
    t
  );
}

export { WIND_UNIFORMS, createTerrainMaterial };
