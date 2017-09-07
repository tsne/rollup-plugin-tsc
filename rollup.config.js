const pkg = require('./package.json');


export default {
	input: "src/index.js",
	output: [
		{file: pkg["module"], format: "es"},
		{file: pkg["main"], format: "cjs"},
	],
	external: [
		"typescript",
		"tslib/package.json",
		"rollup-pluginutils",
		"fs",
		"path",
		"process",
	],
	sourcemap: true,
};
