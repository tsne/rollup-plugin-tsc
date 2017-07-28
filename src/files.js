import {normalize, resolve} from "path";
import {readFileSync} from "fs";



function newFile(path) {
	return {
		path,
		version: 0,
		contents: undefined,
	};
}

export function createFileStore(filenames) {
	const files = {}; // normalized filename => file
	filenames.forEach(fn => {
		fn = normalizePath(fn);
		files[fn] = newFile(fn);
	});

	return {
		contains(filename) {
			filename = normalizePath(filename);
			return filename in files;
		},

		tryGet(filename) {
			filename = normalizePath(filename);
			return files[filename];
		},

		get(filename, needContents) {
			filename = normalizePath(filename);
			let f = files[filename];
			if(!f) {
				f = newFile(filename);
			}
			if(needContents && !f.contents) {
				f.contents = readFileSync(filename, "utf-8");
			}
			return f;
		},

		all() {
			return Object.keys(files);
		},
	};
}

export function normalizePath(path) {
	path = normalize(path);
	return resolve(path);
}
