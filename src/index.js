import {createFilter} from "rollup-pluginutils";
import {nodeModuleNameResolver, transpileModule, flattenDiagnosticMessageText, DiagnosticCategory, sys} from "typescript";
import {readFileSync} from "fs";
import {resolve} from "path";
import {module as tslibModule, name as tslib} from "tslib/package.json";



export default function tsc(options) {
	options = options || {};

	const include = options.include || ["*.ts+(|x)", "**/*.ts+(|x)"];
	const exclude = options.exclude || ["*.d.ts", "**/*.d.ts"];
	const filter = createFilter(include, exclude);

	const tslibSrc = readFileSync(resolve(`${tslib}/${tslibModule}`), "utf8");
	const tsconfig = options || {};
	const compilerOptions = Object.assign({}, tsconfig.compilerOptions, {
		target: "ES2015",
	});

	return {
		name: "tsc",

		options(opts) {},

		load(id) {
			if(id === `\0${tslib}`) {
				return tslibSrc;
			}
		},

		resolveId(importee, importer) {
			if(importee === tslib) {
				return "\0" + tslib;
			} else if(!importer) {
				return null;
			}
			importer = importer.replace("\\", "/");

			const {resolvedModule} = nodeModuleNameResolver(importee, importer, compilerOptions, sys);
			const {resolvedFileName} = resolvedModule || {};
			return resolvedFileName && !resolvedFileName.endsWith(".d.ts")
				? resolvedFileName
				: null;
		},

		transform(source, id) {
			if(id.endsWith(".d.ts") || !filter(id)) {
				return null;
			}

			const {outputText, sourceMapText, diagnostics} = transpileModule(source, {
				compilerOptions,
				fileName: id,
				reportDiagnostics: true,
			});

			let hasErrors = false;
			diagnostics.forEach(diag => {
				const {line} = diag.file.getLineAndCharacterOfPosition(diag.start);
				const text = flattenDiagnosticMessageText(diag.messageText, "\n");
				const message = `${diag.file.fileName}:${line+1}: ${text}`;
				switch(diag.category) {
				case DiagnosticCategory.Warning:
					this.warn(message);
					break;
				case DiagnosticCategory.Error:
					console.error(`ERROR: ${message}`);
					hasErrors = true;
					break;
				}
			});

			if(hasErrors) {
				console.error(); // insert extra newline
				process.exit(1);
			}

			return {
				code: outputText,
				map: sourceMapText ? JSON.parse(sourceMapText) : {mappings: ""},
			};
		},
	};
}
