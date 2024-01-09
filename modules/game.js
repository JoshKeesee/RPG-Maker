const projects = require("./projects");

const game = {
    save(playerSaves, maps) {
        return new Promise(resolve => {
            console.log("Saving worlds (" + new Date().toLocaleString() + ")");
            Promise.all(Object.keys(maps).map((author) => {
                const m = maps[author];
                Promise.all(Object.keys(m).map((project) => {
                    const map = m[project];
                    const ps = playerSaves[author][project];
                    if (!map.length) return;
                    projects.save(author, project, { mapChanges: map, playerSaves: ps });
                    m[project] = [];
                }));
            })).then(() => {
                console.log("Saved worlds (" + new Date().toLocaleString() + ")");
                resolve();
            });
        });
    },
    loop(updateTime, io, playerSaves, maps) {
        setInterval(() => this.save(playerSaves, maps), updateTime);
    },
};

module.exports = game;