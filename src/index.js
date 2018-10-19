import * as path from "path";
import * as fs from "fs";
import {module as tslibModule, name as tslib} from "tslib/package.json";
import {createService} from "./service";



export default function tsc(tsconfig) {
	tsconfig = tsconfig || {};
	tsconfig.compilerOptions = tsconfig.compilerOptions || {};

	const loadTslib = tslibLoader();
	const service = createService(tsconfig);

	let bundleDecls = [];

	return {
		name: "tsc",

		options(opts) {
			tsconfig.sourcemap = tsconfig.sourcemap || opts.sourcemap;
		},

		resolveId(importee, importer) {
			if(importee === tslib) {
				return `\0${tslib}`;
			} else if(!importer) {
				return null;
			}
			importer = importer.replace("\\", "/");

			const resolvedFileName = service.resolveModuleName(importee, importer);
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

			const {outputFiles, errors, warnings} = service.emit(id, code);
			if(warnings && warnings.length) {
				warnings.forEach(this.warn);
			}
			if(errors && errors.length) {
				errors.forEach(err => console.error(`ERROR: ${err}`));
				this.error("typescript compilation failed");
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

		generateBundle(opts, bundle, isWrite) {
			if(!isWrite || !bundleDecls.length) {
				return;
			}

			const dir = tsconfig.compilerOptions.declarationDir || path.dirname(opts.file);
			return mkdirAll(dir).then(() => Promise.all(bundleDecls.map(decl => {
				const file = path.basename(decl.name);
				return emitFile(path.join(dir, file), decl.text);
			})));
		},
	};
}

function tslibLoader() {
	let src;
	return () => {
		if(src) {
			return Promise.resolve(src);
		}

		return new Promise((resolve, reject) => {
			fs.readFile(require.resolve(`${tslib}/${tslibModule}`), "utf8", (err, data) => {
				if(err) {
					reject(err);
				} else {
					resolve(src = data);
				}
			});
		});
	}
}

function mkdirAll(p) {
	return new Promise((resolve, reject) => {
		fs.mkdir(p, (err) => {
			if(!err) {
				return resolve();
			}

			if(err.code === "ENOENT") {
				return mkdirAll(path.dirname(p)).then(() => mkdirAll(p));
			}

			fs.stat(p, (e, s) => {
				if(e) {
					reject(e);
				} else if(!s.isDirectory()) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	});
}

function emitFile(filename, data) {
	return new Promise((resolve, reject) => {
		fs.writeFile(filename, err => {
			if(err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}
