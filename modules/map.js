const { astar, Graph } = require("../public/js/astar");
const stats = require("./stats");

class Map {
  constructor(opts = {}) {
    this.w = opts.w || 100;
    this.h = opts.h || 100;
    this.tsize = opts.tsize || 80;
    this.graphUpdated = false;
    this.map = {};
    this.tilemap = opts.tilemap || {
      width: 25,
      height: 9,
      tsize: 80,
    };
    this.items = opts.items || {
      width: 10,
      height: 9,
      tsize: 80,
    };
  }
  setTile(l, x, y, id) {
    this.map[l][y][x] = id;
    this.graphUpdated = false;
  }
  addLayer(l) {
    this.map[l] = [];
  }
  updateLayers() {
    Object.keys(this.map).forEach((l) => {
      for (let i = 0; i < this.h; i++) {
        this.map[l].push([]);
        for (let j = 0; j < this.w; j++) {
          this.map[l][i].push(l == "ground" ? 0 : -1);
        }
      }
    });
  }
  addScenery() {
    for (let i = 0; i < this.h; i++) {
      for (let j = 0; j < this.w; j++) {
        if (Math.random() < 0.1 && this.map.scenery[i][j] == -1) {
          this.map.scenery[i][j] =
            stats.tileKey[3][
              Math.floor(Math.random() * stats.tileKey[3].length)
            ];
        }
      }
    }
    const l = "scenery";
    const t = stats.tileKey[3][1];
    for (let i = 0; i < this.w; i++) {
      this.map[l][0][i] = t;
      this.map[l][this.h - 1][i] = t;
      this.map[l][i][0] = t;
      this.map[l][i][this.w - 1] = t;
    }
  }
  generateCave() {
    const t = stats.tileKey[1][0],
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
  updateGraph() {
    const sc = this.map.scenery,
      st = this.map.structure;
    const v = [];
    for (let i = 0; i < this.h; i++) {
      v.push([]);
      for (let j = 0; j < this.w; j++)
        v[i].push(
          !stats.dontCollide.includes(sc[i][j]) &&
            !stats.dontCollide.includes(st[i][j])
            ? 0
            : 1,
        );
    }
    this.graph = new Graph(v);
    this.graphUpdated = true;
  }
  pathTo(x1, y1, x2, y2, opts = { diagonal: false }) {
    if (!this.graphUpdated) this.updateGraph();
    const start = this.graph.grid[y1][x1];
    const end = this.graph.grid[y2][x2];
    this.graph.diagonal = opts.diagonal;
    const p = astar.search(this.graph, start, end, opts);
    this.graph.diagonal = false;
    return p;
  }
  loadMap(map) {
    if (!Object.keys(map).length) return;
    this.w = map.w;
    this.h = map.h;
    this.tsize = map.tsize;
    this.tilemap = map.tilemap;
    this.items = map.items;
    this.graphUpdated = false;
    this.map = map.map;
  }
}

module.exports = Map;
