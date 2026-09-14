import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { installPolyfills } from "./polyfills.ts";

function bareRuntime(): typeof globalThis {
  return { TextEncoder, TextDecoder } as unknown as typeof globalThis;
}

describe("runtime polyfills", () => {
  it("installs crypto.getRandomValues over the platform random source", () => {
    const target = bareRuntime();
    const calls: number[] = [];
    installPolyfills(target, (bytes) => {
      calls.push(bytes.length);
      bytes.fill(7);
    });
    const words = target.crypto.getRandomValues(new Uint32Array(2));
    expect(calls).toEqual([8]);
    expect([...words]).toEqual([0x07070707, 0x07070707]);
    expect(() => target.crypto.getRandomValues(new Float32Array(1) as never)).toThrow(TypeError);
  });

  it("installs a SHA-256 crypto.subtle.digest that matches Node's", async () => {
    const target = bareRuntime();
    installPolyfills(target, () => {});
    const data = new TextEncoder().encode("a holder's user id");
    const digest = new Uint8Array(await target.crypto.subtle.digest("SHA-256", data));
    expect(Buffer.from(digest).toString("hex")).toBe(
      createHash("sha256").update(data).digest("hex"),
    );
    expect(digest.buffer.byteLength).toBe(32);
    await expect(target.crypto.subtle.digest("SHA-1", data)).rejects.toThrow(TypeError);
  });

  it("keeps a runtime's own implementations", () => {
    const own = { getRandomValues: () => null, subtle: { digest: async () => new ArrayBuffer(0) } };
    const target = { ...bareRuntime(), crypto: own } as unknown as typeof globalThis;
    installPolyfills(target, () => {
      throw new Error("unused");
    });
    expect(target.crypto).toBe(own);
    expect(target.crypto.getRandomValues).toBe(own.getRandomValues);
  });

  it("fails loudly when TextDecoder is missing", () => {
    const target = { TextEncoder } as unknown as typeof globalThis;
    expect(() => installPolyfills(target, () => {})).toThrow(/TextDecoder/);
  });
});
