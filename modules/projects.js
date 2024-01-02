const obj = require("./obj");
const Map = require("./map");
const createMap = require("./createMap");
const stats = require("./stats");
const fs = require("fs");
const ext = ".world";
const f = __dirname + "/../projects";
if (!fs.existsSync(f)) fs.mkdirSync(f);

const projects = {
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
		data.map.map = await (new Map()).decompress(data.map.map, data.map.w, data.map.h, data.map.l);
    return data;
  },
  async make(author, project) {
    console.log(`Making project ${author}/${project}`);
    const p = `${f}/${author}/${project}${ext}`;
    if (fs.existsSync(p)) return;
    if (!fs.existsSync(`${f}/${author}`)) fs.mkdirSync(`${f}/${author}`);
    const m = createMap();
    const data = {
      map: {
        w: m.w,
        h: m.h,
        tsize: m.tsize,
        tilemap: m.tilemap,
        items: m.items,
        map: await (new Map()).compress(m.map),
				l: Object.keys(m.map),
      },
      stats,
    };
    fs.writeFileSync(p, await obj.compress(data));
		data.map = m;
    return data;
  },
  async delete(author, project) {
    const p = `${f}/${author}/${project}${ext}`;
    if (!fs.existsSync(p)) return;
    fs.unlinkSync(p);
  },
};

module.exports = projects;
