const projects = require("./projects");

const game = {
    async save(playerSaves, maps) {
        const start = new Date().getTime();
        console.log("Saving worlds (" + new Date().toLocaleString() + ")");
        await Promise.all(Object.keys(maps).map(async (author) => {
            const m = maps[author];
            await Promise.all(Object.keys(m).map(async (project) => {
                const map = m[project];
                const ps = playerSaves[author][project];
                if (!map.length) return;
                await projects.save(author, project, { mapChanges: map, playerSaves: ps });
                m[project] = [];
            }));
        }));
        const end = new Date().getTime();
        console.log("Saved worlds in " + (end - start) + "ms (" + new Date().toLocaleString() + ")");
        return new Promise((resolve) => resolve());
    },
    loop(updateTime, io, playerSaves, maps) {
        setInterval(() => this.save(playerSaves, maps), updateTime);
    },
};

module.exports = game;