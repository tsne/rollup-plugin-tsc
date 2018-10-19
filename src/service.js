import * as process from "process";
import {existsSync, readFileSync} from "fs";
import {dirname, relative} from "path";
import {
	sys,
	parseJsonConfigFileContent,
	createDocumentRegistry,
	createLanguageService,
	flattenDiagnosticMessageText,
	ScriptTarget,
	ModuleKind,
	ModuleResolutionKind,
	DiagnosticCategory,
} from "typescript";
import {createServiceHost} from "./servicehost";



const defaultCompilerOptions = {
	module: ModuleKind.ES2015,
	moduleResolution: ModuleResolutionKind.NodeJs,
	sourceMap: true,
};


export function createService(tsconfig) {
	const cwd = process.cwd();
	const {options, fileNames, errors} = parseJsonConfigFileContent(tsconfig, sys, dirname(""), defaultCompilerOptions);
	if(errors.length) {
		throw new Error(errorMessage(errors[0], cwd));
	}

	Object.assign(options, {
		target: ScriptTarget.ES2015,
		noEmitOnError: false,
		suppressOutputPathCheck: true,
		allowNonTsExtensions: true,
	});

	const host = createServiceHost(options, fileNames, cwd);
	const reg = createDocumentRegistry();
	const svc = createLanguageService(host, reg);

	return {
		emit(filename, code) {
			host.addFile(filename, code);

			const output = svc.getEmitOutput(filename);
			let diag = svc.getSyntacticDiagnostics(filename);
			if(!diag.length) {
				diag = svc.getCompilerOptionsDiagnostics();
				if(!diag.length) {
					diag = svc.getSemanticDiagnostics(filename);
				}
			}

			output.errors = [];
			output.warnings = [];
			diag.forEach(d => {
				const msg = errorMessage(d, cwd);
				switch(d.category) {
				case DiagnosticCategory.Error:
					output.errors.push(msg);
					break;
				case DiagnosticCategory.Warning:
					output.warnings.push(msg);
					break;
				}
			});
			return output;
		},

		filter(filename) {
			return host.containsFile(filename);
		},

		resolveModuleName(importee, importer) {
			const {resolvedFileName} = host.resolveModuleName(importee, importer) || {};
			return resolvedFileName;
		},
	};
}


function errorMessage(diagnostic, cwd) {
	const text = flattenDiagnosticMessageText(diagnostic.messageText, "\n");
	if(!diagnostic.file) {
		return `tsc: ${text}`;
	}

	const {line} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
	const file = relative(cwd, diagnostic.file.fileName);
	return `${file}:${line+1}: ${text}`;
}
