import {normalize, resolve} from "path";
import {existsSync, readFileSync} from "fs";
import {sys, ScriptSnapshot, resolveModuleName, getDefaultLibFilePath} from "typescript";



export function createServiceHost(tsConfig, cwd) {
	const normalizePath = (path) => resolve(normalize(path));
	const moduleResolutionHost = createModuleResolutionHost();

	return {
		getDirectories: sys.getDirectories,
		directoryExists: sys.directoryExists,
		readDirectory: sys.readDirectory,
		getDefaultLibFileName: getDefaultLibFilePath,

    _files: null,
    get files() {
      if(!this._files) {
        this._files = [];
        tsConfig.fileNames.forEach(filename => this._files[normalizePath(filename)] = null);
      }
      return this._files;
    },

		fileExists(filename) {
			filename = normalizePath(filename);
			return filename in this.files || sys.fileExists(filename);
		},

		readFile(filename) {
			return readFileSync(normalizePath(filename), "utf-8");
		},

		getCompilationSettings() {
			return tsConfig.options;
		},

		getCurrentDirectory() {
			return cwd;
		},

		getScriptFileNames() {
			return Object.keys(this.files);
		},

		getScriptVersion(filename) {
			const f = this.files[normalizePath(filename)];
			return f ? f.version.toString() : "";
		},

		getScriptSnapshot(filename) {
			let f = this.files[normalizePath(filename)];
			if(!f) {
				f = this.addFile(filename, this.readFile(filename));
			}
			return f.snap;
		},

		resolveModuleNames(moduleNames, containingFile) {
			return moduleNames.map(name => this.resolveModuleName(name, containingFile));
		},

		getNewLine() {
			return tsConfig.options.newLine || sys.newLine;
		},

		// additional methods
		containsFile(filename) {
			return normalizePath(filename) in this.files;
		},

		resolveModuleName(moduleName, containingFile) {
			const {resolvedModule} = resolveModuleName(moduleName, containingFile, tsConfig.options, moduleResolutionHost);
			if(resolvedModule) {
				resolvedModule.resolvedFileName = normalizePath(resolvedModule.resolvedFileName);
				resolvedModule.originalFileName = resolvedModule.resolvedFileName;
			}
			return resolvedModule;
		},

		addFile(filename, text) {
			filename = normalizePath(filename);

			const snap = ScriptSnapshot.fromString(text);
			snap.getChangeRange = () => {};

			let file = this.files[filename];
			if(!file) {
				file = {version: 0};
				this.files[filename] = file;
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
