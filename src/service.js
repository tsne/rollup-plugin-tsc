import * as process from "process";
import {existsSync, readFileSync} from "fs";
import {extname, dirname, relative} from "path";
import {
	sys,
	parseJsonConfigFileContent,
	getDefaultLibFilePath,
	resolveModuleName,
	createDocumentRegistry,
	createLanguageService,
	flattenDiagnosticMessageText,
	ScriptSnapshot,
	ScriptTarget,
	ModuleKind,
	DiagnosticCategory,
} from "typescript";
import {createFileStore, normalizePath} from "./files";



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
	const files = createFileStore(fileNames);
	const host = createServiceHost(options, files, cwd);
	const reg = createDocumentRegistry();
	const svc = createLanguageService(host, reg);
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
		return files.contains(filename);
	}

	return svc;
}


function createServiceHost(options, files, cwd) {
	const extensions = [".ts", ".tsx"];
	if(options.allowJs) {
		extensions.push(".js", ".jsx");
	}

	const moduleResolutionHost = createModuleResolutionHost();
	const resolveModule = function(moduleName, containingFile) {
		const {resolvedModule} = resolveModuleName(moduleName, containingFile, options, moduleResolutionHost);
		if(resolvedModule) {
			resolvedModule.resolvedFileName = normalizePath(resolvedModule.resolvedFileName);
			resolvedModule.originalFileName = resolvedModule.resolvedFileName;
		}
		return resolvedModule;
	};

	return {
		resolveModuleName: resolveModule,

		getDirectories: sys.getDirectories,
		directoryExists: sys.directoryExists,
		readDirectory: sys.readDirectory,
		getDefaultLibFileName: getDefaultLibFilePath,


		fileExists(filename) {
			return files.contains(filename) || sys.fileExists(filename);
		},

		readFile(filename) {
			return files.read(filename);
		},

		getCompilationSettings() {
			return options;
		},

		getCurrentDirectory() {
			return cwd;
		},

		getScriptFileNames() {
			return files.all().filter(path => extensions.includes(extname(path)));
		},

		getScriptVersion(filename) {
			const f = files.get(filename);
			return f ? `${f.version}` : "";
        },

		getScriptSnapshot(filename) {
			const contents = files.read(filename);
			return ScriptSnapshot.fromString(contents);
        },

		resolveModuleNames(moduleNames, containingFile) {
			return moduleNames.map(name => resolveModule(name, containingFile));
		},

		getNewLine() {
			return options.newLine || sys.newLine;
		},
	};
}

function createModuleResolutionHost() {
	return {
		fileExists(filename) {
			return existsSync(filename);
		},

		readFile(filename) {
			return readFileSync(filename, "utf-8")
		},
	};
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
