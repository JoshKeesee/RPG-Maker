const projects = require("./projects");

const game = {
  async save(playerSaves, maps) {
    const start = new Date().getTime();
    console.log("Saving worlds (" + new Date().toLocaleString() + ")");
    await Promise.all(
      Object.keys(maps).map(async (author) => {
        const m = maps[author];
        await Promise.all(
          Object.keys(m).map(async (project) => {
            const map = m[project];
            const ps = playerSaves[author][project];
            if (!map.length) return;
            await projects.save(author, project, {
              mapChanges: map,
              playerSaves: ps,
            });
            m[project] = [];
          }),
        );
      }),
    );
    const end = new Date().getTime();
    console.log(
      "Saved worlds in " +
        (end - start) +
        "ms (" +
        new Date().toLocaleString() +
        ")",
    );
    return new Promise((resolve) => resolve());
  },
  tick(io, times) {
    Object.keys(times).forEach((author) => {
      Object.keys(times[author]).forEach((project) => {
        const t = times[author][project];
        if (!Object.keys(t).length) return;
        t.time += t.timeInt;
        if (t.time > 24) t.time = 0;
        if (t.time < 0) t.time = 23;

        if (Math.floor(t.time) != t.lastTime) {
          io.to(author + "-" + project).emit("time-update", t);
          t.lastTime = Math.floor(t.time);
        }
      });
    });
  },
  loop(FPS, updateTime, io, playerSaves, maps, times) {
    setInterval(() => this.save(playerSaves, maps), updateTime);
    setInterval(() => this.tick(io, times), 1000 / FPS);
  },
};

module.exports = game;
