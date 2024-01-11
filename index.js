const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const readline = require("readline");

const getSize = require("./modules/getSize");
const createMap = require("./modules/createMap");
const parseMap = require("./modules/parseMap");
const projects = require("./modules/projects");

const game = require("./modules/game");
const { exit } = require("process");

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
          } else if (Object.keys(playerSaves[au][pr]).length == 0) playerSaves[au][pr] = d.playerSaves || {};
          updateGameData();
          d.map = parseMap(d.map || createMap());
          d.mapChanges = maps[au][pr];
          d.players = players[au][pr];
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
    data.user = user;
    pl[socket.id] = data;
    cb(pl[socket.id]);
    socket.broadcast.emit("player-join", data);
  });
  socket.on("player-move", (data) => {
    if (!data) return;
    const pl = players[user.author][user.project];
    Object.keys(data).forEach((k) => (pl[socket.id][k] = data[k]));
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
  game.loop(updateTime, io, playerSaves, maps);
});

let exitRuns = 0;

const saveBeforeExit = (code) => {
  exitRuns++;
  if (exitRuns > 1) return;
  updateGameData();
  Object.keys(players).forEach(id => {
    const p = players[id];
    if (p.user?.username) playerSaves[p.user.author][p.user.project][p.user.username] = structuredClone(p);
  });
  game.save(playerSaves, maps).then(() => {
    const closeCodes = [0, "SIGINT", "SIGUSR1", "SIGUSR2"];
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (closeCodes.includes(code)) {
      rl.question("Are you sure you want to close the server? (y/n): ", a => {
        if (a.toLowerCase() == "n" || a.toLowerCase() == "no") rl.close();
        else process.exit();
      });
    }

    exitRuns = 0;
  });
};

process.on("beforeExit", saveBeforeExit);
process.on("SIGINT", saveBeforeExit);
process.on("SIGUSR1", saveBeforeExit);
process.on("SIGUSR2", saveBeforeExit);
process.on("uncaughtException", saveBeforeExit);