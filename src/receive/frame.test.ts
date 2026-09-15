import { describe, expect, it } from "vitest";
import { type QrMatrix, textQr } from "../passes/qr.ts";
import { readFrame } from "./frame.ts";
import { accountFromReceiveCode, receiveCode } from "./receive-code.ts";

const ACCOUNT = "a1b2c3d4".repeat(8);

/** A camera frame showing `matrix`, dark on light, or inverted. */
function frame(matrix: QrMatrix, inverted = false) {
  const quiet = 4;
  const scale = 4;
  const side = (matrix.size + 2 * quiet) * scale;
  const [light, dark] = inverted ? [0, 255] : [255, 0];
  const pixels = new Uint8ClampedArray(side * side * 4).fill(light);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.dark[row * matrix.size + col]) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const at = (((row + quiet) * scale + y) * side + (col + quiet) * scale + x) * 4;
          pixels.fill(dark, at, at + 3);
        }
      }
    }
  }
  return { pixels, side };
}

describe("T-030-18 Saifu Web camera frames", () => {
  it("US-D1: a frame showing a receive code gives its account", () => {
    const { pixels, side } = frame(textQr(receiveCode(ACCOUNT)));
    expect(readFrame(pixels, side, side, accountFromReceiveCode)).toBe(ACCOUNT);
    const inverted = frame(textQr(receiveCode(ACCOUNT)), true);
    expect(readFrame(inverted.pixels, inverted.side, inverted.side, accountFromReceiveCode)).toBe(
      ACCOUNT,
    );
  });

  it("ignores a frame with no code, or a code of another kind", () => {
    const blank = new Uint8ClampedArray(64 * 64 * 4).fill(255);
    expect(readFrame(blank, 64, 64, accountFromReceiveCode)).toBeNull();
    const { pixels, side } = frame(textQr(ACCOUNT));
    expect(readFrame(pixels, side, side, accountFromReceiveCode)).toBeNull();
  });
});
