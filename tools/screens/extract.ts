// Reads the screens and navigation declared in Saifu's sources (T-030-15;
// F-070 plan §5.4).
//
// - A screen renders inside `<Screen id="…">`, naming its `screenId` literally.
// - An edge is declared by `navigate("from", "to", params)` — on the router or
//   destructured from it — naming both literally.
// - An entry from a link into Saifu is `enter("to", params)`, naming a screen
//   whose route is that link.
//
// Reported as problems: a non-literal id or edge; a component module under
// src/screens/ that renders no `<Screen>` and is not a declared part of a screen;
// and anything that moves between screens around the router — `Linking` outside
// the deep-link module, or a navigation library — so no transition escapes the
// manifest.

import { readdirSync, readFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { parseSync } from "oxc-parser";

export interface Edge {
  readonly from: string;
  readonly to: string;
  readonly file: string;
  readonly line: number;
}

export interface Entry {
  readonly to: string;
  readonly file: string;
  readonly line: number;
}

export interface Rendered {
  readonly screenId: string;
  readonly file: string;
  readonly line: number;
}

export interface Problem {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

export interface Extracted {
  readonly edges: readonly Edge[];
  readonly entries: readonly Entry[];
  readonly rendered: readonly Rendered[];
  readonly problems: readonly Problem[];
}

interface Node {
  readonly type: string;
  readonly start: number;
  readonly [key: string]: unknown;
}

/** Modules under src/screens/ that are parts of screens, or the router itself, not screens. */
export const NOT_SCREENS = new Set([
  "Screen.tsx",
  "Disclosure.tsx",
  "router.ts",
  "registry.ts",
  "deep-links.ts",
]);

const DECLARING_CALLS = new Set(["navigate"]);
const ROUTER_MODULE = "src/screens/router.ts";
/** The one module that reads the URLs that open Saifu. */
const DEEP_LINK_MODULE = "src/screens/deep-links.ts";
const FORBIDDEN_IMPORTS = [
  /^@react-navigation\//,
  /^expo-router/,
  /^react-native-navigation/,
  /^expo-linking$/,
];

function isNode(value: unknown): value is Node {
  return typeof value === "object" && value !== null && typeof (value as Node).type === "string";
}

function children(node: Node): Node[] {
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === "parent") return [];
    if (Array.isArray(value)) return value.filter(isNode);
    return isNode(value) ? [value] : [];
  });
}

function stringLiteral(node: unknown): string | null {
  if (!isNode(node)) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "JSXExpressionContainer") return stringLiteral(node.expression);
  return null;
}

function jsxName(node: Node): string | null {
  const name = node.name as Node | undefined;
  return name?.type === "JSXIdentifier" ? (name.name as string) : null;
}

function attribute(opening: Node, name: string): Node | null {
  const attributes = (opening.attributes as Node[] | undefined) ?? [];
  return attributes.find((a) => a.type === "JSXAttribute" && jsxName(a) === name) ?? null;
}

function calleeName(callee: Node): string | null {
  if (callee.type === "Identifier") return callee.name as string;
  if (callee.type === "MemberExpression" || callee.type === "StaticMemberExpression") {
    const property = callee.property as Node;
    return property.type === "Identifier" ? (property.name as string) : null;
  }
  return null;
}

function lineOf(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}

/** Screens, edges and problems in one source file, `file` relative to the repository root. */
export function extractFile(file: string, content: string): Extracted {
  const edges: Edge[] = [];
  const entries: Entry[] = [];
  const rendered: Rendered[] = [];
  const problems: Problem[] = [];
  const result = parseSync(file, content);
  for (const error of result.errors) {
    problems.push({ file, line: 1, message: `cannot parse: ${error.message}` });
  }
  const isRouter = file === ROUTER_MODULE;
  const isDeepLinks = file === DEEP_LINK_MODULE;
  let rendersJsx = false;

  const visit = (node: Node) => {
    const line = lineOf(content, node.start);
    if (node.type === "JSXOpeningElement") {
      rendersJsx = true;
      if (jsxName(node) === "Screen") {
        const id = stringLiteral(attribute(node, "id")?.value);
        if (id === null) {
          problems.push({ file, line, message: "<Screen> must name its `id` as a string literal" });
        } else {
          rendered.push({ screenId: id, file, line });
        }
      }
    }
    if (node.type === "CallExpression" && !isRouter) {
      const name = calleeName(node.callee as Node);
      if (name === "enter") {
        const to = stringLiteral((node.arguments as Node[])[0]);
        if (to === null) {
          problems.push({ file, line, message: "enter must name its screen as a string literal" });
        } else {
          entries.push({ to, file, line });
        }
      }
      if (name !== null && DECLARING_CALLS.has(name)) {
        const [from, to] = (node.arguments as Node[]).map(stringLiteral);
        if (from == null || to == null) {
          problems.push({
            file,
            line,
            message: `${name} must name both screens as string literals`,
          });
        } else {
          edges.push({ from, to, file, line });
        }
      }
    }
    if (node.type === "ImportDeclaration") {
      const source = (node.source as Node).value as string;
      if (!isDeepLinks && FORBIDDEN_IMPORTS.some((pattern) => pattern.test(source))) {
        problems.push({ file, line, message: `navigate with the router, not ${source}` });
      }
      if (source === "react-native" && !isDeepLinks) {
        for (const specifier of (node.specifiers as Node[]) ?? []) {
          const imported = specifier.imported as Node | undefined;
          if (imported?.type === "Identifier" && imported.name === "Linking") {
            problems.push({
              file,
              line,
              message: "Linking moves between screens around the router",
            });
          }
        }
      }
    }
    for (const child of children(node)) visit(child);
  };
  visit(result.program as unknown as Node);

  const inScreens = file.startsWith("src/screens/") && !NOT_SCREENS.has(basename(file));
  if (inScreens && rendersJsx && rendered.length === 0) {
    problems.push({
      file,
      line: 1,
      message: "a screen module must render <Screen id>; a shared part belongs in NOT_SCREENS",
    });
  }
  return { edges, entries, rendered, problems };
}

function sourceFiles(root: string, directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(root, path);
    if (![".ts", ".tsx"].includes(extname(entry.name)) || /\.test\.tsx?$/.test(entry.name)) {
      return [];
    }
    return [path];
  });
}

/** Screens, edges and problems across every source file under `directory`. */
export function extract(root: string, directory = "src"): Extracted {
  const edges: Edge[] = [];
  const entries: Entry[] = [];
  const rendered: Rendered[] = [];
  const problems: Problem[] = [];
  for (const path of sourceFiles(root, directory).sort()) {
    const file = relative(root, join(root, path)).split("\\").join("/");
    const found = extractFile(file, readFileSync(join(root, path), "utf8"));
    edges.push(...found.edges);
    entries.push(...found.entries);
    rendered.push(...found.rendered);
    problems.push(...found.problems);
  }
  return { edges, entries, rendered, problems };
}
