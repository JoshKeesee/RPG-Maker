import Touch from "./touch.js";
import Editor from "./editor.js";
import GameMap from "./map.js";
import Camera from "./camera.js";
import Player from "./player.js";
import images from "./images.js";

class Game {
  constructor() {
    this.stats = {};
    this.c = document.querySelector("#game");
    this.ctx = this.c.getContext("2d");
    this.touch = new Touch(this.c);
    this.editor = new Editor(this.c);
    this.map = new GameMap();
    this.camera = new Camera();
    this.images = images;
    this.socket = io({
      transports: ["websocket"],
      upgrade: false,
      autoConnect: false,
      forceNew: true,
    });
    this.players = {};
    this.player = null;
    this.then = performance.now();
    this.thenpf = this.then;
    this.thenf = this.then;
    this.frame = 0;
    this.mobile = ((a) =>
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
      a,
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      a.substr(0, 4),
    ))(navigator.userAgent || navigator.vendor || window.opera);
    this.g = null;
    this.mapLoaded = false;
    this.loadingOpacity = 1;
    this.keys = {};
    this.character = {
      width: 100,
      height: 100,
    };
    onkeydown = (e) => (!e.repeat ? (this.keys[e.key.toLowerCase()] = true) : "");
    onkeyup = (e) => delete this.keys[e.key.toLowerCase()];
    onblur = (e) => (Object.keys(this.keys).forEach((k) => delete this.keys[k]));
    this.socket.on("player-join", (data) => {
      this.players[data.id] = data;
    });
    this.socket.on("player-move", (data) => {
      if (data.id && this.players[data.id])
        Object.keys(data).forEach((k) => (this.players[data.id][k] = data[k]));
    });
    this.socket.on("player-disconnect", (id) => {
      delete this.players[id];
    });
    this.socket.on("map-update", (data) => {
      data.forEach((v) => editor.setTile(v.l, v.x, v.y, v.id));
    });
    this.socket.on("disconnect", async () => {
      if (this.map.loading) {
        this.mapLoaded = false;
        this.map.loadingInfo.push("Uh oh, the server disconnected. Reconnecting...");
        await this.connect();
        this.map.loadingInfo.pop();
        this.map.loadingInfo.push("Reconnected!");
        this.init();
      } else await this.connect();
    });
    this.connect = () =>
      new Promise((resolve) => {
        if (this.socket.connected) resolve();
        this.socket.connect();
        this.socket.on("connect", () => {
          this.socket.off("connect");
          resolve();
        });
      });
    this.init();
    this.update();
  }
  mapLoad() {
    return new Promise((resolve) => {
      const g = setInterval(() => {
        if (this.mapLoaded) {
          clearInterval(g);
          resolve();
        }
      }, 100);
    });
  }
  pFrames() {
    const now = performance.now();
    const delta = now - this.thenpf;
    if (!this.player) return;
    if (delta < 1000 / Math.max(Math.abs(this.player.xVel), Math.abs(this.player.yVel), 1))
      return;
    this.player.frames();
    this.thenpf = now;
  }
  frames() {
    const now = performance.now();
    const delta = now - this.thenf;
    if (delta < 150) return;
    this.frame++;
    if (this.frame > 3) this.frame = 0;
    this.thenf = now;
  }
  update() {
    this.g = requestAnimationFrame(() => this.update());
    this.pFrames();
    this.frames();
    const now = performance.now();
    const delta = now - this.then;
    if (delta < 1000 / 60) return;
    this.ctx.clearRect(0, 0, this.c.width, this.c.height);
    this.c.width = window.innerWidth;
    this.c.height = window.innerHeight;
    this.ctx.globalAlpha = 1;
    if (!Object.keys(this.map.map).length || this.map.loading) {
      this.loadingOpacity += 0.2 * (1 - this.loadingOpacity);
      const p = Math.min(this.map.loadingProgress, this.map.loadingMax),
        max = this.map.loadingMax;
      const d = Math.max(0, (100 / max) * p);
      this.ctx.fillStyle = this.ctx.strokeStyle = "#fff";
      this.ctx.font = "20px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = this.ctx.strokeStyle = "#ababab";
      this.ctx.fillText(
        "Loading... " + (d > 0 ? d.toFixed(1) + "%" : ""),
        this.c.width / 2,
        this.c.height / 2,
      );
      this.ctx.strokeRect(this.c.width / 2 - max / 2, this.c.height / 2 + 20, max, 20);
      this.ctx.fillRect(this.c.width / 2 - max / 2, this.c.height / 2 + 20, p, 20);
      const info = this.map.loadingInfo.slice(-10);
      info.forEach((v, i) => {
        this.ctx.fillStyle = this.ctx.strokeStyle = "#fff";
        this.ctx.font = "12px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(v, this.c.width / 2, this.c.height / 2 + 60 + i * 15);
      });
      if (this.map.loadingProgress.toFixed(1) == this.map.loadingMax) {
        this.map.loadingInfo.push("Updating pathfinding data...");
        this.map.updateGraph().then(() => {
          this.map.loadingInfo.pop();
          this.map.loadingInfo.push("Pathfinding data updated!");
          this.map.loadingInfo.push("Finished loading world!");
          setTimeout(() => {
            this.map.loading = false;
            this.map.loadingInfo = [];
            this.mapLoaded = true;
          }, 1000);
        });
        this.map.loadingProgress += 1;
      }
      return;
    }
    this.loadingOpacity += 0.2 * (0 - this.loadingOpacity);
    this.camera.update();
    this.ctx.save();
    this.ctx.translate(this.c.width / 2, this.c.height / 2);
    this.ctx.scale(this.camera.dz.toFixed(4), this.camera.dz.toFixed(4));
    this.ctx.translate(
      -this.camera.dx.toFixed(0) - this.c.width / 2,
      -this.camera.dy.toFixed(0) - this.c.height / 2,
    );
    this.map.drawLayers(["ground", "scenery"]);
    if (this.player) {
      const prev = structuredClone(this.player);
      this.player.update();
      const now = structuredClone(this.player);
      Object.keys(prev).forEach((k) => {
        if (prev[k] != now[k]) now[k] = prev[k];
      });
      if (Object.keys(now).length > 0)
        this.socket.emit("player-move", {
          id: this.player.id,
          ...now,
        });
    }
    const p = Object.keys(this.players).sort((a, b) => this.players[a].y + this.players[a].height - this.players[b].y - this.players[b].height);
    p.forEach(id => {
      const p = this.players[id];
      this.ctx.font = "15px sans-serif";
      this.ctx.textAlign = "center";
      
      this.ctx.drawImage(
        images[p.gender],
        p.dir * this.character.width,
        p.frame * this.character.height,
        this.character.width,
        this.character.height,
        p.x,
        p.y,
        p.width,
        p.height,
      );
    });

    this.map.drawLayers(["structure"]);

    p.forEach(id => {
      const p = this.players[id];
      const ind = Object.values(this.players).findIndex(e => e.id == p.id);
      const n = p.name || "Player " + (ind + 1);
      const s = 12;
      const o = this.ctx.measureText(n).width / 2 + 5;
      const ax = p.width / 2;
      const ay = s;
      const minX = this.camera.dx + o - (this.c.width / 2) / this.camera.dz + this.c.width / 2;
      const minY = this.camera.dy + o - (this.c.height / 2) / this.camera.dz + this.c.height / 2;
      const maxX = this.camera.dx + this.c.width - o + (this.c.width / (2 * this.camera.dz) - (this.c.width / 2));
      const maxY = this.camera.dy + this.c.height - o + (this.c.height / (2 * this.camera.dz) - (this.c.height / 2));
      const tx = Math.max(Math.min(p.x + ax, maxX), minX);
      const ty = Math.max(Math.min(p.y + ay, maxY), minY);
      const outOfViewport = tx == minX || tx == maxX || ty == minY || ty == maxY;
      const angle = Math.atan2(ty - (p.y + ax), tx - (p.x + ay)) + Math.PI / 2;
      if (outOfViewport) {
        this.ctx.save();
        this.ctx.translate(tx, ty);
        this.ctx.rotate(angle);
        this.ctx.translate(-tx, -ty);
      }
      this.ctx.beginPath();
      this.ctx.moveTo(tx, ty);
      this.ctx.lineTo(tx - s, ty - s);
      this.ctx.lineTo(tx + s, ty - s);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();
      this.ctx.closePath();
      if (angle > Math.PI / 2 && outOfViewport) {
        this.ctx.translate(tx, ty);
        this.ctx.rotate(Math.PI);
        this.ctx.translate(-tx, -ty);
        this.ctx.translate(0, s * 4 - 5);
      }
      this.ctx.fillStyle = "#fff";
      this.ctx.textAlign = "center";
      this.ctx.font = "bold 15px sans-serif";
      this.ctx.fillText(n, tx, ty - s - 5);
      if (outOfViewport) this.ctx.restore();
    });

    this.then = now;
    this.editor.run();
    this.ctx.restore();
    if (this.editor.toggled) {
      this.editor.drawCenter();
      this.editor.updateData();
    }
    this.touch.draw();
  
    this.ctx.globalAlpha = this.loadingOpacity;
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.c.width, this.c.height);
  }
  async init() {
    this.players = {};
    if (this.map) this.map.clear();
  
    await this.connect();
  
    const author = "JoshKeesee", project = "test";
  
    this.map.loadingInfo.push(`Downloading world data for ${author}/${project}...`);
  
    this.socket.emit("load-project", { author, project }, async (data, ws, error) => {
      if (error) return this.map.loadingInfo.push(error);
      this.map.loadingInfo.pop();
      this.map.loadingInfo.push(`Downloaded world data (${ws})`);
      if (!data.players) data.players = {};
      for (let id in data.players) this.players[id] = data.players[id];
      const l = Object.keys(this.players).length;
      this.map.loadingInfo.push(`Loaded ${l} player${l != 1 ? "s" : ""}!`);
      this.stats = data.stats;
      this.map.loadingInfo.push(`Loaded item and tile data!`);
      const numTiles = Object.keys(data.map.map).reduce((a, b) => a + data.map.map[b]?.length * data.map.map[b][0]?.length, 0);
      this.map.loadingInfo.push(
        `Downloaded map, loading ${numTiles || 0} tiles...`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
      );
      if (data.mapChanges) {
        this.map.loadingInfo.push(`Loading ${data.mapChanges.length} map changes...`);
        data.mapChanges.forEach((v) => data.map.map[v.l][v.y][v.x] = v.id);
      }
      this.map.loadMap(data.map);
    });
  
    await this.mapLoad();
  
    this.socket.emit("player-join", new Player(this.socket.id), async (data) => {
      this.players[this.socket.id] = this.player = new Player(this.socket.id, data);
      const os = this.camera.smoothing;
      const r = (min, max) => Math.floor(Math.random() * (max - min)) + min;
    
      const coords = [
        // { x: Math.random() * this.map.w * this.map.tsize, y: Math.random() * this.map.h * this.map.tsize, z: r(0.5, 1), smoothing: 0.05, m: true },
      ];
    
      for (let i = 0; i < coords.length; i++) await this.camera.set(coords[i], 100);
      this.camera.set({ z: 1, smoothing: os, maxVel: Infinity, m: false });
      this.camera.follow(this.player.id);
    });
  }
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const game = new Game();

export default game;
