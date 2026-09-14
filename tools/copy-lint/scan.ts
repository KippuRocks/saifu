// Extracts the strings an app could show a holder, and checks each against the
// vocabulary.
//
// A string is anything a user could be shown: every string literal, template
// literal text, JSX text and JSX attribute string in the TypeScript sources, and
// every string value in the Expo app configuration — which becomes native copy
// such as the app name and permission prompts. Import and export specifiers and
// type-level literals are code, not copy, and are skipped. Tests are skipped:
// they must be able to name the terms they check for.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { parseSync } from "oxc-parser";
import { type Match, matches } from "./vocabulary.ts";

export interface Violation extends Match {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

interface Node {
  readonly type: string;
  readonly start: number;
  readonly [key: string]: unknown;
}

const SOURCE = new Set([".ts", ".tsx"]);
const SKIPPED_DIRECTORIES = new Set(["node_modules", "ios", "android", "dist", "build"]);

/** Every violation under `paths`, which may be files or directories. */
export function scan(root: string, paths: readonly string[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of paths.flatMap((path) => files(join(root, path)))) {
    const name = relative(root, file);
    const content = readFileSync(file, "utf8");
    const strings = extname(file) === ".json" ? jsonStrings(content) : sourceStrings(file, content);
    for (const { text, offset } of strings) {
      for (const match of matches(text)) {
        violations.push({
          ...match,
          file: name,
          line: lineOf(content, offset + match.index),
          text,
        });
      }
    }
  }
  return violations;
}

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) || entry.name.startsWith(".") ? [] : files(child);
    }
    if (!SOURCE.has(extname(entry.name)) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [child];
  });
}

interface Located {
  readonly text: string;
  readonly offset: number;
}

function sourceStrings(file: string, content: string): Located[] {
  const { program, errors } = parseSync(file, content);
  if (errors.length > 0) {
    throw new Error(`${file}: cannot parse — ${errors.map((e) => e.message).join("; ")}`);
  }
  const found: Located[] = [];
  walk(program as unknown as Node, (node) => {
    switch (node.type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
      case "ExportNamedDeclaration":
        // Only the specifier is skipped; a declaration's body is still copy.
        return node.type === "ExportNamedDeclaration" && node.declaration ? "source" : "skip";
      case "TSLiteralType":
      case "TSImportType":
      case "TSExternalModuleReference":
      case "TSModuleDeclaration":
        return "skip";
      case "Literal":
        if (typeof node.value === "string") found.push({ text: node.value, offset: node.start });
        return;
      case "TemplateElement": {
        const value = node.value as { cooked: string | null; raw: string };
        found.push({ text: value.cooked ?? value.raw, offset: node.start });
        return;
      }
      case "JSXText":
        found.push({ text: String(node.value), offset: node.start });
        return;
      default:
        return;
    }
  });
  return found;
}

function jsonStrings(content: string): Located[] {
  const found: Located[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      found.push({ text: value, offset: Math.max(0, content.indexOf(JSON.stringify(value))) });
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value !== null && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(JSON.parse(content));
  return found;
}

/** Depth-first walk. A visitor returns "skip" to prune a subtree, "source" to prune only `source`. */
function walk(node: Node, visit: (node: Node) => "skip" | "source" | undefined): void {
  const verdict = visit(node);
  if (verdict === "skip") return;
  for (const [key, child] of Object.entries(node)) {
    if (verdict === "source" && key === "source") continue;
    for (const item of Array.isArray(child) ? child : [child]) {
      if (item !== null && typeof item === "object" && typeof item.type === "string") {
        walk(item as Node, visit);
      }
    }
  }
}

function lineOf(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) if (content[i] === "\n") line++;
  return line;
}
