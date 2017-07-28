# rollup-plugin-tsc

A small rollup plugin for transpiling Typescript.

## Installation
```
npm install --save-dev rollup-plugin-tsc
```

## Usage
```js
// rollup.config.js
import json from 'rollup-plugin-tsc';

export default {
	entry: 'src/main.ts',

	plugins: [
		tsc({
			// put your tsconfig here
		})
	]
};
```
The plugin simply transpiles Typescript into Javascript. To configure the Typescript compiler, the configuration can be passed to the plugin. All configuration values from the [tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html) are allowed here.
