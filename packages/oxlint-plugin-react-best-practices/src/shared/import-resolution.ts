import type { ESTree, SourceCode } from "@oxlint/plugins";
import { memberName, unwrapExpression } from "./member-access.ts";
import { resolveVariable } from "./scope.ts";

export type ImportedFunction = { source: string; name: string };

/** Resolve direct imports and static namespace members without confusing shadowed names. */
export function resolveImportedFunction(
  sourceCode: SourceCode,
  callee: ESTree.Node,
): ImportedFunction | null {
  callee = unwrapExpression(callee);
  let identifier: Extract<ESTree.Node, { type: "Identifier" }>;
  let member: string | null = null;
  if (callee.type === "Identifier") {
    identifier = callee;
  } else if (callee.type === "MemberExpression" && callee.object.type === "Identifier") {
    identifier = callee.object;
    member = memberName(callee);
    if (member === null) return null;
  } else {
    return null;
  }

  const variable = resolveVariable(sourceCode, identifier);
  if (variable === null) return null;
  for (const definition of variable.defs) {
    if (definition.type !== "ImportBinding") continue;
    const declaration = definition.parent;
    if (declaration?.type !== "ImportDeclaration" || declaration.importKind === "type") continue;
    const specifier = definition.node;
    let name: string;
    if (
      specifier.type === "ImportSpecifier" &&
      member === null &&
      specifier.importKind !== "type"
    ) {
      name =
        specifier.imported.type === "Identifier"
          ? specifier.imported.name
          : specifier.imported.value;
    } else if (specifier.type === "ImportDefaultSpecifier") {
      name = member ?? "default";
    } else if (specifier.type === "ImportNamespaceSpecifier" && member !== null) {
      name = member;
    } else {
      continue;
    }
    return { source: declaration.source.value, name };
  }
  return null;
}
