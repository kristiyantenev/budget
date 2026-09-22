import type { ESTree, SourceCode } from "@oxlint/plugins";
import { resolveImportedFunction } from "./import-resolution.ts";
import { constInitializer, isGlobalName, memberName, unwrapExpression } from "./member-access.ts";
import { resolveVariable } from "./scope.ts";

function isDomType(sourceCode: SourceCode, type: ESTree.TSType): boolean {
  if (type.type === "TSUnionType") {
    const members = type.types.filter(
      (member) => member.type !== "TSNullKeyword" && member.type !== "TSUndefinedKeyword",
    );
    return members.length > 0 && members.every((member) => isDomType(sourceCode, member));
  }
  if (type.type !== "TSTypeReference" || type.typeName.type !== "Identifier") return false;
  if (
    !/^(?:Element|HTMLElement|SVGElement|HTML\w+Element|SVG\w+Element|Document|Window|EventTarget)$/.test(
      type.typeName.name,
    )
  )
    return false;
  const binding = resolveVariable(sourceCode, type.typeName);
  return binding === null || binding.defs.length === 0;
}

/** Recognize browser globals, explicit DOM annotations, DOM factory calls, and typed React refs. */
export function isDomTarget(
  sourceCode: SourceCode,
  node: ESTree.Node,
  seen = new Set<ESTree.Node>(),
): boolean {
  if (
    (node.type === "TSAsExpression" || node.type === "TSTypeAssertion") &&
    isDomType(sourceCode, node.typeAnnotation)
  )
    return true;
  node = unwrapExpression(node);
  if (seen.has(node)) return false;
  seen.add(node);
  if (["window", "document"].some((name) => isGlobalName(sourceCode, node, name))) return true;
  if (node.type === "Identifier") {
    const variable = resolveVariable(sourceCode, node);
    if (variable?.references.some((reference) => reference.isWrite() && !reference.init))
      return false;
    if (
      variable?.identifiers.some(
        (identifier) =>
          identifier.typeAnnotation !== undefined &&
          identifier.typeAnnotation !== null &&
          isDomType(sourceCode, identifier.typeAnnotation.typeAnnotation),
      )
    )
      return true;
    const initializer = constInitializer(sourceCode, node);
    return initializer !== null && isDomTarget(sourceCode, initializer, seen);
  }
  if (node.type === "CallExpression") {
    const callee = unwrapExpression(node.callee);
    return (
      callee.type === "MemberExpression" &&
      ["querySelector", "getElementById", "createElement", "createElementNS"].includes(
        memberName(callee) ?? "",
      ) &&
      isDomTarget(sourceCode, callee.object, seen)
    );
  }
  if (node.type !== "MemberExpression") return false;
  const property = memberName(node);
  if (["document", "body", "documentElement"].includes(property ?? ""))
    return isDomTarget(sourceCode, node.object, seen);
  if (property !== "current") return false;
  const initializer = constInitializer(sourceCode, node.object);
  if (initializer?.type !== "CallExpression") return false;
  const imported = resolveImportedFunction(sourceCode, initializer.callee);
  const type = initializer.typeArguments?.params[0];
  return (
    imported?.source === "react" &&
    imported.name === "useRef" &&
    type !== undefined &&
    isDomType(sourceCode, type)
  );
}
