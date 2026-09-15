// Builds `screens.json`: Saifu's screen manifest (T-030-15; F-070 plan §5.4), in
// the format Ibento's uses (`kippu.screens/1`).

import { SCREENS } from "../../src/screens/registry.ts";
import type { Edge, Extracted, Problem } from "./extract.ts";

export interface ManifestScreen {
  readonly screenId: string;
  /** The deep-link path that opens the screen, as a pattern; `null` when no link opens it. */
  readonly route: string | null;
  readonly title: string;
  /** The screens this screen can navigate to, sorted and unique, without itself. Other apps' as `<app>:<screenId>`. */
  readonly navigatesTo: readonly string[];
}

export interface Manifest {
  readonly format: "kippu.screens/1";
  readonly app: "saifu";
  readonly platform: "native";
  /** In the router's declaration order. */
  readonly screens: readonly ManifestScreen[];
}

type Registry = Readonly<Record<string, { readonly title: string; readonly route: string | null }>>;

const CROSS_APP = /^[a-z]+:[a-z0-9.-]+$/;

export function buildManifest(
  extracted: Extracted,
  screens: Registry = SCREENS,
): { manifest: Manifest; problems: readonly Problem[] } {
  const problems: Problem[] = [...extracted.problems];
  const targets = new Map<string, Set<string>>(Object.keys(screens).map((id) => [id, new Set()]));

  const known = (edge: Edge, end: "from" | "to"): boolean => {
    const id = edge[end];
    if (id in screens || (end === "to" && CROSS_APP.test(id))) return true;
    problems.push({ file: edge.file, line: edge.line, message: `unknown ${end} screen "${id}"` });
    return false;
  };
  for (const edge of extracted.edges) {
    if (known(edge, "from") && known(edge, "to") && edge.from !== edge.to) {
      targets.get(edge.from)?.add(edge.to);
    }
  }

  for (const { to, file, line } of extracted.entries) {
    if (!(to in screens)) {
      problems.push({ file, line, message: `unknown entry screen "${to}"` });
    } else if (screens[to]?.route === null) {
      problems.push({
        file,
        line,
        message: `enter("${to}") names a screen no link opens: give it a route`,
      });
    }
  }

  const renderedIds = new Set<string>();
  for (const { screenId, file, line } of extracted.rendered) {
    if (!(screenId in screens)) {
      problems.push({ file, line, message: `<Screen id="${screenId}"> is not in the registry` });
    }
    renderedIds.add(screenId);
  }
  for (const id of Object.keys(screens)) {
    if (!renderedIds.has(id)) {
      problems.push({
        file: "src/screens/registry.ts",
        line: 1,
        message: `screen "${id}" is rendered by no <Screen id="${id}">`,
      });
    }
  }

  return {
    manifest: {
      format: "kippu.screens/1",
      app: "saifu",
      platform: "native",
      screens: Object.entries(screens).map(([screenId, screen]) => ({
        screenId,
        route: screen.route,
        title: screen.title,
        navigatesTo: [...(targets.get(screenId) ?? [])].sort(),
      })),
    },
    problems,
  };
}

export function serialise(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
