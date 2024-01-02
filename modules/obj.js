const zlib = require("zlib");

module.exports = {
	async compress(obj) {
		const str = JSON.stringify(obj);
		const buffer = Buffer.from(str);
		const compressed = zlib.deflateRawSync(buffer);
		return compressed.toString("base64");
	},
	async decompress(str) {
		const buffer = Buffer.from(str, "base64");
		const decompressed = zlib.inflateRawSync(buffer);
		return JSON.parse(decompressed.toString());
	},
};