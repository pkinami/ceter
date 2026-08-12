import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "banner-assets.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    target: ts.ScriptTarget.ES2020
  },
  fileName: sourcePath
}).outputText;

const bannerModule = new Module(sourcePath);
bannerModule.filename = sourcePath;
bannerModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
bannerModule.require = (request) => {
  if (request === "@/lib/types") return {};
  if (request === "@/lib/banner-schema") return requireFromRoot("lib/banner-schema.ts");
  return Module.prototype.require.call(bannerModule, request);
};
bannerModule._compile(output, sourcePath);

bannerModule.exports.validateBannerManifest();
console.log(`Banner manifest OK: ${bannerModule.exports.getAllBannerImagePaths().length} exact asset paths validated.`);

function requireFromRoot(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const code = fs.readFileSync(absolutePath, "utf8");
  const compiled = ts.transpileModule(code, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020
    },
    fileName: absolutePath
  }).outputText;
  const mod = new Module(absolutePath);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  mod._compile(compiled, absolutePath);
  return mod.exports;
}
