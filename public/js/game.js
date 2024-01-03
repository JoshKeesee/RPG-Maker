import Touch from "./touch.js";
import Editor from "./editor.js";
import images from "./images.js";
import { camera } from "./camera.js";
import { map } from "./map.js";
import { Player } from "./player.js";

const character = {
  width: 100,
  height: 100,
};

let stats = {};

const c = document.querySelector("#game");
const ctx = c.getContext("2d");
const touch = new Touch(c);
const editor = new Editor(c);
const socket = io({
  transports: ["websocket"],
  upgrade: false,
  autoConnect: false,
  forceNew: true,
});
let players = {};
let player;
let then = performance.now(),
  thenpf = then,
  thenf = then,
  frame = 0,
  mobile = false,
  g = null,
  mapLoaded = false,
  loadingOpacity = 1;

const mapLoad = () =>
  new Promise((resolve) => {
    const g = setInterval(() => {
      if (mapLoaded) {
        clearInterval(g);
        resolve();
      }
    }, 100);
  });

const connect = () =>
  new Promise((resolve) => {
    if (socket.connected) resolve();
    socket.connect();
    socket.on("connect", () => resolve());
  });

socket.on("player-join", (data) => {
  players[data.id] = data;
});

socket.on("player-move", (data) => {
  if (data.id && players[data.id])
    Object.keys(data).forEach((k) => (players[data.id][k] = data[k]));
});

socket.on("player-disconnect", (id) => {
  delete players[id];
});

socket.on("map-update", (data) => {
  data.forEach((v) => editor.setTile(v.l, v.x, v.y, v.id));
});

socket.on("disconnect", async () => {
  if (map.loading) {
    mapLoaded = false;
    map.loadingInfo.push("Uh oh, the server disconnected. Reconnecting...");
    await connect();
    map.loadingInfo.pop();
    map.loadingInfo.push("Reconnected!");
    init();
  } else await connect();
});

function update() {
  g = requestAnimationFrame(update);
  pFrames();
  frames();
  const now = performance.now();
  const delta = now - then;
  if (delta < 1000 / 60) return;
  ctx.clearRect(0, 0, c.width, c.height);
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  ctx.globalAlpha = 1;
  if (!Object.keys(map.map).length || map.loading) {
    loadingOpacity += 0.2 * (1 - loadingOpacity);
    const p = Math.min(map.loadingProgress, map.loadingMax),
      max = map.loadingMax;
    const d = Math.max(0, (100 / max) * p);
    ctx.fillStyle = ctx.strokeStyle = "#fff";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = ctx.strokeStyle = "#ababab";
    ctx.fillText(
      "Loading... " + (d > 0 ? d.toFixed(1) + "%" : ""),
      c.width / 2,
      c.height / 2,
    );
    ctx.strokeRect(c.width / 2 - max / 2, c.height / 2 + 20, max, 20);
    ctx.fillRect(c.width / 2 - max / 2, c.height / 2 + 20, p, 20);
    const info = map.loadingInfo.slice(-10);
    info.forEach((v, i) => {
      ctx.fillStyle = ctx.strokeStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(v, c.width / 2, c.height / 2 + 60 + i * 15);
    });
    if (map.loadingProgress.toFixed(1) == map.loadingMax) {
			map.loadingInfo.push("Updating pathfinding data...");
			map.updateGraph().then(() => {
				map.loadingInfo.pop();
				map.loadingInfo.push("Pathfinding data updated!");
				map.loadingInfo.push("Finished loading world!");
				setTimeout(() => {
					map.loading = false;
					map.loadingInfo = [];
					mapLoaded = true;
				}, 1000);
			});
      map.loadingProgress += 1;
    }
    return;
  }
  loadingOpacity += 0.2 * (0 - loadingOpacity);
  camera.update();
  ctx.save();
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(camera.dz.toFixed(4), camera.dz.toFixed(4));
  ctx.translate(
    -camera.dx.toFixed(0) - c.width / 2,
    -camera.dy.toFixed(0) - c.height / 2,
  );
  map.drawLayers(["ground", "scenery"]);
  if (player) {
    const prev = structuredClone(player);
    player.update();
    const now = structuredClone(player);
    Object.keys(prev).forEach((k) => {
      if (prev[k] != now[k]) now[k] = prev[k];
    });
    if (Object.keys(now).length > 0)
      socket.emit("player-move", {
        id: player.id,
        ...now,
      });
  }
	const p = Object.keys(players).sort((a, b) => players[a].y - players[b].y);
  p.forEach(id => {
    const p = players[id];
    
    ctx.drawImage(
      images[p.gender],
      p.dir * character.width,
      p.frame * character.height,
      character.width,
      character.height,
      p.x,
      p.y,
      p.width,
      p.height,
    );

    const s = 12;
    const o = 20;
    const ax = p.width / 2;
    const ay = s;
    const minX = camera.dx + o - (c.width / 2) / camera.dz + c.width / 2;
    const minY = camera.dy + o - (c.height / 2) / camera.dz + c.height / 2;
    const maxX = camera.dx + c.width - o + (c.width / (2 * camera.dz) - (c.width / 2));
    const maxY = camera.dy + c.height - o + (c.height / (2 * camera.dz) - (c.height / 2));
    const tx = Math.max(Math.min(p.x + ax, maxX), minX);
    const ty = Math.max(Math.min(p.y + ay, maxY), minY);
    const outOfViewport = tx == minX || tx == maxX || ty == minY || ty == maxY;
    if (outOfViewport) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(Math.atan2(ty - (p.y + ax), tx - (p.x + ay)) + Math.PI / 2);
      ctx.translate(-tx, -ty);
    }
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - s, ty - s);
    ctx.lineTo(tx + s, ty - s);
    ctx.closePath();
    ctx.fillStyle = p.color;
    ctx.fill();
    if (outOfViewport) ctx.restore();
  });
  map.drawLayers(["structure"]);
  then = now;
  editor.run();
  ctx.restore();
  if (editor.toggled) {
    editor.drawCenter();
    editor.updateData();
  }
  touch.draw();

  ctx.globalAlpha = loadingOpacity;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
}

