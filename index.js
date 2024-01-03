const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const getSize = require("./modules/getSize");
const createMap = require("./modules/createMap");
const Map = require("./modules/map");
const projects = require("./modules/projects");

projects.delete("JoshKeesee", "test");

const players = {};
const maps = {};

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  const user = {
    id: socket.id,
    name: "Joshua Keesee",
    username: "JoshKeesee",
  };
  let author, project;
  socket.on("init", ({ author: au, project: pr }, cb) => {
    author = au;
    project = pr;
    if (!players[author]) players[author] = { [project]: {} };
    projects
      .get(author, project, { players: players[author][project] })
      .then(async (d) => {
        if (!d.exists && author == user.username) d = (await projects.make(author, project)) || d;
				if (!d.map) d.map = createMap();
				if (!maps[author]) maps[author] = {};
				if (!maps[author][project]) {
					maps[author][project] = new Map();
					maps[author][project].loadMap(d.map);
				} else {
					const m = maps[author][project];
					d.map = {
						w: m.w,
						h: m.h,
						tsize: m.tsize,
						tilemap: m.tilemap,
						items: m.items,
						map: m.map,
					};
				}
        const ws = getSize(d);
        cb(d, ws);
      });
  });
  socket.on("player-join", (data) => {
		if (!players[author]) players[author] = { [project]: {} };
    let pl = players[author][project];
    if (!pl) pl = players[author][project] = {};
    pl[socket.id] = data;
    socket.broadcast.emit("player-join", data);
  });
  socket.on("player-move", (data) => {
    if (!data) return;
		if (!players[author]) return;
    const pl = players[author][project];
    const player = pl[socket.id];
    Object.keys(data).forEach((k) => (player[k] = data[k]));
    socket.broadcast.emit("player-move", data);
  });
  socket.on("map-update", (data) => {
    if (!data) return;
		if (!maps[author]) return;
		const map = maps[author][project];
    data.forEach((v) => map.setTile(v.l, v.x, v.y, v.id));
    socket.broadcast.emit("map-update", data);
  });
  socket.on("disconnect", () => {
		if (!players[author]) return;
    const pl = players[author][project];
    if (!pl) return;
    delete pl[socket.id];
		if (!Object.keys(pl).length) {
			delete players[author][project];
			delete maps[author][project];
		}
    socket.broadcast.emit("player-disconnect", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
