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
	DiagnosticCategory,
} from "typescript";
import {createServiceHost} from "./servicehost";



const defaultCompilerOptions = {
	module: ModuleKind.ES2015,
	sourceMap: true,
};


export function createService(tsconfig) {
	const {options, fileNames, errors} = parseJsonConfigFileContent(tsconfig, sys, dirname(""), defaultCompilerOptions);
	if(errors.length) {
		throw new Error(errorMessage(errors[0], cwd));
	}

	Object.assign(options, {
		target: ScriptTarget.ES2015,
		noEmitOnError: false,
		suppressOutputPathCheck: true,
	});

	const cwd = process.cwd();
	const host = createServiceHost(options, cwd);
	const reg = createDocumentRegistry();
	const svc = createLanguageService(host, reg);
	const availFiles = fileNames.map(host.normalizePath);
	svc.host = host;

	svc.emit = function(filename) {
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
	}

	svc.filter = function(filename) {
		return availFiles.includes(filename);
	}

	return svc;
}


function errorMessage(diagnostic, cwd) {
	const text = flattenDiagnosticMessageText(diagnostic.messageText, "\n");
	if(!diagnostic.file) {
		return `tsc: ${text}`;
	} else {
		const {line} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
		const file = relative(cwd, diagnostic.file.fileName);
		return `${file}:${line+1}: ${text}`;
	}
}
