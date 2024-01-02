const createMap = require("./createMap");
const stats = require("./stats");
const fs = require("fs");
const f = __dirname + "/../projects";
if (!fs.existsSync(f)) fs.mkdirSync(f);

const projects = {
	async get(author, project, extras = {}) {
		const p = `${f}/${author}/${project}.json`;
		const e = fs.existsSync(p);
		if (!e) return {
			exists: false,
			stats,
			...extras,
		};
		const data = JSON.parse(fs.readFileSync(p, "utf8"));
		data.exists = true;
		Object.keys(extras).forEach(k => data[k] = extras[k]);
		return data;
	},
	async make(author, project) {
		console.log(`Making project ${author}/${project}`);
		const p = `${f}/${author}/${project}.json`;
		if (fs.existsSync(p)) return;
		if (!fs.existsSync(`${f}/${author}`)) fs.mkdirSync(`${f}/${author}`);
		const m = createMap();
		fs.writeFileSync(p, JSON.stringify({
			map: {
				w: m.w,
				h: m.h,
				tsize: m.tsize,
				tilemap: m.tilemap,
				items: m.items,
				map: m.map,
			},
			stats,
		}));
	},
	async delete(author, project) {
		const p = `${f}/${author}/${project}.json`;
		if (!fs.existsSync(p)) return;
		fs.unlinkSync(p);
	},
};

module.exports = projects;