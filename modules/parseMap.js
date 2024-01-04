module.exports = (m) => {
    return {
        w: m.w,
        h: m.h,
        tsize: m.tsize,
        tilemap: m.tilemap,
        items: m.items,
        map: m.map,
        l: Object.keys(m.map),
    };
};