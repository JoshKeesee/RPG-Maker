import game from "./game.js";

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
      if (
        this.toggled &&
        Math.abs(x - this.touchSX) <= 5 &&
        Math.abs(y - this.touchSY) <= 5
      )
        this.c();
      this.touchX = x;
      this.touchY = y;
    });
    document.addEventListener(
      "visibilitychange",
      (e) => e.target.hidden && this.toggled && this.toggle(),
    );
  }
  toggle() {
    this.toggled = !this.toggled;
    if (this.toggled) {
      if (document.pointerLockElement != game.c)
        game.c.requestPointerLock().catch(() => {});
      game.camera.setZoom(0.7);
    } else {
      if (document.pointerLockElement == game.c) document.exitPointerLock();
      game.camera.setZoom(1);
      if (this.mapChanges.length > 0)
        game.socket.emit("map-update", this.mapChanges);
    }
    this.click = false;
    this.clicks = 0;
    this.p = this.mapChanges = [];
  }
  setTile(l, x, y, id) {
    game.map.map[l][y][x] = id;
    this.mapChanges.push({ l, x, y, id });
    game.map.graphUpdated = false;
    if (l != "scenery") this.setTile("scenery", x, y, -1);
    if (l == "ground") this.setTile("ground2", x, y, -1);
  }
  run() {
    if (!this.toggled) return;
    if (game.keys["escape"]) return this.toggle();
    if (game.keys["w"] || game.keys["arrowup"]) game.camera.y -= 10;
    if (game.keys["s"] || game.keys["arrowdown"]) game.camera.y += 10;
    if (game.keys["a"] || game.keys["arrowleft"]) game.camera.x -= 10;
    if (game.keys["d"] || game.keys["arrowright"]) game.camera.x += 10;
    if (game.keys["p"]) {
      delete game.keys["p"];
      this.path = !this.path;
      this.box = false;
    }
    if (game.keys["o"]) {
      delete game.keys["o"];
      this.box = !this.box;
      this.path = false;
    }
    if (game.keys["i"]) {
      delete game.keys["i"];
      this.autotiling = !this.autotiling;
    }
    this.checkSlot();

    if (game.map.w == 0 || game.map.h == 0) return;

    const dx = Math.max(
      0,
      Math.min(
        game.map.w - 1,
        Math.floor((game.camera.dx + game.c.width / 2) / game.map.tsize),
      ),
    );
    const dy = Math.max(
      0,
      Math.min(
        game.map.h - 1,
        Math.floor((game.camera.dy + game.c.height / 2) / game.map.tsize),
      ),
    );

    game.ctx.globalAlpha = 0.5;
    game.ctx.fillStyle = "black";

    const n = {
      img: game.images["tilemap"],
      id: this.selected,
      x: dx * game.map.tsize,
      y: dy * game.map.tsize,
      w: game.map.tsize,
      h: game.map.tsize,
      cut: game.map.tilemap,
    };

    const p = [game.map.graph.grid[this.pathSY][this.pathSX]].concat(this.p);

    if (this.p.length > 0) {
      const positionsHit = [];
      p.forEach((c, i) => {
        const j = i == 0 ? i + 1 : i - 1;
        for (let k = 0; k < this.pathWidth; k++) {
          n.x = c.y * game.map.tsize;
          n.y = c.x * game.map.tsize;
          if (Math.abs(p[j].x - c.x) != 0) n.x += game.map.tsize * k;
          if (Math.abs(p[j].y - c.y) != 0) n.y += game.map.tsize * k;
          if (
            !(
              n.x < 0 ||
              n.y < 0 ||
              n.x >= game.map.w * game.map.tsize ||
              n.y >= game.map.h * game.map.tsize
            ) &&
            !positionsHit.includes({ x: n.x, y: n.y })
          )
            this.drawImg(n);
          positionsHit.push({ x: n.x, y: n.y });
        }
      });
    } else if (
      this.box &&
      game.stats.boxTiles[this.selected] &&
      this.clicks == 1
    ) {
      const sx = Math.min(this.pathSX, this.pathEX);
      const sy = Math.min(this.pathSY, this.pathEY);
      const ex = Math.max(this.pathSX, this.pathEX);
      const ey = Math.max(this.pathSY, this.pathEY);
      for (let x = sx; x <= ex; x++) {
        for (let y = sy; y <= ey; y++) {
          if (
            game.stats.boxTiles[this.selected] == "on" ||
            x == this.pathSX ||
            x == this.pathEX ||
            y == this.pathSY ||
            y == this.pathEY
          ) {
            n.x = x * game.map.tsize;
            n.y = y * game.map.tsize;
            if (
              !(
                n.x < 0 ||
                n.y < 0 ||
                n.x >= game.map.w * game.map.tsize ||
                n.y >= game.map.h * game.map.tsize
              )
            )
              this.drawImg(n);
          }
        }
      }
    } else if (game.stats.structures[this.selected]) {
      const s = game.stats.structures[this.selected];
      if (s.animate) n.id += s.w * s.h * game.frame;
      for (let i = 0; i < s.h; i++) {
        for (let j = 0; j < s.w; j++) {
          n.x = dx * game.map.tsize + j * game.map.tsize;
          n.y = dy * game.map.tsize + i * game.map.tsize;
          this.drawImg(n);
          n.id++;
        }
      }
    } else {
      let a = false;
      game.stats.animateTiles.includes(n.id) && (a = true);
      if (n.id / 1000 >= 1) {
        n.id /= 1000;
        n.img = game.images["items"];
        n.cut = game.map.items;
      }
      a && (n.id += game.frame);
      if (n.id == 999) game.ctx.fillRect(n.x, n.y, n.w, n.h);
      else this.drawImg(n);
    }

    if (this.click) this.c();
  }
  c() {
    this.click = false;
    const dx = Math.max(
      0,
      Math.min(
        game.map.w - 1,
        Math.floor((game.camera.dx + game.c.width / 2) / game.map.tsize),
      ),
    );
    const dy = Math.max(
      0,
      Math.min(
        game.map.h - 1,
        Math.floor((game.camera.dy + game.c.height / 2) / game.map.tsize),
      ),
    );
    const p = [game.map.graph.grid[this.pathSY][this.pathSX]].concat(this.p);
    if (
      !(this.path && game.stats.pathTiles[this.selected]) &&
      !(this.box && game.stats.boxTiles[this.selected])
    ) {
      if (game.stats.structures[this.selected]) {
        const s = game.stats.structures[this.selected];
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
            if (!(x < 0 || y < 0 || x >= game.map.w || y >= game.map.h)) {
              const t = this.autotiling
                ? this.getAutotile(x, y, this.selected, this.selected)
                : this.selected;
              this.checkStructure(x, y);
              this.setTile(this.layer, x, y, t);
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
              game.stats.boxTiles[this.selected] == "on" ||
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
    if (game.map.map[l][dy][dx] == -1) l = "scenery";
    n = game.map.map[l][dy][dx];
    const s = Object.keys(game.stats.childrenTiles).find((k) =>
      game.stats.childrenTiles[k].includes(n),
    );
    if (s) {
      const tl = game.stats.structures[s];
      const i = game.stats.childrenTiles[s].indexOf(n);
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
    game.ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  drawCenter() {
    game.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    game.ctx.arc(game.c.width / 2, game.c.height / 2, 10, 0, Math.PI * 2);
    game.ctx.fill();
  }
  checkSlot() {
    let curr;
    const n = Object.keys(game.keys).filter((k) =>
      [1, 2, 3, 4, 5, 6, 7, 8].includes(parseInt(k)),
    );
    if (n.length == 1) curr = parseInt(n[0]) - 1;
    else return;
    delete game.keys[n[0]];
    let tiles = game.stats.tileKey[curr];
    if (this.autotiling)
      tiles = tiles.filter(
        (e) =>
          !Object.values(game.stats.autotilingSets).flat().includes(e) ||
          game.stats.autotilingMap[e],
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
    if (game.stats.layers.ground.includes(this.selected)) this.layer = "ground";
    if (game.stats.layers.scenery.includes(this.selected))
      this.layer = "scenery";
    if (game.stats.layers.ground2.includes(this.selected))
      this.layer = "ground2";
    // if (this.selected == 40 || this.selected == 76 || curr == 0 || curr == 1)
    //   this.layer = "ground";
    // if (this.selected == 132 || this.selected == 134 || this.selected == 192)
    //   this.layer = "scenery";
  }
  getAutotile(x, y, d, e) {
    const l = this.layer;
    const curr = game.stats.autotilingMap[e];
    if (!curr) return d;
    const tiles = game.stats.autotilingSets[curr];
    if (!tiles.includes(d) || x > game.map.w || y > game.map.h) return d;
    let str = "";
    str += tiles.includes(game.map.map[l][y - 1][x]) ? curr : 0;
    str += tiles.includes(game.map.map[l][y][x - 1]) ? curr : 0;
    str += tiles.includes(game.map.map[l][y + 1][x]) ? curr : 0;
    str += tiles.includes(game.map.map[l][y][x + 1]) ? curr : 0;
    return game.stats.autotilingRecipes[str] || d;
  }
  updateAutotiling(x, y, e) {
    const l = this.layer;
    if (y - 1 >= 0)
      this.setTile(
        l,
        x,
        y - 1,
        this.getAutotile(x, y - 1, game.map.map[l][y - 1][x], e),
      );
    if (x - 1 >= 0)
      this.setTile(
        l,
        x - 1,
        y,
        this.getAutotile(x - 1, y, game.map.map[l][y][x - 1], e),
      );
    if (y + 1 < game.map.h)
      this.setTile(
        l,
        x,
        y + 1,
        this.getAutotile(x, y + 1, game.map.map[l][y + 1][x], e),
      );
    if (x + 1 < game.map.w)
      this.setTile(
        l,
        x + 1,
        y,
        this.getAutotile(x + 1, y, game.map.map[l][y][x + 1], e),
      );
  }
  updateData() {
    let mt = 100,
      size = 15;
    game.ctx.globalAlpha = "1.0";
    game.ctx.fillStyle = "black";
    game.ctx.fillRect(0, mt - size / 2, 130, size * 11 - size / 2);
    game.ctx.fillStyle = "white";
    game.ctx.font = size + "px Arial";
    const dx = Math.max(
      0,
      Math.min(
        game.map.w - 1,
        Math.floor((game.camera.dx + game.c.width / 2) / game.map.tsize),
      ),
    );
    const dy = Math.max(
      0,
      Math.min(
        game.map.h - 1,
        Math.floor((game.camera.dy + game.c.height / 2) / game.map.tsize),
      ),
    );
    game.ctx.fillText("Layer: " + this.layer, 10, mt + size * 1);
    game.ctx.fillText("Selected: " + this.selected, 10, mt + size * 2);
    game.ctx.fillText("X: " + dx, 10, mt + size * 3);
    game.ctx.fillText("Y: " + dy, 10, mt + size * 4);
    game.ctx.fillText("Click: " + game.player.mouse.clicked, 10, mt + size * 5);
    game.ctx.fillText("Autotiling: " + this.autotiling, 10, mt + size * 6);
    game.ctx.fillText("Box: " + this.box, 10, mt + size * 7);
    game.ctx.fillText("Path: " + this.path, 10, mt + size * 8);
    game.ctx.fillText("Path Width: " + this.pathWidth, 10, mt + size * 9);
  }
  async updateMouse(e) {
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

    game.camera.x += x / game.camera.dz;
    game.camera.y += y / game.camera.dz;

    const dx = Math.max(
      0,
      Math.min(
        game.map.w - 1,
        Math.floor((game.camera.dx + game.c.width / 2) / game.map.tsize),
      ),
    );
    const dy = Math.max(
      0,
      Math.min(
        game.map.h - 1,
        Math.floor((game.camera.dy + game.c.height / 2) / game.map.tsize),
      ),
    );

    if (!this.path) this.p = [];

    if (this.path && game.stats.pathTiles[this.selected]) {
      this.pathWidth = game.stats.pathTiles[this.selected];
      if (this.clicks == 1) {
        if (dx == this.pathEX && dy == this.pathEY) return;
        if (!game.stats.dontCollide.includes(game.map.map.scenery[dy][dx]))
          return;
        this.pathEX = dx;
        this.pathEY = dy;
        this.p = await game.map.pathTo(
          this.pathSX,
          this.pathSY,
          this.pathEX,
          this.pathEY,
        );
      }
    } else if (this.box && game.stats.boxTiles[this.selected]) {
      if (this.clicks == 1) {
        if (dx == this.pathEX && dy == this.pathEY) return;
        this.pathEX = dx;
        this.pathEY = dy;
      }
    }
  }
}

export default Editor;
