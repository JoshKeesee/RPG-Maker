import game from "./game.js";

const colors = [
  "#ff0000",
  "#0000ff",
  "#ffff00",
  "#ff00ff",
  "#ff8000",
  "#8000ff",
  "#00ffff",
  "#800000",
  "#000080",
];

class Player {
  constructor(id, extra = {}) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.path = [];
    this.curr = 0;
    this.xVel = 0;
    this.yVel = 0;
    this.minSpeed = 3;
    this.speed = this.minSpeed;
    this.friction = 0.7;
    this.width = game.map.tsize;
    this.height = game.map.tsize;
    this.p = 2;
    this.dir = 0;
    this.frame = 0;
    this.gender = Math.random() <= 0.5 ? "boy" : "girl";
    this.color = colors[Math.floor(Math.random() * colors.length)];

    this.mouse = {
      x: 0,
      y: 0,
      clicked: false,
    };

    let spawn = true;
    while (spawn) {
      this.x = Math.floor(Math.random() * game.map.w);
      this.y = Math.floor(Math.random() * game.map.h);
      if (typeof game.map.map.scenery[this.y] == "undefined") spawn = false;
      else if (
        game.stats.dontCollide.includes(game.map.map.scenery[this.y][this.x]) &&
        game.stats.dontCollide.includes(game.map.map.structure[this.y][this.x])
      )
        spawn = false;
    }

    this.x *= game.map.tsize;
    this.y *= game.map.tsize;

    game.c.addEventListener("mousemove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    game.c.addEventListener("mousedown", (e) => (this.mouse.clicked = true));
    game.c.addEventListener("mouseup", (e) => (this.mouse.clicked = false));

    Object.keys(extra).forEach((k) => (this[k] = extra[k]));
  }
  generateColor() {
    const l = "0123456789abcdef";
    let h = "#";
    for (let i = 0; i < 6; i++) h += l[Math.floor(Math.random() * l.length)];
    return h;
  }
  colliding(vx, vy) {
    const dx = Math.floor((this.x + vx) / game.map.tsize);
    const dy = Math.floor((this.y + vy) / game.map.tsize);
    return !(dx >= 0 && dy >= 0 && dx < game.map.w && dy < game.map.h)
      ? true
      : Object.keys(game.map.map)
          .filter((e) => e != "ground")
          .some(
            (e) => !game.stats.dontCollide.includes(game.map.map[e][dy][dx]),
          );
  }
  handleCollision(dir) {
    const m = this[dir + "Vel"] < 0 ? 1 : 0;
    const d = Math.floor(this[dir] / game.map.tsize);
    let col = false;
    const check = (c) => {
      if (c) {
        this[dir] = d * game.map.tsize + m * game.map.tsize;
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
    if (game.camera.m) return;
    if (game.keys["e"]) {
      delete game.keys["e"];
      game.editor.toggle();
    }
    if (game.editor.toggled) return;
    if (game.keys["w"] || game.keys["arrowup"]) {
      this.yVel -= this.speed;
      this.dir = 2;
    }
    if (game.keys["a"] || game.keys["arrowleft"]) {
      this.xVel -= this.speed;
      this.dir = 1;
    }
    if (game.keys["s"] || game.keys["arrowdown"]) {
      this.yVel += this.speed;
      this.dir = 0;
    }
    if (game.keys["d"] || game.keys["arrowright"]) {
      this.xVel += this.speed;
      this.dir = 3;
    }
    const t = game.touch.keys.find((e) => e.type == "joystick");
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
      game.keys["w"] ||
      game.keys["arrowup"] ||
      game.keys["s"] ||
      game.keys["arrowdown"] ||
      game.keys["a"] ||
      game.keys["arrowleft"] ||
      game.keys["d"] ||
      game.keys["arrowright"] ||
      game.touch.isDown
    ) {
      this.path = [];
      this.curr = 0;
    }
    if (game.keys["p"]) {
      delete game.keys["p"];
      game.camera.setZoom(game.camera.z == 1 ? 0.7 : 1);
    }
    if (game.keys["shift"]) this.speed = this.minSpeed * 1.5;
    else this.speed = this.minSpeed;
    this.xVel *= this.friction;
    this.yVel *= this.friction;

    // if (this.mouse.clicked) {
    // 	this.mouse.clicked = false;
    // 	const dx = Math.floor((this.mouse.x + game.camera.x) / game.map.tsize);
    // 	const dy = Math.floor((this.mouse.y + game.camera.y) / game.map.tsize);
    // 	if (dx >= 0 && dy >= 0 && dx < game.map.w && dy < game.map.h && game.stats.dontCollide.includes(game.map.map.scenery[dy][dx]) && game.stats.dontCollide.includes(game.map.map.structure[dy][dx])) {
    // 		this.path = await game.map.pathTo(Math.floor(this.x / game.map.tsize), Math.floor(this.y / game.map.tsize), dx, dy);
    // 		this.x = Math.floor(this.x / game.map.tsize) * game.map.tsize;
    // 		this.y = Math.floor(this.y / game.map.tsize) * game.map.tsize;
    // 	}
    // }

    if (this.path.length > 0) {
      const dx = this.path[this.curr].y;
      const dy = this.path[this.curr].x;
      this.xVel = this.yVel = 0;
      if (
        dx == this.x.toFixed(1) / game.map.tsize &&
        dy == this.y.toFixed(1) / game.map.tsize
      )
        this.curr++;
      if (this.curr >= this.path.length) {
        this.path = [];
        this.curr = 0;
      } else {
        const x = this.x / game.map.tsize;
        const y = this.y / game.map.tsize;
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

export default Player;
