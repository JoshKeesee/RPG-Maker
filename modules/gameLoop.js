const projects = require("./projects");

const gameLoop = (updateTime, io, playerSaves, maps) => {
    setInterval(() => {
        console.log("Saving worlds (" + new Date().toLocaleString() + ")");
        Object.keys(maps).forEach(author => {
            const m = maps[author];
            Object.keys(m).forEach(project => {
                const map = m[project];
                const ps = playerSaves[author][project];
                if (!map.length) return;
                projects.save(author, project, { mapChanges: map, playerSaves: ps });
                m[project] = [];
            });
        });
    }, updateTime);
};

module.exports = gameLoop;