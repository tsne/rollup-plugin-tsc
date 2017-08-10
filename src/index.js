import {readFileSync} from "fs";
import {module as tslibModule, name as tslib} from "tslib/package.json";
import {createService} from "./service";



export default function tsc(tsconfig) {
	tsconfig = tsconfig || {};
	tsconfig.compilerOptions = tsconfig.compilerOptions || {};

	const loadTslib = tslibLoader();
	const service = createService(tsconfig);

	return {
		name: "tsc",

		options(opts) {},

		resolveId(importee, importer) {
			if(importee === tslib) {
				return `\0${tslib}`;
			} else if(!importer) {
				return null;
			}
			importer = importer.replace("\\", "/");

			const {resolvedFileName} = service.host.resolveModuleName(importee, importer) || {};
			return resolvedFileName && !resolvedFileName.endsWith(".d.ts")
				? resolvedFileName
				: null;
		},

		load(id) {
			if(id === `\0${tslib}`) {
				return loadTslib();
			}
			return null;
		},

		transform(code, id) {
			if(!service.filter(id)) {
				return null;
			}

			const {outputFiles, errors, warnings} = service.emit(id);
			if(warnings && warnings.length) {
				warnings.forEach(this.warn);
			}
			if(errors && errors.length) {
				errors.forEach(err => console.error(`ERROR: ${err}`));
				this.error(`typescript compilation failed`);
			}

			const js = outputFiles.find(f => f.name.endsWith(".js") || f.name.endsWith(".jsx"));
			const map = outputFiles.find(f => f.name.endsWith(".map"));
			return !js ? null : {
				code: js.text,
				map: map ? JSON.parse(map.text) : {mappings: ""},
			};
		},
	};
}

function tslibLoader() {
	let src;
	return function() {
		if(!src) {
			src = readFileSync(require.resolve(`${tslib}/${tslibModule}`), "utf8");
		}
		return src;
	}
}
