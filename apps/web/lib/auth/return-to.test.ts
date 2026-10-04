import { expect, test } from "vitest";
import { resolveReturnTo } from "./return-to";

const baseURL = "https://budget.example/api/auth";

test.each([
  ["/", "https://budget.example/"],
  ["/budgets?month=2026-09", "https://budget.example/budgets?month=2026-09"],
  ["/budgets?filter=a%26b#category", "https://budget.example/budgets?filter=a%26b"],
  ["/budgets/../accounts", "https://budget.example/accounts"],
  ["/..//evil.example", "https://budget.example//evil.example"],
  ["/%2e%2e//evil.example", "https://budget.example//evil.example"],
  ["//budget.example/budgets", "https://budget.example/budgets"],
])("resolves %j within the application origin", (value, expected) => {
  const result = resolveReturnTo(value, baseURL);

  expect(result).toBe(expected);
  expect(new URL(result).origin).toBe("https://budget.example");
});

test.each([
  "",
  "budgets",
  "https://evil.example/budgets",
  "javascript:alert(1)",
  "//evil.example",
  "///evil.example",
  "/\\evil.example",
  "/\n/evil.example",
  "/\t/evil.example",
  "//budget.example.evil.example",
  "//budget.example@evil.example",
  "//budget.example:444/budgets",
  "//[",
  "//evil.example:invalid",
])("falls back to the application root for %j", (value) => {
  expect(resolveReturnTo(value, baseURL)).toBe("https://budget.example/");
});

test("falls back for missing or non-string form values", () => {
  expect(resolveReturnTo(null, baseURL)).toBe("https://budget.example/");
  expect(resolveReturnTo(new File([], "return-to"), baseURL)).toBe("https://budget.example/");
});

test("uses the configured development origin and port", () => {
  expect(resolveReturnTo("/budgets?month=2026-09", "http://localhost:3000/api/auth")).toBe(
    "http://localhost:3000/budgets?month=2026-09",
  );
});
