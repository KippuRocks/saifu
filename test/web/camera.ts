// A camera for the web smoke test: Chromium's fake capture device, playing a Y4M
// video of one still frame — a receive code (T-030-09) — so Saifu Web's scanner
// reads it through `getUserMedia` as it would read another holder's phone.

import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { textQr } from "../../src/passes/qr.ts";
import { receiveCode } from "../../src/receive/receive-code.ts";

/** The account the camera shows a receive code for. */
export const CAMERA_RECEIVER = "b2c3d4e5".repeat(8);

export const CAMERA_VIDEO = join(tmpdir(), "saifu-web-receive-code.y4m");

/** Writes `CAMERA_VIDEO`: 4:2:0 frames, black modules on white, with a quiet zone. */
export function writeCameraVideo(): string {
  const matrix = textQr(receiveCode(CAMERA_RECEIVER));
  const quiet = 4;
  const scale = 8;
  const side = (matrix.size + 2 * quiet) * scale;
  const width = side + (side % 2);
  const luma = Buffer.alloc(width * width, 235);
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (!matrix.dark[row * matrix.size + col]) continue;
      for (let y = 0; y < scale; y++) {
        const line = ((row + quiet) * scale + y) * width;
        luma.fill(16, line + (col + quiet) * scale, line + (col + quiet + 1) * scale);
      }
    }
  }
  const chroma = Buffer.alloc((width / 2) * (width / 2) * 2, 128);
  const header = Buffer.from(`YUV4MPEG2 W${width} H${width} F30:1 Ip A1:1 C420jpeg\n`);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), luma, chroma]);
  writeFileSync(CAMERA_VIDEO, Buffer.concat([header, frame, frame]));
  return CAMERA_VIDEO;
}