function pFrames() {
  const now = performance.now();
  const delta = now - thenpf;
  if (!player) return;
  if (delta < 1000 / Math.max(Math.abs(player.xVel), Math.abs(player.yVel), 1))
    return;
  player.frames();
  thenpf = now;
}

function frames() {
  const now = performance.now();
  const delta = now - thenf;
  if (delta < 150) return;
  frame++;
  if (frame > 3) frame = 0;
  thenf = now;
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const init = async () => {
  players = {};
  map.clear();
  if (g) cancelAnimationFrame(g);
  update();

  await connect();

	const author = "JoshKeesee", project = "test";

  map.loadingInfo.push(`Downloading world data for ${author}/${project}...`);

  socket.emit("init", { author, project }, async (data, ws) => {
    map.loadingInfo.pop();
    map.loadingInfo.push(`Downloaded world data (${ws})`);
    for (let id in data.players) players[id] = data.players[id];
    const l = Object.keys(players).length;
    map.loadingInfo.push(`Loaded ${l} player${l != 1 ? "s" : ""}!`);
		stats = data.stats;
		map.loadingInfo.push(`Loaded item and tile data!`);
		if (data.map) {
	    map.loadingInfo.push(
	      `Downloaded map, loading ${
	        data.map.w * data.map.h * Object.keys(data.map.map).length
	      } tiles...`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
	    );
	    map.loadMap(data.map);
		} else {
			map.loadingInfo.push("Failed to load map! Creating new map...");
			map.addLayer("ground");
			map.addLayer("scenery");
			map.addLayer("structure");
			await map.updateLayers();
			await map.addScenery();
		}
  });

  await mapLoad();

  player = new Player(socket.id);
  players[socket.id] = player;
  socket.emit("player-join", player);

  const os = camera.smoothing;
  const r = (min, max) => Math.floor(Math.random() * (max - min)) + min;

  const coords = [
    // { x: Math.random() * map.w * map.tsize, y: Math.random() * map.h * map.tsize, z: r(0.5, 1), smoothing: 0.05, m: true },
  ];

  for (let i = 0; i < coords.length; i++) await camera.set(coords[i], 100);
  camera.set({ z: 1, smoothing: os, maxVel: Infinity, m: false });
  camera.follow(socket.id);
};

window.onload = init;

(() => {
  mobile = ((a) =>
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
      a,
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      a.substr(0, 4),
    ))(navigator.userAgent || navigator.vendor || window.opera);
})();

export {
  player,
  socket,
  players,
  update,
  ctx,
  wait,
  c,
  touch,
  editor,
  frame,
  mobile,
	stats,
};
