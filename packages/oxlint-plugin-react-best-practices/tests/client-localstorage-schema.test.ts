import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "node:test";
import { clientLocalstorageSchemaRule } from "../src/rules/client-localstorage-schema.ts";

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

tester.run("client-localstorage-schema", clientLocalstorageSchemaRule, {
  valid: [
    'try { localStorage.setItem("prefs:v1", data); } catch {}',
    'try { localStorage.setItem("v2:prefs", data); } catch {}',
    'try { localStorage.setItem("prefs-v2-theme", data); } catch {}',
    'const VERSION = "v2"; try { localStorage.setItem(`prefs:${VERSION}`, data); } catch {}',
    'const VERSION = "v2"; const KEY = "prefs:" + VERSION; try { localStorage.setItem(KEY, data); } catch {}',
    'try { const old = localStorage.getItem("prefs"); localStorage.removeItem("prefs"); } catch {}',
    "function wrapper(key) { try { return localStorage.getItem(key); } catch { return null; } }",
    "function wrapper(key, data) { try { localStorage.setItem(key, data); } catch {} }",
    'function f(localStorage) { localStorage.setItem("prefs", data); }',
    'function f(window) { window.localStorage.setItem("prefs", data); }',
    'function f(globalThis) { globalThis.localStorage.setItem("prefs", data); }',
    'sessionStorage.setItem("prefs", data);',
    'try { window.localStorage["setItem"]("prefs:v2", data); } catch {}',
    "const a = b; const b = a; try { localStorage.setItem(a, data); } catch {}",
    'try { try {} catch { localStorage.getItem("old"); } } catch {}',
    "function f(keys) { try { keys.forEach((k) => localStorage.getItem(k)); } catch {} }",
    "function f(keys) { try { return keys.map(function (k) { return localStorage.getItem(k); }); } catch {} }",
    "function f(keys) { try { return keys.filter((k) => keys.some((j) => localStorage.getItem(j + k))); } catch {} }",
    'try { (() => localStorage.getItem("prefs:v1"))(); } catch {}',
  ],
  invalid: [
    {
      code: 'localStorage.setItem("prefs", data);',
      errors: [{ messageId: "catchStorage" }, { messageId: "versionKey" }],
    },
    ...[
      'localStorage.getItem("prefs:v1");',
      'window.localStorage.setItem("prefs:v1", data);',
      'globalThis.localStorage.getItem("prefs:v1");',
      'try { localStorage.getItem("prefs:v1"); } finally {}',
      'try {} catch { localStorage.getItem("prefs:v1"); }',
      'try {} catch {} finally { localStorage.getItem("prefs:v1"); }',
      'try { const read = () => localStorage.getItem("prefs:v1"); } catch {}',
      'try { function read() { return localStorage.getItem("prefs:v1"); } } catch {}',
      'try { keys.forEach(async (k) => localStorage.getItem("prefs:v1")); } catch {}',
      'try { setTimeout(() => localStorage.getItem("prefs:v1")); } catch {}',
      'try { promise.then(() => localStorage.getItem("prefs:v1")); } catch {}',
      'try { keys.sort(() => localStorage.getItem("prefs:v1")); } catch {}',
      'try { keys.reduce((a, k) => a, () => localStorage.getItem("prefs:v1")); } catch {}',
      'try { keys.forEach((k) => { const read = () => localStorage.getItem("prefs:v1"); }); } catch {}',
      'keys.forEach((k) => { try {} catch {} localStorage.getItem("prefs:v1"); });',
    ].map((code) => ({ code, errors: [{ messageId: "catchStorage" }] })),
    ...[
      'try { localStorage.setItem("prefs", data); } catch {}',
      'const KEY = "prefs"; try { localStorage.setItem(KEY, data); } catch {}',
      "try { localStorage.setItem(`prefs`, data); } catch {}",
      'const SUFFIX = "settings"; try { localStorage.setItem("prefs:" + SUFFIX, data); } catch {}',
      'try { localStorage.setItem("preview2", data); } catch {}',
    ].map((code) => ({ code, errors: [{ messageId: "versionKey" }] })),
  ].map((testCase) => ({ ...testCase, output: null })),
});
