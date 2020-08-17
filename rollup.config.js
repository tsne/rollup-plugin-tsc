const pkg = require('./package.json');


export default {
	input: "src/index.js",
	output: [
		{file: pkg["module"], format: "esm", sourcemap: true},
		{file: pkg["main"], format: "cjs", sourcemap: true, exports: "auto"},
	],
	external: [
		"typescript",
		"tslib/package.json",
		"rollup-pluginutils",
		"fs",
		"path",
		"process",
	],
};
