import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scan } from "./scan.ts";
import { matches } from "./vocabulary.ts";

const terms = (text: string) => matches(text).map((m) => [m.rule.trace, m.term.toLowerCase()]);

describe("vocabulary", () => {
  it("REQ-SP-1a: fee vocabulary is forbidden", () => {
    expect(terms("No gas needed")).toEqual([["REQ-SP-1a", "gas"]]);
    expect(terms("A small fee applies")).toEqual([["REQ-SP-1a", "fee"]]);
    expect(terms("Network Fees")).toEqual([["REQ-SP-1a", "fees"]]);
    expect(terms("Top up first")).toEqual([["REQ-SP-1a", "top up"]]);
    expect(terms("top-up")).toEqual([["REQ-SP-1a", "top-up"]]);
    expect(terms("topup")).toEqual([["REQ-SP-1a", "topup"]]);
    expect(terms("Fund your account")).toEqual([["REQ-SP-1a", "fund"]]);
    expect(terms("Funding required")).toEqual([["REQ-SP-1a", "funding"]]);
    expect(terms("Your balance")).toEqual([["REQ-SP-1a", "balance"]]);
  });

  it("REQ-TM-2: trust claims are forbidden", () => {
    expect(terms("Trustless tickets")).toEqual([["REQ-TM-2", "trustless"]]);
    expect(terms("trust-less")).toEqual([["REQ-TM-2", "trust-less"]]);
    expect(terms("tamper-proof")).toEqual([["REQ-TM-2", "tamper-proof"]]);
    expect(terms("Tamperproof")).toEqual([["REQ-TM-2", "tamperproof"]]);
    expect(terms("fully decentralised")).toEqual([["REQ-TM-2", "decentralised"]]);
    expect(terms("Decentralized")).toEqual([["REQ-TM-2", "decentralized"]]);
    expect(terms("decentralisation")).toEqual([["REQ-TM-2", "decentralisation"]]);
  });

  it("matches whole words only", () => {
    for (const text of [
      "Refund",
      "Keychain",
      "Gaslight",
      "Coffee",
      "Feedback",
      "Fundamental",
      "Stop updating",
      "Trust",
      "Tamper-evident log",
      "Centralised",
    ]) {
      expect(terms(text), text).toEqual([]);
    }
  });
});

describe("scan", () => {
  let root: string;

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function project(files: Record<string, string>) {
    root = mkdtempSync(join(tmpdir(), "copy-lint-"));
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(root, name, ".."), { recursive: true });
      writeFileSync(join(root, name), content);
    }
    return root;
  }

  const found = (violations: ReturnType<typeof scan>) =>
    violations.map(({ file, line, term }) => `${file}:${line}:${term}`);

  it("finds terms in string literals, template text, JSX text and JSX attributes", () => {
    project({
      "src/Screen.tsx": [
        'import { Text } from "react-native";',
        'const a = "No gas";',
        "const b = `Trustless \u0024{a}`;",
        "export const Screen = () => (",
        '  <Text accessibilityLabel="Pay the fee">',
        "    Fully decentralised",
        "  </Text>",
        ");",
      ].join("\n"),
    });
    expect(found(scan(root, ["src"]))).toEqual([
      "src/Screen.tsx:2:gas",
      "src/Screen.tsx:3:Trustless",
      "src/Screen.tsx:5:fee",
      "src/Screen.tsx:6:decentralised",
    ]);
  });

  it("finds terms in the Expo configuration", () => {
    project({ "app.json": JSON.stringify({ expo: { name: "Top up" } }, null, 2) });
    expect(found(scan(root, ["app.json"]))).toEqual(["app.json:3:Top up"]);
  });

  it("skips module specifiers, type-level literals and tests", () => {
    project({
      "src/a.ts": [
        'import gas from "gas";',
        'export * from "fees";',
        'export { x } from "trustless";',
        'type Kind = "balance";',
        "export const kind: Kind = undefined as never;",
      ].join("\n"),
      "src/a.test.ts": 'const t = "gas";',
      "src/node_modules/b.ts": 'const t = "gas";',
    });
    expect(found(scan(root, ["src"]))).toEqual([]);
  });

  it("passes the app as it stands", () => {
    expect(found(scan(process.cwd(), ["index.ts", "src", "app.json"]))).toEqual([]);
  });
});
