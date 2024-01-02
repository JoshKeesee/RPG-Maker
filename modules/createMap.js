const Map = require("./map");

module.exports = (opts) => {
	const map = new Map(opts);
	map.addLayer("ground");
	map.addLayer("scenery");
	map.addLayer("structure");
	map.updateLayers();
	map.addScenery();
	map.updateGraph();
	return map;
};