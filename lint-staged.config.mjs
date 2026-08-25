export default {
  "*.{js,ts,cjs,mjs,jsx,tsx,json,jsonc,css}":
    "biome check --write --no-errors-on-unmatched",
  "*.{java,kts}": () => "./gradlew checkstyleMain checkstyleTest",
};
