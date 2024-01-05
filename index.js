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
const playerSaves = {};
const updateTime = 60000 * 10;

const updateGameData = () => {
  const ap = projects.getAllProjects();
  Object.keys(ap).forEach((author) => {
    if (!maps[author]) maps[author] = {};
    if (!playerSaves[author]) playerSaves[author] = {};
    if (!players[author]) players[author] = {};
    ap[author].forEach((project) => {
      if (!maps[author][project]) maps[author][project] = [];
      if (!playerSaves[author][project]) playerSaves[author][project] = {};
      if (!players[author][project]) players[author][project] = {};
    });
  });
};

updateGameData();

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
    const extras = { playerSaves: playerSaves[au] ? playerSaves[au][pr] || {} : {} };
    try {
      projects
        .get(au, pr)
        .then(async (d) => {
          if (!d.exists) {
            if (au == user.username) d = (await projects.make(au, pr, extras)) || d;
            else return cb(null, null, "Project does not exist");
            playerSaves[au][pr] = d.playerSaves || {};
          }
          updateGameData();
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
  socket.on("player-join", (data, cb = () => {}) => {
    if (!data) return cb(null);
    updateGameData();
    const pl = players[user.author][user.project];
    const s = playerSaves[user.author][user.project];
    if (s[user.username]) data = s[user.username];
    else if (user.username) s[user.username] = data;
    data.id = socket.id;
    data.name = user.name;
    pl[socket.id] = data;
    cb(pl[socket.id]);
    socket.broadcast.emit("player-join", data);
  });
  socket.on("player-move", (data) => {
    if (!data) return;
    const pl = players[user.author][user.project];
    const player = pl[socket.id];
    Object.keys(data).forEach((k) => (player[k] = data[k]));
    socket.broadcast.emit("player-move", data);
  });
  socket.on("map-update", (data) => {
    if (!data) return;
		const map = maps[user.author][user.project];
    data.forEach((v) => map.push(v));
    socket.broadcast.emit("map-update", data);
  });
  socket.on("disconnect", () => {
    updateGameData();
    const pl = players[user.author][user.project];
    if (user.username) playerSaves[user.author][user.project][user.username] = structuredClone(pl[socket.id]);
    delete pl[socket.id];
    socket.broadcast.emit("player-disconnect", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  gameLoop(updateTime, io, playerSaves, maps);
});
