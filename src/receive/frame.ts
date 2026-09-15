// One camera frame, read for a QR code (T-030-18): Saifu Web's scanner draws the
// camera's picture into a canvas and hands its pixels here.

import jsQR from "jsqr";

/** What the frame's QR code means to `parse`, or `null` with no code, or a code of another kind. */
export function readFrame<T>(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  parse: (text: string) => T | null,
): T | null {
  const code = jsQR(pixels, width, height, { inversionAttempts: "attemptBoth" });
  return code === null ? null : parse(code.data);
}
