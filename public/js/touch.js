import { editor, ctx, mobile, c } from "./game.js";
import { keys } from "./player.js";

class Touch {
  constructor(c) {
    this.sx = 0;
    this.sy = 0;
    this.p = 5;
    this.r = 50;
    this.keys = [];
    this.t = [];
    this.keyRadius = 30;

    this.add("shift", "Sprint");
    this.add("p", "Zoom");
    this.add("joystick", null, "joystick");

    c.addEventListener(
      "touchstart",
      (e) => {
        const ct = e.changedTouches;
        for (let i = 0; i < ct.length; i++) {
          const t = ct[i];
          const c = this.keys.find((k) =>
            this.colliding(t.clientX, t.clientY, k.sx, this.sy, k.r),
          );
          this.t.push({
            id: t.identifier,
            key: c?.key,
            x: t.clientX,
            y: t.clientY,
          });
        }
        this.updateKeys();
      },
      false,
    );

    c.addEventListener(
      "touchend",
      (e) => {
        const ct = e.changedTouches;
        for (let i = 0; i < ct.length; i++) {
          const t = ct[i];
          const c = this.t.find((k) => k.id == t.identifier);
          if (c) {
            this.t.splice(this.t.indexOf(c), 1);
          }
        }
        this.updateKeys();
      },
      false,
    );

    c.addEventListener(
      "touchmove",
      (e) => {
        const ct = e.changedTouches;
        for (let i = 0; i < ct.length; i++) {
          const t = ct[i];
          const c = this.t.find((k) => k.id == t.identifier);
          if (c) {
            c.x = t.clientX;
            c.y = t.clientY;
          }
        }
        this.updateKeys(true);
      },
      false,
    );
  }
  add(l, t, type = "key") {
    this.keys.push({
      key: l,
      text: t,
      isDown: false,
      x: 0,
      y: 0,
      sx:
        type == "key"
          ? this.keyRadius +
            this.keys.length * this.keyRadius * 2 +
            this.p * 4 * (this.keys.length + 1)
          : this.sx,
      r: type == "key" ? this.keyRadius : this.r,
      id: null,
      px: 0,
      py: 0,
      angle: 0,
      power: 0,
      type,
    });
  }
  updateKeys(j = false) {
    this.keys.forEach((k) => {
      if (k.type == "joystick") {
        const d = this.t.find((t) => t.key == "joystick");
        k.isDown = d ? true : false;
        if (k.isDown) {
          k.x = d.x;
          k.y = d.y;
        }
      } else if (k.type == "key" && !j) {
        const d = this.t.find((t) => t.key == k.key);
        k.isDown = d ? true : false;
        if (k.isDown) keys[k.key] = true;
        else delete keys[k.key];
      }
    });
  }
  colliding(x1, y1, x2, y2, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy) < r;
  }
  draw() {
    if (!mobile || editor.toggled) return;
    const m = 20;
    this.sy = c.height - this.r - m;

    this.keys.forEach((k) =>
      k.type == "key" ? this.drawKey(k, m) : this.drawJoystick(k, m),
    );
  }
  drawKey(k) {
    ctx.fillStyle = ctx.strokeStyle = "rgb(0, 0, 0)";
    if (k.isDown) ctx.globalAlpha = 0.7;
    else ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(k.sx, this.sy, k.r, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(k.sx, this.sy, k.r + this.p, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.font = k.r / 2 + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(k.text, k.sx, this.sy);
  }
  drawJoystick(k, m) {
    k.sx = c.width - k.r - m;
    if (!k.isDown) {
      k.x = k.sx;
      k.y = this.sy;
    }
    if (k.isDown) ctx.globalAlpha = 0.7;
    else ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.fillStyle = ctx.strokeStyle = "rgb(0, 0, 0)";
    ctx.beginPath();
    ctx.arc(k.sx, this.sy, k.r, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(k.sx, this.sy, k.r + this.p, 0, Math.PI * 2, false);
    ctx.stroke();

    const dist = Math.hypot(k.x - k.sx, k.y - this.sy);
    let x = k.x,
      y = k.y;
    if (dist > k.r) {
      const angle = Math.atan2(k.y - this.sy, k.x - k.sx);
      x = k.sx + Math.cos(angle) * k.r;
      y = this.sy + Math.sin(angle) * k.r;
    }

    k.power = Math.min(this.r, dist);
    k.px = k.sx - x;
    k.py = this.sy - y;
    k.angle = Math.atan2(y - this.sy, x - k.sx);

    ctx.fillStyle = ctx.strokeStyle = "rgb(255, 255, 255)";
    ctx.beginPath();
    ctx.arc(x, y, k.r / 2, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, k.r / 2 + this.p, 0, Math.PI * 2, false);
    ctx.stroke();
  }
}

export default Touch;
