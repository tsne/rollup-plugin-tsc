import {resolve} from "path";



export function fileFilter(tsconfig) {
	const files = fileMatcher(tsconfig.files || []);
	const glob = globMatcher(tsconfig.exclude || [], tsconfig.include || []);

	return (filename) => {
		filename = resolve(filename);
		return files(filename) || glob(filename);
	};
}


function fileMatcher(files) {
	files = files.map(resolve);
	return (filename) => files.includes(filename);
}

function globMatcher(excludePatterns, includePatterns) {
	const exclude = excludePatterns.map(buildRegexp);
	const include = includePatterns.map(buildRegexp);

	return (filename) => {
		for(let i = 0; i < exclude.length; ++i) {
			if(exclude[i].test(filename)) {
				return false;
			}
		}

		for(let i = 0; i < include.length; ++i) {
			if(include[i].test(filename)) {
				return true;
			}
		}

		return false;
	};
}

function buildRegexp(pattern) {
	const parts = pattern.replace("\\", "/").split("/").map(part => {
		if(part === "**") {
			return "([^/]*(/|$))*";
		}

		let rx = "";
		for(let i = 0; i < part.length; ++i) {
			switch(part[i]) {
			case "*":
				rx += "[^/]*";
				break;

			case "?":
				rx += "[^/]";
				break;

			default:
				rx += part[i];
				break;
			}
		}
		return rx;
	});

	return new RegExp(resolve(parts.join("/")));
}
