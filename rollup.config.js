const pkg = require('./package.json');


export default {
	entry: "src/index.js",
	external: [
		"typescript",
		"tslib/package.json",
		"rollup-pluginutils",
		"fs",
		"path",
	],
	targets: [
		{dest: pkg.module, format: "es"},
		{dest: pkg.main, format: "cjs"},
	],
	sourceMap: true,
};
