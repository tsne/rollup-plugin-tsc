import * as fs from "fs";
import { dirname }                    from "path";
import { ModuleKind }                 from "typescript";
import { ModuleResolutionKind }       from "typescript";
import { parseJsonConfigFileContent } from "typescript";
import { ScriptTarget }               from "typescript";
import { sys }                        from "typescript";

const defaultCompilerOptions = {
	module: ModuleKind.ES2015,
	moduleResolution: ModuleResolutionKind.NodeJs,
};

function isString( value ) {
  return ( typeof value === 'string' ) || ( value instanceof String );
}

export function createTsConfig(config) {
  return {
    _tsconfig: null,
    _options: null,
    get options() {
      if(!this._options) {
        this.resolve();
        Object.assign(this._options, {
      		target: ScriptTarget.ES2015,
      		noEmitOnError: false,
      		suppressOutputPathCheck: true,
      		allowNonTsExtensions: true,
      	});
      }
      return this._options;
    },

    _fileNames: null,
    get fileNames() {
      if(!this._fileNames) { this.resolve(); }
      return this._fileNames;
    },

    _errors: null,
    get errors() {
      if(!this._errors) { this.resolve(); }
      return this._errors;
    },

    get sourceMap() {
      if(!this._tsconfig) { this.resolve(); }
      return this._tsconfig.sourceMap
    },

    set sourceMap(value) {
      if(!this._tsconfig) { this.resolve(); }
      this._tsconfig.sourceMap = value
    },

    get compilerOptions() {
      if(!this._tsconfig) { this.resolve(); }
      return this._tsconfig.compilerOptions
    },

    resolve() {
      if(!this._tsconfig) {
        if(!isString(config)) {
          this._tsconfig = config || {};
          this._tsconfig.compilerOptions = this._tsconfig.compilerOptions || {};
        } else {
          this._tsconfig = JSON.parse(fs.readFileSync(config));
        }
      }
      let parsed = parseJsonConfigFileContent(this._tsconfig, sys, dirname(""), defaultCompilerOptions);
      this._options   = parsed.options;
      this._fileNames = parsed.fileNames;
      this._errors    = parsed.errors;
      if(this._errors.length) {
        let msg   = this._errors[0].messageText || "error parsing tsconfig in tsconfig::resolve";
    		let error = new Error(msg);
            error.code = this._errors[0].code;
        throw error;
    	}
    }
  }
}
