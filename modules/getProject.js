const defaultStats = require("./stats");
const fs = require("fs");
const pf = "../projects";
if (!fs.existsSync(pf)) fs.mkdirSync(pf);

project = {
	get(author, project) {
		const p = `${pf}/${author}/${project}.json`;
		/* if (!fs.existsSync(p)) */ return {
			exists: false,
			stats: defaultStats,
		};
		const data = JSON.parse(fs.readFileSync(p, "utf8"));
		data.exists = true;
		return data;
	},
	make(author, project, data) {
		const p = `${pf}/${author}/${project}.json`;
		if (fs.existsSync(p)) return false;
		fs.mkdirSync(`${pf}/${author}`, { recursive: true });
		fs.writeFileSync(p, JSON.stringify(data);
		return true;
	},	
});