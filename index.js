const express = require("express");
const app = express();
const port = 3000;
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const getSize = require("./modules/getSize");
const createMap = require("./modules/createMap");
const projects = require("./modules/projects");

const players = {},
  map = createMap();

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
  socket.on("init", async ({ author: au, project: pr }, cb) => {
		author = au;
		project = pr;
		if (!players[author]) players[author] = { [project]: {} };
		const pl = players[author][project];
		const d = await projects.get(author, project);
		d.players = pl;
		// if (!d.exists && author == user.username) projects.make(author, project);
		const ws = getSize(d);
    cb(d, ws);
  });
  socket.on("player-join", (data) => {
		const pl = players[author][project];
    pl[socket.id] = data;
    socket.broadcast.emit("player-join", data);
  });
  socket.on("player-move", (data) => {
    if (!data) return;
		const pl = players[author][project];
		const player = pl[socket.id];
    Object.keys(data).forEach((k) => (player[k] = data[k]));
    socket.broadcast.emit("player-move", data);
  });
  socket.on("map-update", (data) => {
    if (!data) return;
    data.forEach((v) => map.setTile(v.l, v.x, v.y, v.id));
    socket.broadcast.emit("map-update", data);
  });
  socket.on("disconnect", () => {
		const pl = players[author][project];
    delete pl[socket.id];
    socket.broadcast.emit("player-disconnect", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
