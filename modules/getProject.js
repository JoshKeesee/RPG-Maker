const defaultStats = require("./stats");
const fs = require("fs");
const projectsFolder = "../projects";

project = {
	get(author, project) {
		const p = `${projectsFolder}/${author}/${project}.json`;
		if (!fs.existsSync(p)) return {
			exists: false,
			stats: defaultStats,
		};
		const data = JSON.parse(fs.readFileSync(p, "utf8"));
		return {
			exists: true,
			map: data.map,
			// {
			// 	w: map.w,
			// 	h: map.h,
			// 	tsize: map.tsize,
			// 	tilemap: map.tilemap,
			// 	items: map.items,
			// 	map: map.map,
			// },
			stats: data.stats || defaultStats,
			...data,
		};
	},
	make(author, project, data) {
		const p = `${projectsFolder}/${author}/${project}.json`;
		if (fs.existsSync(p)) return false;
		fs.mkdirSync(`${projectsFolder}/${author}`, { recursive: true });
		fs.writeFileSync(p, JSON.stringify(data);
		return true;
	},	
});