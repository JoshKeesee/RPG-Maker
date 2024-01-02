import { map } from "./map.js";
import { camera } from "./camera.js";
import { touch, editor, c, stats } from "./game.js";

const keys = {};

class Player {
  constructor(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.path = [];
    this.curr = 0;
    this.xVel = 0;
    this.yVel = 0;
    this.speed = 4;
    this.friction = 0.7;
    this.width = map.tsize;
    this.height = map.tsize;
    this.p = 2;
    this.dir = 0;
    this.frame = 0;
    this.gender = Math.random() <= 0.5 ? "boy" : "girl";
    this.color = this.generateColor();

    this.mouse = {
      x: 0,
      y: 0,
      clicked: false,
    };

    let spawn = true;
    while (spawn) {
    	this.x = Math.floor(Math.random() * map.w);
    	this.y = Math.floor(Math.random() * map.h);
    	if (stats.dontCollide.includes(map.map.scenery[this.y][this.x]) && stats.dontCollide.includes(map.map.structure[this.y][this.x])) spawn = false;
    }

    this.x *= map.tsize;
    this.y *= map.tsize;

    c.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    c.addEventListener("mousedown", (e) => (this.mouse.clicked = true));
    c.addEventListener("mouseup", (e) => (this.mouse.clicked = false));
  }
  generateColor() {
    const l = "0123456789abcdef";
    let h = "#";
    for (let i = 0; i < 6; i++) h += l[Math.floor(Math.random() * l.length)];
    return h;
  }
  colliding(vx, vy) {
    const dx = Math.floor((this.x + vx) / map.tsize);
    const dy = Math.floor((this.y + vy) / map.tsize);
    return !(dx >= 0 && dy >= 0 && dx < map.w && dy < map.h)
      ? true
      : !stats.dontCollide.includes(map.map.structure[dy][dx]) ||
          !stats.dontCollide.includes(map.map.scenery[dy][dx]);
  }
  handleCollision(dir) {
    const m = this[dir + "Vel"] < 0 ? 1 : 0;
    const d = Math.floor(this[dir] / map.tsize);
    let col = false;
    const check = (c) => {
      if (c) {
        this[dir] = d * map.tsize + m * map.tsize;
        this[dir + "Vel"] = 0;
        col = true;
      }
    };
    if (!col) check(this.colliding(this.p, this.p));
    if (!col) check(this.colliding(this.width - this.p, this.p));
    if (!col) check(this.colliding(this.p, this.height - this.p));
    if (!col) check(this.colliding(this.width - this.p, this.height - this.p));
  }
  frames() {
    if (Math.abs(this.xVel) > 1 || Math.abs(this.yVel) > 1) this.frame++;
    if (this.frame > 3) this.frame = 0;
  }
  update() {
    if (camera.m) return;
    if (keys["e"]) {
      delete keys["e"];
      editor.toggle();
    }
    if (editor.toggled) return;
    if (keys["w"] || keys["arrowup"]) {
      this.yVel -= this.speed;
      this.dir = 2;
    }
    if (keys["a"] || keys["arrowleft"]) {
      this.xVel -= this.speed;
      this.dir = 1;
    }
    if (keys["s"] || keys["arrowdown"]) {
      this.yVel += this.speed;
      this.dir = 0;
    }
    if (keys["d"] || keys["arrowright"]) {
      this.xVel += this.speed;
      this.dir = 3;
    }
    const t = touch.keys.find((e) => e.type == "joystick");
    if (t?.isDown) {
      this.xVel += Math.abs(t.px / t.r) * this.speed * Math.cos(t.angle);
      this.yVel += Math.abs(t.py / t.r) * this.speed * Math.sin(t.angle);

      const m = t.r / 3;

      if (t.px < -m) this.dir = 3;
      if (t.px > m) this.dir = 1;
      if (t.py < -m) this.dir = 0;
      if (t.py > m) this.dir = 2;
    }
    if (
      keys["w"] ||
      keys["arrowup"] ||
      keys["s"] ||
      keys["arrowdown"] ||
      keys["a"] ||
      keys["arrowleft"] ||
      keys["d"] ||
      keys["arrowright"] ||
      touch.isDown
    ) {
      this.path = [];
      this.curr = 0;
    }
    if (keys["p"]) {
      delete keys["p"];
      camera.setZoom(camera.z == 1 ? 0.7 : 1);
    }
    if (keys["shift"]) this.speed = 6;
    else this.speed = 4;
    this.xVel *= this.friction;
    this.yVel *= this.friction;

    // if (this.mouse.clicked) {
    // 	this.mouse.clicked = false;
    // 	const dx = Math.floor((this.mouse.x + camera.x) / map.tsize);
    // 	const dy = Math.floor((this.mouse.y + camera.y) / map.tsize);
    // 	if (dx >= 0 && dy >= 0 && dx < map.w && dy < map.h && stats.dontCollide.includes(map.map.scenery[dy][dx]) && stats.dontCollide.includes(map.map.structure[dy][dx])) {
    // 		this.path = map.pathTo(Math.floor(this.x / map.tsize), Math.floor(this.y / map.tsize), dx, dy);
    // 		this.x = Math.floor(this.x / map.tsize) * map.tsize;
    // 		this.y = Math.floor(this.y / map.tsize) * map.tsize;
    // 	}
    // }

    if (this.path.length > 0) {
      const dx = this.path[this.curr].y;
      const dy = this.path[this.curr].x;
      this.xVel = this.yVel = 0;
      if (
        dx == this.x.toFixed(1) / map.tsize &&
        dy == this.y.toFixed(1) / map.tsize
      )
        this.curr++;
      if (this.curr >= this.path.length) {
        this.path = [];
        this.curr = 0;
      } else {
        const x = this.x / map.tsize;
        const y = this.y / map.tsize;
        const tx = this.path[this.curr].y;
        const ty = this.path[this.curr].x;
        const angle = Math.atan2(ty - y, tx - x);
        this.xVel = Math.cos(angle) * this.speed;
        this.yVel = Math.sin(angle) * this.speed;
        if (Math.ceil(tx - x) == 1) this.dir = 3;
        if (Math.floor(tx - x) == -1) this.dir = 1;
        if (Math.ceil(ty - y) == 1) this.dir = 0;
        if (Math.floor(ty - y) == -1) this.dir = 2;
      }
    }

    this.x += this.xVel;
    this.handleCollision("x");
    this.y += this.yVel;
    this.handleCollision("y");

    if (!(Math.abs(this.xVel) > 1 || Math.abs(this.yVel) > 1)) this.frame = 0;
  }
}

onkeydown = (e) => (!e.repeat ? (keys[e.key.toLowerCase()] = true) : "");
onkeyup = (e) => delete keys[e.key.toLowerCase()];

export { Player, keys };
