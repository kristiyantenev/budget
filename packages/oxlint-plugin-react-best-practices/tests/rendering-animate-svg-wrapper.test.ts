import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { renderingAnimateSvgWrapperRule } from "../src/rules/rendering-animate-svg-wrapper.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } });

tester.run("rendering-animate-svg-wrapper", renderingAnimateSvgWrapperRule, {
  valid: [
    '<svg className="animate-spin" />;',
    '<svg style={{ transform: "rotate(90deg)" }} />;',
    '<svg style={{ animation: "none" }} />;',
    '<svg style={{ animation: "none 0s" }} />;',
    '<svg style={{ transition: "unset" }} />;',
    "<svg style={{ animation: name }} />;",
    "<svg style={styles} />;",
    '<svg style={{ animation: "spin 1s", ...styles }} />;',
    '<svg style={{ animation: "spin 1s" }} {...props} />;',
    '<svg style={{ animation: "spin 1s" }} style={{ animation: "none" }} />;',
    '<div style={{ animation: "spin 1s" }}><svg /></div>;',
    '<Svg style={{ animation: "spin 1s" }} />;',
    '<svg style={{ animation: "spin 1s", animation: "none" }} />;',
  ],
  invalid: [
    '<svg style={{ animation: "spin 1s linear infinite" }} />;',
    '<svg style={{ animationName: "spin" }} />;',
    '<svg style={{ transition: "transform 1s" }} />;',
    '<svg style={{ "animation": "spin 1s" }} />;',
    'const animation = "spin 1s"; <svg style={{ animation }} />;',
    '<svg style={{ animation: "spin 1s", transition: "opacity 1s" }} />;',
  ].map((code) => ({ code, errors: [{ messageId: "wrapper" }], output: null })),
});
