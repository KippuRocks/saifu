import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extract, extractFile } from "./extract.ts";
import { buildManifest, serialise } from "./manifest.ts";

const REGISTRY = {
  "a.one": { title: "One", route: null },
  "a.two": { title: "Two", route: "/two/:id" },
};

const messages = (source: string, file = "src/screens/Thing.tsx") => {
  const extracted = extractFile(file, source);
  return buildManifest(extracted, REGISTRY).problems.map((p) => p.message);
};

describe("T-030-15 screen manifest", () => {
  it("records rendered screens and declared edges, sorted and without self-edges", () => {
    const source = [
      'import { Screen } from "./Screen.tsx";',
      "export function One({ router }) {",
      '  router.navigate("a.one", "a.two", { id: "x" });',
      '  navigate("a.one", "a.one", {});',
      '  navigate("a.one", "ichiba:checkout.review", {});',
      '  return <Screen id="a.one"><Screen id="a.two" /></Screen>;',
      "}",
    ].join("\n");
    const { manifest, problems } = buildManifest(
      extractFile("src/screens/One.tsx", source),
      REGISTRY,
    );
    expect(problems).toEqual([]);
    expect(manifest).toEqual({
      format: "kippu.screens/1",
      app: "saifu",
      platforms: ["native", "web"],
      screens: [
        {
          screenId: "a.one",
          route: null,
          title: "One",
          navigatesTo: ["a.two", "ichiba:checkout.review"],
        },
        { screenId: "a.two", route: "/two/:id", title: "Two", navigatesTo: [] },
      ],
    });
  });

  it("fails when a screen lacks an id", () => {
    expect(messages('export const X = () => <Screen id="a.one"><View /></Screen>;')).toEqual([
      'screen "a.two" is rendered by no <Screen id="a.two">',
    ]);
    expect(messages("export const X = () => <View />;")).toContain(
      "a screen module must render <Screen id>; a shared part belongs in NOT_SCREENS",
    );
    expect(messages("const id = 'a.one'; export const X = () => <Screen id={id} />;")).toContain(
      "<Screen> must name its `id` as a string literal",
    );
    expect(
      messages(
        'export const X = () => <><Screen id="a.one" /><Screen id="a.two" /><Screen id="a.three" /></>;',
      ),
    ).toEqual(['<Screen id="a.three"> is not in the registry']);
  });

  it("fails on undeclared, non-literal or unknown navigation", () => {
    const ok = '<><Screen id="a.one" /><Screen id="a.two" /></>';
    expect(
      messages(`const to = "a.two"; navigate("a.one", to, {}); export const X = () => ${ok};`),
    ).toContain("navigate must name both screens as string literals");
    expect(messages(`navigate("a.one", "b.nowhere", {}); export const X = () => ${ok};`)).toContain(
      'unknown to screen "b.nowhere"',
    );
    expect(
      messages(`import { Linking } from "react-native"; export const X = () => ${ok};`),
    ).toContain("Linking moves between screens around the router");
    expect(
      messages(
        `import { useNavigation } from "@react-navigation/native"; export const X = () => ${ok};`,
      ),
    ).toContain("navigate with the router, not @react-navigation/native");
  });

  it("records entries from links, and refuses one into a screen no link opens", () => {
    const ok = '<><Screen id="a.one" /><Screen id="a.two" /></>';
    expect(messages(`router.enter("a.two", { id }); export const X = () => ${ok};`)).toEqual([]);
    expect(messages(`enter("a.one", {}); export const X = () => ${ok};`)).toContain(
      'enter("a.one") names a screen no link opens: give it a route',
    );
    expect(messages(`const s = "a.two"; enter(s, {}); export const X = () => ${ok};`)).toContain(
      "enter must name its screen as a string literal",
    );
    expect(
      messages(`import * as Linking from "expo-linking"; export const X = () => ${ok};`),
    ).toContain("navigate with the router, not expo-linking");
    expect(
      messages(
        'import * as Linking from "expo-linking"; export const x = 1;',
        "src/screens/deep-links.ts",
      ),
    ).not.toContain("navigate with the router, not expo-linking");
  });

  it("screens.json is what Saifu's sources generate", async () => {
    const root = join(import.meta.dirname, "..", "..");
    const { manifest, problems } = buildManifest(extract(root));
    expect(problems).toEqual([]);
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(join(root, "screens.json"), "utf8")).toBe(serialise(manifest));
  });
});
