# rollup-plugin-tsc

A small [Rollup](https://github.com/rollup/rollup) plugin for transpiling Typescript.

## Installation
```
npm install --save-dev rollup-plugin-tsc
```

## Usage
```js
// rollup.config.js
import tsc from "rollup-plugin-tsc";

export default {
	input: "src/main.ts",

	plugins: [
		tsc({
			// put your tsconfig here
		}),
	]
};
```
The plugin simply transpiles Typescript into Javascript. To configure the Typescript compiler, the [tsconfig](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) has to be passed to the plugin. There is no need to hold a separate `tsconfig.json` file in the project.
