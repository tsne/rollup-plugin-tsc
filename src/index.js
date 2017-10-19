import * as path from "path";
import {readFileSync, writeFileSync} from "fs";
import {module as tslibModule, name as tslib} from "tslib/package.json";
import {createService} from "./service";



export default function tsc(tsconfig) {
	tsconfig = tsconfig || {};
	tsconfig.compilerOptions = tsconfig.compilerOptions || {};

	const loadTslib = tslibLoader();
	const service = createService(tsconfig);

	let bundleInput;
	let bundleDecls = [];

	return {
		name: "tsc",

		options(opts) {
			tsconfig.sourcemap = tsconfig.sourcemap || opts.sourcemap;
			bundleInput = opts.input;
			if(!path.isAbsolute(bundleInput)) {
				const cwd = service.host.getCurrentDirectory();
				bundleInput = path.join(cwd, bundleInput);
			}
		},

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
			service.host.addFile(id, code);

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
			const dts = outputFiles.find(f => f.name.endsWith(".d.ts"));
			if(dts) {
				bundleDecls.push(dts);
			}

			return !js ? null : {
				code: js.text,
				map: map ? JSON.parse(map.text) : {mappings: ""},
			};
		},

		onwrite(opts) {
			const dir = tsconfig.compilerOptions.declarationDir || path.dirname(opts.file);
			bundleDecls.forEach(decl => {
				const file = path.basename(decl.name);
				writeFileSync(path.join(dir, file), decl.text);
			});
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
