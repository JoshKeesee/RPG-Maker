const projects = require("./projects");

const gameLoop = (updateTime, io, players, maps) => {
    setInterval(() => {
        console.log("Saving worlds (" + new Date().toLocaleString() + ")");
        Object.keys(maps).forEach(author => {
            const m = maps[author];
            Object.keys(m).forEach(project => {
                const map = m[project];
                if (!map.length) return;
                projects.save(author, project, { mapChanges: map });
                m[project] = [];
            });
        });
    }, updateTime);
};

module.exports = gameLoop;