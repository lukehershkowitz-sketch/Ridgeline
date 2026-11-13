// Chase camera.
import { Vector3 } from 'three';
import { clamp } from './noise.js';

// Landing dip spring (omega 9 rad/s, damping ratio 0.75).
const DIP_STIFFNESS = 81;

const DIP_DAMPING = 13.5;
import { groundHeight } from './trail.js';

const _camA = new Vector3();

const _camB = new Vector3();

const _camC = new Vector3();

const ChaseCamera = class {
  constructor(e) {
    (this.camera = e),
      (this.yaw = Math.PI),
      (this.pos = new Vector3()),
      (this.lookAt = new Vector3()),
      (this.shake = 0),
      (this.fov = e.fov),
      (this.dip = 0),
      (this.dipVel = 0),
      (this.airDrop = 0),
      (this.groundBlend = 1),
      (this.initialised = !1);
  }
  addShake(e) {
    this.shake = Math.min(1.2, this.shake + e);
  }
  // Touchdown: a soft downward dip that recovers, plus shake only for hard hits.
  land(e) {
    (this.dipVel -= Math.min(e, 14) * 0.3), this.addShake(clamp((e - 6) / 16, 0, 0.5));
  }
  update(e, t, n, r = `ride`) {
    let i = this.camera,
      a = t.speed,
      o = _camA.copy(t.pos);
    if (((o.y += 1.05), r === `title`)) {
      let e = n * 0.12 + 2.2,
        r = 6.2;
      this.pos.set(t.pos.x + Math.sin(e) * r, 0, t.pos.z + Math.cos(e) * r),
        (this.pos.y = Math.max(t.pos.y + 1.6, groundHeight(this.pos.x, this.pos.z) + 1)),
        i.position.copy(this.pos),
        i.lookAt(o.x, o.y - 0.2, o.z),
        (this.yaw = t.yaw),
        (this.initialised = !1);
      return;
    }
    let s = t.yaw;
    a > 2.5 && (s = Math.atan2(t.vel.x, t.vel.z));
    let c = Math.atan2(Math.sin(s - this.yaw), Math.cos(s - this.yaw));
    // Blend between air and ground follow rates rather than switching on touchdown.
    this.groundBlend += (+!!t.grounded - this.groundBlend) * (1 - Math.exp(-e * 5));
    let gb = this.groundBlend;
    this.yaw += c * Math.min(1, e * (1.6 + 1.6 * gb));
    let l = 4.3 + clamp(a, 0, 25) * 0.085,
      u = 1.55 + clamp(a, 0, 25) * 0.025;
    _camB.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    let d = new Vector3().copy(o).addScaledVector(_camB, -l);
    let airDrop = t.grounded ? 0 : Math.min(1.2, t.airTime * 0.6);
    this.initialised || ((this.airDrop = airDrop), (this.groundBlend = gb = +!!t.grounded), (this.dip = this.dipVel = 0)),
      (this.airDrop += (airDrop - this.airDrop) * (1 - Math.exp(-e * (t.grounded ? 3 : 12)))),
      (d.y += u - this.airDrop);
    let f = groundHeight(d.x, d.z);
    (d.y = Math.max(d.y, f + 0.9)), (this.initialised ||= (this.pos.copy(d), this.lookAt.copy(o), !0));
    let p = 1 - Math.exp(-e * 7.5),
      m = 1 - Math.exp(-e * (3 + 3 * gb));
    (this.pos.x += (d.x - this.pos.x) * p),
      (this.pos.z += (d.z - this.pos.z) * p),
      (this.pos.y += (d.y - this.pos.y) * m),
      (this.pos.y = Math.max(this.pos.y, groundHeight(this.pos.x, this.pos.z) + 0.6)),
      _camC.copy(o).addScaledVector(_camB, 2.5 + a * 0.08),
      (_camC.y -= 0.25 + clamp(a, 0, 20) * 0.01),
      this.lookAt.lerp(_camC, 1 - Math.exp(-e * 10)),
      (this.shake = Math.max(0, this.shake - e * 2.2));
    let h = t.grounded ? clamp((a - 12) / 14, 0, 1) * 0.025 : 0,
      g = this.shake * 0.16 + h;
    (this.dipVel += (-DIP_STIFFNESS * this.dip - DIP_DAMPING * this.dipVel) * e), (this.dip += this.dipVel * e);
    i.position.copy(this.pos),
      (i.position.y += this.dip),
      (i.position.x += (Math.sin(n * 47) + Math.sin(n * 31)) * g * 0.5),
      (i.position.y += (Math.sin(n * 53) + Math.cos(n * 37)) * g * 0.5),
      i.lookAt(this.lookAt.x, this.lookAt.y + this.dip * 0.5, this.lookAt.z);
    let _ = 60 + clamp(a - 4, 0, 22) * 0.75;
    (this.fov += (_ - this.fov) * (1 - Math.exp(-e * 3))), (i.fov = this.fov), i.updateProjectionMatrix();
  }
};

export { ChaseCamera };
