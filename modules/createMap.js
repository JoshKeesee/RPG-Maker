const GameMap = require("./map");
const stats = require("./stats");

module.exports = (opts) => {
  const map = new GameMap(opts);
  Object.keys(stats.layers).forEach((l) => map.addLayer(l));
  map.updateLayers();
  map.addScenery();
  map.updateGraph();
  return map;
};
