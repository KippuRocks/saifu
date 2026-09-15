import { encodeSignedPass } from "@ticketto/profile-v0";
import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { matches } from "../../tools/copy-lint/vocabulary.ts";
import { RECEIVE_COPY } from "../copy/receive.ts";
import { type QrMatrix, textQr } from "../passes/qr.ts";
import { accountFromReceiveCode, groupedAccount, receiveCode } from "./receive-code.ts";

const ACCOUNT = "a1b2c3d4".repeat(8);

function scan(matrix: QrMatrix): string | null {
  const quiet = 4;
  const scale = 4;
  const side = (matrix.size + 2 * quiet) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.dark[row * matrix.size + col]) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const at = (((row + quiet) * scale + y) * side + (col + quiet) * scale + x) * 4;
          pixels.fill(0, at, at + 3);
        }
      }
    }
  }
  return jsQR(pixels, side, side)?.data ?? null;
}

describe("T-030-09 receive QR", () => {
  it("US-D1: another device scans the receive code and fills the receiver with the account", () => {
    const scanned = scan(textQr(receiveCode(ACCOUNT)));
    expect(scanned).toBe(`ticketto:account:${ACCOUNT}`);
    expect(accountFromReceiveCode(scanned ?? "")).toBe(ACCOUNT);
  });

  it("holds the account and nothing else", () => {
    expect(receiveCode(ACCOUNT)).toBe(`ticketto:account:${ACCOUNT}`);
    expect(() => receiveCode("not an account")).toThrow(TypeError);
  });

  it("fills no receiver from a code that does not name an account", () => {
    for (const text of [
      ACCOUNT, // a bare id: a ticket id or an event id looks the same
      `ticketto:ticket:${ACCOUNT}`,
      `ticketto:account:${ACCOUNT.toUpperCase()}`,
      `ticketto:account:${ACCOUNT.slice(2)}`,
      "https://saifu.kippu.example/invitations#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      new TextDecoder().decode(
        encodeSignedPass({
          pass: {
            ticket: ACCOUNT,
            holder: ACCOUNT,
            id: "00".repeat(16),
            notBefore: 0,
            notAfter: 60_000,
          } as never,
          authorisation: new Uint8Array(4) as never,
        }),
      ),
    ]) {
      expect(accountFromReceiveCode(text), text).toBeNull();
    }
    expect(accountFromReceiveCode(`  ticketto:account:${ACCOUNT}\n`)).toBe(ACCOUNT);
  });

  it("groups the account for comparing by eye, and its copy passes the lint", () => {
    expect(groupedAccount(ACCOUNT).split(" ")).toHaveLength(8);
    expect(matches(Object.values(RECEIVE_COPY).join("\n"))).toEqual([]);
  });
});
