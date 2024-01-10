import game from "./game.js";
import "./astar.js";

class GameMap {
  constructor() {
    this.loading = false;
    this.loadingMax = 200;
    this.loadingProgress = 0;
    this.loadingTime = 2;
    this.loadingInfo = [];
    this.w = 500;
    this.h = 500;
    this.tsize = 80;
    this.graphUpdated = false;
    this.map = {};
    this.tilemap = {
      width: 25,
      height: 9,
      tsize: 80,
    };
    this.items = {
      width: 10,
      height: 9,
      tsize: 80,
    };
  }
  drawLayers(ls, s) {
    if (!Object.keys(this.map).length) return;
    const start = (v, v2, v3) =>
      Math.max(
        0,
        Math.min(
          Math.floor((v - (v2 / 2 / game.camera.dz - v2 / 2)) / this.tsize) - 1,
          v3 - 1,
        ),
      );
    const end = (v, v2, v3) =>
      Math.min(
        v3,
        Math.ceil((v + v2 + (v2 / 2 / game.camera.dz - v2 / 2)) / this.tsize) + 1,
      );
    const sx = start(game.camera.dx, game.c.width, this.w);
    const ex = end(game.camera.dx, game.c.width, this.w);
    const sy = start(game.camera.dy, game.c.height, this.h);
    const ey = end(game.camera.dy, game.c.height, this.h);

    const playersDrawn = [];

    ls.forEach((l) => {
      if (l != "ground") this.drawShadows(sx, sy, ex, ey, l);
      for (let i = sy; i < ey; i++) {
        for (let j = sx; j < ex; j++) {
          const dp = Object.keys(game.players).find((k) => {
            const p = game.players[k];
            return (
              Math.floor(p.x / this.tsize) == j &&
              Math.floor((p.y + p.height) / this.tsize) == i &&
              !playersDrawn.includes(k)
            );
          });
          if (dp && l == s) game.drawPlayer(game.players[dp]);
          if (this.map[l][i][j] != -1) {
            if (this.map[l][i][j] == 999)
              game.ctx.clearRect(
                j * this.tsize,
                i * this.tsize,
                this.tsize,
                this.tsize,
              );
            else {
              let t = this.map[l][i][j],
                a = false,
                img = game.images["tilemap"],
                cut = this.tilemap;
              if (game.stats.animateTiles.includes(t)) a = true;
              if (t / 1000 >= 1) {
                t /= 1000;
                img = game.images["items"];
                cut = this.items;
              }
              const s =
                game.stats.structures[
                  Object.keys(game.stats.childrenTiles).find((k) =>
                    game.stats.childrenTiles[k].includes(t),
                  )
                ];
              !s && a && (t += game.frame);
              if (s?.animate) t += s.w * s.h * game.frame;
              game.ctx.drawImage(
                img,
                (t % cut.width) * cut.tsize,
                Math.floor(t / cut.width) * cut.tsize,
                cut.tsize,
                cut.tsize,
                j * this.tsize,
                i * this.tsize,
                this.tsize,
                this.tsize,
              );
            }
          }
        }
      }
    });
  }
  drawShadows(sx, sy, ex, ey, l) {
    const coords = [];
    for (let i = sy; i < ey; i++) {
        for (let j = sx; j < ex; j++) {
            if (this.map[l][i][j] > -1) coords.push([j, i, this.map[l][i][j]]);
        }
    }
    let ly = -1;
    const setupShadow = (y, i) => {
        game.ctx.save();
        game.ctx.globalCompositeOperation = "multiply";
        game.ctx.globalAlpha = 0.7;
        const a = game.time;
        game.ctx.transform(1, 0, -a, 1, (this.tsize * (y + 1) + i * this.tsize) * a, 0);
        ly = y;
    };
    setupShadow(ly);
    const ct = game.stats.childrenTiles, st = game.stats.structures;
    coords.forEach((c) => {
        const [x, y] = c;
        let t = c[2];
        if (y > ly) {
            game.ctx.restore();
            let i = 0;
            if (l == "structure") Object.keys(ct).every((k) => {
                if (ct[k].includes(t)) {
                    i = st[k].h - 1 - Math.floor(ct[k].indexOf(t) / st[k].w);
                    return false;
                }
                return true;
            });
            setupShadow(y, i);
        }
        let a = false,
            img = game.images["tilemap"],
            cut = this.tilemap;
        if (game.stats.animateTiles.includes(t)) a = true;
        if (t / 1000 >= 1) {
            t /= 1000;
            img = game.images["items"];
            cut = this.items;
        }
        const s = st[Object.keys(ct).find((k) => ct[k].includes(t))];
        !s && a && (t += game.frame);
        if (s?.animate) t += s.w * s.h * game.frame;
        this.drawShadow(x, y, t, img, cut);
    });
    game.ctx.restore();
    game.ctx.filter = "none";
  }
  drawShadow(x, y, id, img, cut) {
    game.ctx.drawImage(
      img,
      (id % cut.width) * cut.tsize,
      Math.floor(id / cut.width) * cut.tsize,
      cut.tsize,
      cut.tsize,
      x * this.tsize,
      y * this.tsize,
      this.tsize,
      this.tsize,
    );
  }
  addLayer(l) {
    this.map[l] = [];
  }
  clear() {
    this.map = {};
  }
  async updateLayers() {
    Object.keys(this.map).forEach((l) => {
      for (let i = 0; i < this.h; i++) {
        this.map[l].push([]);
        for (let j = 0; j < this.w; j++) {
          this.map[l][i].push(l == "ground" ? 0 : -1);
        }
      }
    });
  }
  async addScenery() {
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        if (Math.random() < 0.1 && this.map.scenery[i][j] == -1) {
          this.map.scenery[i][j] =
            game.stats.tileKey[3][
              Math.floor(Math.random() * game.stats.tileKey[3].length)
            ];
        }
      }
    }
    const l = "scenery";
    const t = game.stats.tileKey[3][1];
    for (let i = 0; i < this.w; i++) {
      this.map[l][0][i] = t;
      this.map[l][this.h - 1][i] = t;
      this.map[l][i][0] = t;
      this.map[l][i][this.w - 1] = t;
    }
  }
  async generateCave() {
    const t = game.stats.tileKey[1][0],
      g = this.map.ground,
      s = this.map.scenery;
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        s[i][j] = 999;
        g[i][j] = t;
      }
    }
    let x = (y = 0),
      r,
      a,
      l = 999;
    for (let i = 0; i < this.w * this.h; i++) {
      r = Math.floor(Math.random() * 2);
      a = Math.floor(Math.random() * (2 + 1) - 1);
      if (y <= 0 || x <= 0) a = 1;
      if (y >= this.h - 1 || x >= this.w - 1) a = -1;
      if (r == 0) x += a;
      else y += a;
      s[y][x] = Math.floor(Math.random() * 20) == 0 ? l : -1;
    }
    s[0][0] = s[0][1] = s[1][0] = s[1][1] = -1;
  }
  async updateGraph() {
    const sc = this.map.scenery,
      st = this.map.structure;
    const v = [];
    for (let i = 0; i < this.h; i++) {
      v.push([]);
      for (let j = 0; j < this.w; j++)
        v[i].push(
          !game.stats.dontCollide.includes(sc[i][j]) &&
            !game.stats.dontCollide.includes(st[i][j])
            ? 0
            : 1,
        );
    }
    this.graph = new Graph(v);
    this.graphUpdated = true;
  }
  async pathTo(x1, y1, x2, y2, opts = { diagonal: false }) {
    if (!this.graphUpdated) await this.updateGraph();
    const start = this.graph.grid[y1][x1];
    const end = this.graph.grid[y2][x2];
    this.graph.diagonal = opts.diagonal;
    const p = astar.search(this.graph, start, end, opts);
    this.graph.diagonal = false;
    return p;
  }
  loadMap(map) {
    if (!map) return;
    this.loading = true;
    this.w = map.w;
    this.h = map.h;
    this.tsize = map.tsize || this.tsize;
    this.tilemap = map.tilemap || this.tilemap;
    this.items = map.items || this.items;
    this.graphUpdated = false;
    this.loadingProgress = 0;
    const m = map.map ? map.map : map;
    const keys = Object.keys(m);
    keys.forEach((l, k) => {
      this.map[l] = [];
      for (let i = 0; i < this.h; i++) {
        this.map[l].push([]);
        for (let j = 0; j < this.w; j++) {
          this.map[l][i].push(m[l][i][j]);
					setTimeout(() => {
						this.loadingProgress +=
							this.loadingMax / (keys.length * this.w * this.h);
						const t = `Loading ${l} layer (${k + 1}/${keys.length})`;
						const last = this.loadingInfo[this.loadingInfo.length - 1];
						if (last != t) {
							this.loadingInfo.pop();
							this.loadingInfo.push(last.replace("Loading", "Loaded"));
							this.loadingInfo.push(t);
						}
					}, 1);
        }
      }
    });
    if (map.w == 0 || map.h == 0) return this.loadingProgress = this.loadingMax;
  }
}

export default GameMap;