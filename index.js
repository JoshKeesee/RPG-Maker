const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const getSize = require("./modules/getSize");
const createMap = require("./modules/createMap");
const parseMap = require("./modules/parseMap");
const projects = require("./modules/projects");

const gameLoop = require("./modules/gameLoop");

// projects.delete("JoshKeesee", "test");

const players = {};
const maps = {};
const updateTime = 60000 * 10;

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

io.on("connection", (socket) => {
  const user = {
    id: socket.id,
    name: "Joshua Keesee",
    username: "JoshKeesee",
    author: null,
    project: null,
  };
  socket.on("load-project", ({ author: au, project: pr }, cb) => {
    if (!au || !pr) return cb(null, null, "Invalid author or project");
    user.author = au;
    user.project = pr;
    if (!players[au]) players[au] = { [pr]: {} };
    try {
      projects
        .get(au, pr, { players: players[au][pr] })
        .then(async (d) => {
          if (!maps[au]) maps[au] = {};
          if (!maps[au][pr]) maps[au][pr] = [];
          if (!d.exists) {
            if (au == user.username) d = (await projects.make(au, pr)) || d;
            else return cb(null, null, "Project does not exist");
          }
          d.map = parseMap(d.map || createMap());
          d.mapChanges = maps[au][pr];
          const ws = getSize(d);
          cb(d, ws);
        });
      } catch (e) {
        console.error(e);
        cb(null, null, e.message);
      }
  });
  socket.on("player-join", (data) => {
		if (!players[user.author]) players[user.author] = { [user.project]: {} };
    let pl = players[user.author][user.project];
    if (!pl) pl = players[user.author][user.project] = {};
    pl[socket.id] = data;
    socket.broadcast.emit("player-join", data);
  });
  socket.on("player-move", (data) => {
    if (!data) return;
		if (!players[user.author]) return;
    const pl = players[user.author][user.project];
    const player = pl[socket.id];
    Object.keys(data).forEach((k) => (player[k] = data[k]));
    socket.broadcast.emit("player-move", data);
  });
  socket.on("map-update", (data) => {
    if (!data) return;
		if (!maps[user.author]) return;
		const map = maps[user.author][user.project];
    data.forEach((v) => map.push(v));
    socket.broadcast.emit("map-update", data);
  });
  socket.on("disconnect", () => {
		if (!players[user.author]) return;
    const pl = players[user.author][user.project];
    if (!pl) return;
    delete pl[socket.id];
		if (!Object.keys(pl).length) {
			delete players[user.author][user.project];
			delete maps[user.author][user.project];
		}
    socket.broadcast.emit("player-disconnect", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  gameLoop(updateTime, io, players, maps);
});
