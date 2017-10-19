import {extname, normalize, resolve} from "path";
import {existsSync, readFileSync} from "fs";
import {sys, ScriptSnapshot, resolveModuleName, getDefaultLibFilePath} from "typescript";



export function createServiceHost(options, cwd) {
	const extensions = [".ts", ".tsx"];
	if(options.allowJs) {
		extensions.push(".js", ".jsx");
	}

	const files = {}; // normalized filename => {version, snap, text}
	const moduleResolutionHost = createModuleResolutionHost();

	return {
		getDirectories: sys.getDirectories,
		directoryExists: sys.directoryExists,
		readDirectory: sys.readDirectory,
		getDefaultLibFileName: getDefaultLibFilePath,

		resolveModuleName(moduleName, containingFile) {
			const {resolvedModule} = resolveModuleName(moduleName, containingFile, options, moduleResolutionHost);
			if(resolvedModule) {
				resolvedModule.resolvedFileName = this.normalizePath(resolvedModule.resolvedFileName);
				resolvedModule.originalFileName = resolvedModule.resolvedFileName;
			}
			return resolvedModule;
		},

		fileExists(filename) {
			filename = this.normalizePath(filename);
			return filename in files || sys.fileExists(filename);
		},

		readFile(filename) {
			return readFileSync(this.normalizePath(filename), "utf-8");
		},

		getCompilationSettings() {
			return options;
		},

		getCurrentDirectory() {
			return cwd;
		},

		getScriptFileNames() {
			return Object.keys(files).filter(path => extensions.includes(extname(path)));
		},

		getScriptVersion(filename) {
			const f = files[this.normalizePath(filename)];
			return f ? f.version.toString() : "";
        },

		getScriptSnapshot(filename) {
			let f = files[this.normalizePath(filename)];
			if(!f) {
				f = this.addFile(filename, this.readFile(filename));
			}
			return f.snap;
        },

		resolveModuleNames(moduleNames, containingFile) {
			return moduleNames.map(name => this.resolveModuleName(name, containingFile));
		},

		getNewLine() {
			return options.newLine || sys.newLine;
		},

		// additional methods
		normalizePath(path) {
			return resolve(normalize(path));
		},

		addFile(filename, text) {
			filename = this.normalizePath(filename);

			const snap = ScriptSnapshot.fromString(text);
			snap.getChangeRange = function() {};

			let file = files[filename];
			if(!file) {
				file = {version: 0};
				files[filename] = file;
			}
			++file.version;
			file.snap = snap;
			file.text = text;
			return file;
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
