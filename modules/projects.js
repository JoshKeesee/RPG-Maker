const obj = require("./obj");
const GameMap = require("./map");
const createMap = require("./createMap");
const parseMap = require("./parseMap");
const stats = require("./stats");
const fs = require("fs");
const ext = ".world";
const f = __dirname + "/../projects";
if (!fs.existsSync(f)) fs.mkdirSync(f);

const projects = {
  getAllProjects(author) {
    if (author) {
      const p = `${f}/${author}`;
      if (!fs.existsSync(p)) return [];
      return fs.readdirSync(p).map((v) => v.replace(ext, ""));
    }
    const p = fs.readdirSync(f);
    const r = {};
    p.forEach((v) => {
      const d = fs.readdirSync(`${f}/${v}`);
      r[v] = d.map((v) => v.replace(ext, ""));
    });
    return r;
  },
  async get(author, project, extras = {}) {
    const p = `${f}/${author}/${project}${ext}`;
    const e = fs.existsSync(p);
    if (!e)
      return {
        exists: false,
        stats,
        ...extras,
      };
    const data = await obj.decompress(fs.readFileSync(p, "utf8"));
    data.exists = true;
    Object.keys(extras).forEach((k) => (data[k] = extras[k]));
		data.map.map = await (new GameMap()).decompress(data.map.map, data.map.w, data.map.h, data.map.l);
    return data;
  },
  async make(author, project) {
    console.log(`Making project ${author}/${project}`);
    const p = `${f}/${author}/${project}${ext}`;
    if (fs.existsSync(p)) return;
    if (!fs.existsSync(`${f}/${author}`)) fs.mkdirSync(`${f}/${author}`);
    const m = createMap();
    const pm = parseMap(m);
    pm.map = await (new GameMap()).compress(pm.map);
    const data = {
      map: pm,
      stats,
    };
    fs.writeFileSync(p, await obj.compress(data));
    data.map = parseMap(m);
    return data;
  },
  async delete(author, project) {
    const p = `${f}/${author}/${project}${ext}`;
    if (!fs.existsSync(p)) return;
    fs.unlinkSync(p);
  },
  async save(author, project, data) {
    const p = `${f}/${author}/${project}${ext}`;
    if (!fs.existsSync(p)) return;
    const d = await this.get(author, project);
    if (!d.exists) return;
    const pm = new GameMap();
    pm.loadMap(d.map);
    Object.keys(data).forEach((k) => {
      if (k == "mapChanges") data[k].forEach((v) => pm.setTile(v.l, v.x, v.y, v.id));
      else d[k] = data[k];
    });
    d.map.map = await pm.compress();
    fs.writeFileSync(p, await obj.compress(d));
  }
};

module.exports = projects;
