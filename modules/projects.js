const createMap = require("./createMap");
const stats = require("./stats");
const fs = require("fs");
const f = "../projects";
if (!fs.existsSync(f)) fs.mkdirSync(f);

const projects = {
	async get(author, project) {
		const p = `${f}/${author}/${project}.json`;
		const e = fs.existsSync(p);
		if (!e) return {
			exists: false,
			stats,
		};
		const data = JSON.parse(fs.readFileSync(p, "utf8"));
		data.exists = true;
		return data;
	},
	async make(author, project) {
		console.log(`Making project ${author}/${project}`);
		const p = `${f}/${author}/${project}.json`;
		if (fs.existsSync(p)) return;
		fs.mkdirSync(`${f}/${author}`);
		fs.writeFileSync(p, JSON.stringify({
			map: createMap(),
			// stats,
		}));
	},	
};

module.exports = projects;