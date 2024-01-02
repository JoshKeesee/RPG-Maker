import { map } from "./map.js";
import { players, wait, editor, c } from "./game.js";

class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.z = 1;
    this.dx = 0;
    this.dy = 0;
    this.dz = 1;
    this.maxVel = Infinity;
    this.s = false;
    this.m = false;
    this.smoothing = 0.3;
  }
  update() {
    if (this.f && !editor.toggled && !this.s) {
      const e = players[this.f];
      if (e) {
        this.x = e.x + e.width / 2 - c.width / 2;
        this.y = e.y + e.height / 2 - c.height / 2;
      }
    }

    if (this.z == 1) {
      if (this.x < 0) this.x = 0;
      if (this.y < 0) this.y = 0;
      if (this.x + c.width > map.w * map.tsize)
        this.x = map.w * map.tsize - c.width;
      if (this.y + c.height > map.h * map.tsize)
        this.y = map.h * map.tsize - c.height;
    }

    this.dx += Math.min(this.maxVel, (this.x - this.dx) * this.smoothing);
    this.dy += Math.min(this.maxVel, (this.y - this.dy) * this.smoothing);
    this.dz += Math.min(
      this.maxVel / 1000,
      (this.z - this.dz) * this.smoothing,
    );
  }
  follow(id) {
    this.f = id;
  }
  setZoom(z) {
    this.z = z;
  }
  set(v, delay = 0) {
    Object.keys(v).forEach((k) => (this[k] = v[k]));
    const check = () => {
      let c = 0;
      if (Math.abs(this.x - this.dx).toFixed(1) == 0) c++;
      if (Math.abs(this.y - this.dy).toFixed(1) == 0) c++;
      if (Math.abs(this.z - this.dz).toFixed(1) == 0) c++;
      return c;
    };
    return new Promise((resolve) => {
      const c = setInterval(async () => {
        if (check() == 3) {
          clearInterval(c);
          await wait(delay);
          resolve();
        }
      }, 10);
    });
  }
  shake(amount, duration) {
    this.s = true;
    const e = players[this.f];
    const startTime = performance.now();
    const shakeInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        clearInterval(shakeInterval);
        this.s = false;
        amount = 0;
      } else {
        const x = e ? e.x + e.width / 2 : this.x;
        const y = e ? e.y + e.height / 2 : this.y;

        this.x = x - c.width / 2 + Math.random() * amount - amount / 2;
        this.y = y - c.height / 2 + Math.random() * amount - amount / 2;
      }
    }, 10);
  }
}

export const camera = new Camera();
