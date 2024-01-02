import { camera } from "./camera.js";
import { keys } from "./player.js";
import { map } from "./map.js";
import { ctx, player, c, socket, frame, stats } from "./game.js";
import images from "./images.js";

class Editor {
  constructor(c) {
    this.toggled = false;
    this.selected = 0;
    this.tileIndex = 0;
    this.layer = "ground";
    this.click = false;
    this.autotiling = false;
    this.box = false;
    this.path = false;
    this.pathWidth = 2;
    this.p = [];
    this.pathSX = 0;
    this.pathSY = 0;
    this.pathEX = 0;
    this.pathEY = 0;
    this.clicks = 0;
    this.touchX = 0;
    this.touchY = 0;
    this.touchSX = 0;
    this.touchSY = 0;
    this.mapChanges = [];

    c.addEventListener("mousemove", (e) => this.updateMouse(e));
    c.addEventListener("touchmove", (e) => this.updateMouse(e));
    c.addEventListener("mousedown", (e) =>
      this.toggled ? (this.click = true) : "",
    );
    c.addEventListener("mouseup", (e) =>
      this.toggled ? (this.click = false) : "",
    );
    c.addEventListener("touchstart", (e) => {
      this.touchX = this.touchSX = Math.floor(e.touches[0].clientX) || 0;
      this.touchY = this.touchSY = Math.floor(e.touches[0].clientY) || 0;
    });
    c.addEventListener("touchend", (e) => {
      const x = Math.floor(e.changedTouches[0].clientX) || 0;
      const y = Math.floor(e.changedTouches[0].clientY) || 0;
      if (Math.abs(x - this.touchSX) <= 5 && Math.abs(y - this.touchSY) <= 5)
        this.c();
      this.touchX = x;
      this.touchY = y;
    });
  }
  toggle() {
    this.toggled = !this.toggled;
    if (this.toggled) camera.setZoom(0.7);
    else {
      camera.setZoom(1);
      if (this.mapChanges.length > 0)
        socket.emit("map-update", this.mapChanges);
    }
    this.click = false;
    this.clicks = 0;
    this.p = this.mapChanges = [];
  }
  setTile(l, x, y, id) {
    map.map[l][y][x] = id;
    this.mapChanges.push({ l, x, y, id });
    map.graphUpdated = false;
  }
  run() {
    if (document.pointerLockElement == c && !this.toggled)
      document.exitPointerLock();
    if (!this.toggled) return;
    if (document.pointerLockElement != c)
      c.requestPointerLock()
        .then(() => {})
        .catch(() => {});
    if (keys["w"] || keys["arrowup"]) camera.y -= 10;
    if (keys["s"] || keys["arrowdown"]) camera.y += 10;
    if (keys["a"] || keys["arrowleft"]) camera.x -= 10;
    if (keys["d"] || keys["arrowright"]) camera.x += 10;
    if (keys["p"]) {
      delete keys["p"];
      this.path = !this.path;
      this.box = false;
    }
    if (keys["o"]) {
      delete keys["o"];
      this.box = !this.box;
      this.path = false;
    }
    if (keys["i"]) {
      delete keys["i"];
      this.autotiling = !this.autotiling;
    }
    this.checkSlot();

    const dx = Math.max(
      0,
      Math.min(map.w - 1, Math.floor((camera.dx + c.width / 2) / map.tsize)),
    );
    const dy = Math.max(
      0,
      Math.min(map.h - 1, Math.floor((camera.dy + c.height / 2) / map.tsize)),
    );

    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "black";

    const n = {
      img: images["tilemap"],
      id: this.selected,
      x: dx * map.tsize,
      y: dy * map.tsize,
      w: map.tsize,
      h: map.tsize,
      cut: map.tilemap,
    };

    const p = [map.graph.grid[this.pathSY][this.pathSX]].concat(this.p);

    if (this.p.length > 0) {
      const positionsHit = [];
      p.forEach((c, i) => {
        const j = i == 0 ? i + 1 : i - 1;
        for (let k = 0; k < this.pathWidth; k++) {
          n.x = c.y * map.tsize;
          n.y = c.x * map.tsize;
          if (Math.abs(p[j].x - c.x) != 0) n.x += map.tsize * k;
          if (Math.abs(p[j].y - c.y) != 0) n.y += map.tsize * k;
          if (
            !(
              n.x < 0 ||
              n.y < 0 ||
              n.x >= map.w * map.tsize ||
              n.y >= map.h * map.tsize
            ) &&
            !positionsHit.includes({ x: n.x, y: n.y })
          )
            this.drawImg(n);
          positionsHit.push({ x: n.x, y: n.y });
        }
      });
    } else if (this.box && stats.boxTiles[this.selected] && this.clicks == 1) {
      const sx = Math.min(this.pathSX, this.pathEX);
      const sy = Math.min(this.pathSY, this.pathEY);
      const ex = Math.max(this.pathSX, this.pathEX);
      const ey = Math.max(this.pathSY, this.pathEY);
      for (let x = sx; x <= ex; x++) {
        for (let y = sy; y <= ey; y++) {
          if (
            stats.boxTiles[this.selected] == "on" ||
            x == this.pathSX ||
            x == this.pathEX ||
            y == this.pathSY ||
            y == this.pathEY
          ) {
            n.x = x * map.tsize;
            n.y = y * map.tsize;
            if (
              !(
                n.x < 0 ||
                n.y < 0 ||
                n.x >= map.w * map.tsize ||
                n.y >= map.h * map.tsize
              )
            )
              this.drawImg(n);
          }
        }
      }
    } else if (stats.structures[this.selected]) {
      const s = stats.structures[this.selected];
      if (s.animate) n.id += s.w * s.h * frame;
      for (let i = 0; i < s.h; i++) {
        for (let j = 0; j < s.w; j++) {
          n.x = dx * map.tsize + j * map.tsize;
          n.y = dy * map.tsize + i * map.tsize;
          this.drawImg(n);
          n.id++;
        }
      }
    } else {
      let a = false;
      stats.animateTiles.includes(n.id) && (a = true);
      if (n.id / 1000 >= 1) {
        n.id /= 1000;
        n.img = images["items"];
        n.cut = map.items;
      }
      a && (n.id += frame);
      if (n.id == 999) ctx.fillRect(n.x, n.y, n.w, n.h);
      else this.drawImg(n);
    }

    if (this.click) this.c();
  }
  c() {
    this.click = false;
    const dx = Math.max(
      0,
      Math.min(map.w - 1, Math.floor((camera.dx + c.width / 2) / map.tsize)),
    );
    const dy = Math.max(
      0,
      Math.min(map.h - 1, Math.floor((camera.dy + c.height / 2) / map.tsize)),
    );
    const p = [map.graph.grid[this.pathSY][this.pathSX]].concat(this.p);
    if (
      !(this.path && stats.pathTiles[this.selected]) &&
      !(this.box && stats.boxTiles[this.selected])
    ) {
      if (stats.structures[this.selected]) {
        const s = stats.structures[this.selected];
        for (let i = 0; i < s.h; i++) {
          for (let j = 0; j < s.w; j++) {
            this.checkStructure(dx + j, dy + i);
            this.setTile(
              this.layer,
              dx + j,
              dy + i,
              this.selected + i * s.w + j,
            );
          }
        }
      } else {
        const t = this.autotiling
          ? this.getAutotile(dx, dy, this.selected, this.selected)
          : this.selected;
        this.checkStructure(dx, dy);
        this.setTile(this.layer, dx, dy, t);
        if (this.layer == "ground") this.setTile("scenery", dx, dy, -1);
        if (this.autotiling) this.updateAutotiling(dx, dy, this.selected);
      }
    } else if (this.path) {
      this.clicks++;
      if (this.clicks == 1) {
        this.pathSX = this.pathEX = dx;
        this.pathSY = this.pathEY = dy;
      }
      if (this.clicks == 2) {
        this.clicks = 0;
        if (this.pathSX == this.pathEX && this.pathSY == this.pathEY) return;
        p.forEach((c, i) => {
          const j = i == 0 ? i + 1 : i - 1;
          let x, y;
          for (let k = 0; k < this.pathWidth; k++) {
            x = c.y;
            y = c.x;
            if (Math.abs(p[j].x - c.x) != 0) x += k;
            if (Math.abs(p[j].y - c.y) != 0) y += k;
            if (!(x < 0 || y < 0 || x >= map.w || y >= map.h)) {
              const t = this.autotiling
                ? this.getAutotile(x, y, this.selected, this.selected)
                : this.selected;
              this.checkStructure(x, y);
              this.setTile(this.layer, x, y, t);
              if (this.layer == "ground") this.setTile("scenery", x, y, -1);
              if (this.autotiling) this.updateAutotiling(x, y, this.selected);
            }
          }
        });
        this.p = [];
      }
    } else if (this.box) {
      this.clicks++;
      if (this.clicks == 1) {
        this.pathSX = this.pathEX = dx;
        this.pathSY = this.pathEY = dy;
      }
      if (this.clicks == 2) {
        this.clicks = 0;
        if (this.pathSX == this.pathEX && this.pathSY == this.pathEY) return;
        const sx = Math.min(this.pathSX, this.pathEX);
        const sy = Math.min(this.pathSY, this.pathEY);
        const ex = Math.max(this.pathSX, this.pathEX);
        const ey = Math.max(this.pathSY, this.pathEY);
        for (let x = sx; x <= ex; x++) {
          for (let y = sy; y <= ey; y++) {
            if (
              stats.boxTiles[this.selected] == "on" ||
              x == this.pathSX ||
              x == this.pathEX ||
              y == this.pathSY ||
              y == this.pathEY
            ) {
              const t = this.autotiling
                ? this.getAutotile(x, y, this.selected, this.selected)
                : this.selected;
              this.checkStructure(x, y);
              this.setTile(this.layer, x, y, t);
              if (this.layer == "ground") this.setTile("scenery", x, y, -1);
              if (this.autotiling) this.updateAutotiling(x, y, this.selected);
            }
          }
        }
      }
    }
  }
  checkStructure(dx, dy) {
    let l = "structure";
    let n;
    if (map.map[l][dy][dx] == -1) l = "scenery";
    n = map.map[l][dy][dx];
    const s = Object.keys(stats.childrenTiles).find((k) =>
      stats.childrenTiles[k].includes(n),
    );
    if (s) {
      const tl = stats.structures[s];
      const i = stats.childrenTiles[s].indexOf(n);
      const sx = dx - (i % tl.w);
      const sy = dy - Math.floor(i / tl.w);
      for (let j = 0; j < tl.h; j++) {
        for (let k = 0; k < tl.w; k++) {
          this.setTile(l, sx + k, sy + j, -1);
        }
      }
    }
  }
  drawImg({ img, id, x, y, w, h, cut }) {
    const sx = (id % cut.width) * cut.tsize,
      sy = Math.floor(id / cut.width) * cut.tsize,
      sw = cut.tsize,
      sh = cut.tsize;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  drawCenter() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.arc(c.width / 2, c.height / 2, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  checkSlot() {
    let curr;
    const n = Object.keys(keys).filter((k) =>
      [1, 2, 3, 4, 5, 6, 7, 8].includes(parseInt(k)),
    );
    if (n.length == 1) curr = parseInt(n[0]) - 1;
    else return;
    delete keys[n[0]];
    let tiles = stats.tileKey[curr];
    if (this.autotiling)
      tiles = tiles.filter(
        (e) =>
          !Object.values(stats.autotilingSets).flat().includes(e) ||
          stats.autotilingMap[e],
      );
    if (
      this.selected != tiles[this.tileIndex] ||
      this.tileIndex >= tiles.length - 1
    )
      this.tileIndex = 0;
    else this.tileIndex++;
    this.selected = tiles[this.tileIndex];
    this.layer = "scenery";
    if (curr == 6) this.layer = "structure";
    if (this.selected == 40 || this.selected == 76 || curr == 0 || curr == 1)
      this.layer = "ground";
    if (this.selected == 132 || this.selected == 134 || this.selected == 192)
      this.layer = "scenery";
  }
  getAutotile(x, y, d, e) {
    const l = this.layer;
    const curr = stats.autotilingMap[e];
    if (!curr) return d;
    const tiles = stats.autotilingSets[curr];
    if (!tiles.includes(d) || x > map.w || y > map.h) return d;
    let str = "";
    str += tiles.includes(map.map[l][y - 1][x]) ? curr : 0;
    str += tiles.includes(map.map[l][y][x - 1]) ? curr : 0;
    str += tiles.includes(map.map[l][y + 1][x]) ? curr : 0;
    str += tiles.includes(map.map[l][y][x + 1]) ? curr : 0;
    return stats.autotilingRecipes[str] || d;
  }
  updateAutotiling(x, y, e) {
    const l = this.layer;
    if (y - 1 >= 0)
      this.setTile(
        l,
        x,
        y - 1,
        this.getAutotile(x, y - 1, map.map[l][y - 1][x], e),
      );
    if (x - 1 >= 0)
      this.setTile(
        l,
        x - 1,
        y,
        this.getAutotile(x - 1, y, map.map[l][y][x - 1], e),
      );
    if (y + 1 < map.h)
      this.setTile(
        l,
        x,
        y + 1,
        this.getAutotile(x, y + 1, map.map[l][y + 1][x], e),
      );
    if (x + 1 < map.w)
      this.setTile(
        l,
        x + 1,
        y,
        this.getAutotile(x + 1, y, map.map[l][y][x + 1], e),
      );
  }
  updateData() {
    let mt = 100,
      size = 15;
    ctx.globalAlpha = "1.0";
    ctx.fillStyle = "black";
    ctx.fillRect(0, mt - size / 2, 130, size * 11 - size / 2);
    ctx.fillStyle = "white";
    ctx.font = size + "px Arial";
    const dx = Math.max(
      0,
      Math.min(map.w - 1, Math.floor((camera.dx + c.width / 2) / map.tsize)),
    );
    const dy = Math.max(
      0,
      Math.min(map.h - 1, Math.floor((camera.dy + c.height / 2) / map.tsize)),
    );
    ctx.fillText("Layer: " + this.layer, 10, mt + size * 1);
    ctx.fillText("Selected: " + this.selected, 10, mt + size * 2);
    ctx.fillText("X: " + dx, 10, mt + size * 3);
    ctx.fillText("Y: " + dy, 10, mt + size * 4);
    ctx.fillText("Click: " + player.mouse.clicked, 10, mt + size * 5);
    ctx.fillText("Autotiling: " + this.autotiling, 10, mt + size * 6);
    ctx.fillText("Box: " + this.box, 10, mt + size * 7);
    ctx.fillText("Path: " + this.path, 10, mt + size * 8);
    ctx.fillText("Path Width: " + this.pathWidth, 10, mt + size * 9);
  }
  updateMouse(e) {
    if (!this.toggled) return;
    e.preventDefault();
    if (!e.touches && !(e.movementX || e.movementY)) return;
    let x = e.movementX;
    let y = e.movementY;

    if (e.touches) {
      x = e.touches[0].clientX - this.touchX || 0;
      y = e.touches[0].clientY - this.touchY || 0;
      this.touchX = e.touches[0].clientX;
      this.touchY = e.touches[0].clientY;
    }

    camera.x += x / camera.dz;
    camera.y += y / camera.dz;

    const dx = Math.max(
      0,
      Math.min(map.w - 1, Math.floor((camera.dx + c.width / 2) / map.tsize)),
    );
    const dy = Math.max(
      0,
      Math.min(map.h - 1, Math.floor((camera.dy + c.height / 2) / map.tsize)),
    );

    if (!this.path) this.p = [];

    if (this.path && stats.pathTiles[this.selected]) {
      this.pathWidth = stats.pathTiles[this.selected];
      if (this.clicks == 1) {
        if (dx == this.pathEX && dy == this.pathEY) return;
        if (!stats.dontCollide.includes(map.map.scenery[dy][dx])) return;
        this.pathEX = dx;
        this.pathEY = dy;
        this.p = map.pathTo(this.pathSX, this.pathSY, this.pathEX, this.pathEY);
      }
    } else if (this.box && stats.boxTiles[this.selected]) {
      if (this.clicks == 1) {
        if (dx == this.pathEX && dy == this.pathEY) return;
        this.pathEX = dx;
        this.pathEY = dy;
      }
    }
  }
}

export default Editor;
