export default {
  "*.{js,ts,cjs,mjs,cts,mts,jsx,tsx}": [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "oxfmt --write --no-error-on-unmatched-pattern",
  ],
  "*.{json,jsonc,css,html,md,mdx,yaml,yml}": "oxfmt --write --no-error-on-unmatched-pattern",
  "*.{java,kts}": () => "./gradlew checkstyleMain checkstyleTest",
};
