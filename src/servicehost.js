import {normalize, resolve} from "path";
import {existsSync, readFileSync} from "fs";
import {sys, ScriptSnapshot, resolveModuleName, getDefaultLibFilePath} from "typescript";



export function createServiceHost(options, filenames, cwd) {
	const normalizePath = (path) => resolve(normalize(path));
	const moduleResolutionHost = createModuleResolutionHost();
	const files = {}; // normalized filename => {version, snap, text}
	filenames.forEach(filename => files[normalizePath(filename)] = null);

	return {
		getDirectories: sys.getDirectories,
		directoryExists: sys.directoryExists,
		readDirectory: sys.readDirectory,
		getDefaultLibFileName: getDefaultLibFilePath,

		fileExists(filename) {
			filename = normalizePath(filename);
			return filename in files || sys.fileExists(filename);
		},

		readFile(filename) {
			return readFileSync(normalizePath(filename), "utf-8");
		},

		getCompilationSettings() {
			return options;
		},

		getCurrentDirectory() {
			return cwd;
		},

		getScriptFileNames() {
			return Object.keys(files);
		},

		getScriptVersion(filename) {
			const f = files[normalizePath(filename)];
			return f ? f.version.toString() : "";
		},

		getScriptSnapshot(filename) {
			let f = files[normalizePath(filename)];
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
		containsFile(filename) {
			return normalizePath(filename) in files;
		},

		resolveModuleName(moduleName, containingFile) {
			const {resolvedModule} = resolveModuleName(moduleName, containingFile, options, moduleResolutionHost);
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
