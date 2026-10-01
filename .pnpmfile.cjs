// TypeScript 7 has no compiler API. Give only typescript-eslint 8.x its
// documented TS 6 compatibility API while the project keeps TS 7's tsc.
// Remove when typescript-eslint supports the native compiler API.
module.exports = {
  hooks: {
    readPackage(pkg) {
      const isTypeScriptEslint = pkg.name === "typescript-eslint" || pkg.name.startsWith("@typescript-eslint/");
      if (isTypeScriptEslint && pkg.version.startsWith("8.") && pkg.peerDependencies?.typescript) {
        delete pkg.peerDependencies.typescript;
        pkg.dependencies = { ...pkg.dependencies, typescript: "npm:@typescript/typescript6@^6.0.2" };
      }
      return pkg;
    },
  },
};
