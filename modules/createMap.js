const GameMap = require("./map");

module.exports = (opts) => {
	const map = new GameMap(opts);
	map.addLayer("ground");
	map.addLayer("scenery");
	map.addLayer("structure");
	map.updateLayers();
	map.addScenery();
	map.updateGraph();
	return map;
};