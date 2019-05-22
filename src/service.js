import * as process from "process";
import {existsSync, readFileSync} from "fs";
import {dirname, relative} from "path";
import {
	createDocumentRegistry,
	createLanguageService,
	flattenDiagnosticMessageText,
	DiagnosticCategory
} from "typescript";
import {createServiceHost} from "./servicehost";
import {fileFilter} from "./filter";

export function createService(tsConfig) {
	const cwd  = process.cwd();
  const host = createServiceHost(tsConfig, cwd);
	const reg  = createDocumentRegistry();
	const svc  = createLanguageService(host, reg);

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

    _filter: null,
		filter(filename) {
      if (!this._filter) {
          this._filter = fileFilter(tsConfig);
      }
			return this._filter(filename) || host.containsFile(filename);
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
