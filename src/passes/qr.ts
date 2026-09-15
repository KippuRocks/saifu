// The QR code a signed access pass is shown as (T-030-07; AD-13): the pass's
// presented bytes — `@ticketto/profile-v0`'s `encodeSignedPass` — as a single
// binary-mode (byte) segment, error correction level M. A pass-webauthn pass is
// about 445 bytes, QR version 16 at level M (features/003-profile-v0 plan §5.7).

import { create } from "qrcode";

export interface QrMatrix {
  /** Modules per side, without the quiet zone. */
  readonly size: number;
  /** Row-major; `true` is a dark module. */
  readonly dark: readonly boolean[];
  readonly version: number;
}

export function passQr(bytes: Uint8Array): QrMatrix {
  const code = create([{ data: bytes, mode: "byte" }], { errorCorrectionLevel: "M" });
  const { size, data } = code.modules;
  return { size, dark: Array.from(data, (module) => module === 1), version: code.version };
}

/** An SVG path drawing every dark module as a unit square, offset by a quiet zone. */
export function qrPath(matrix: QrMatrix, quietZone = 4): string {
  let path = "";
  for (let row = 0; row < matrix.size; row++) {
    let run = -1;
    for (let col = 0; col <= matrix.size; col++) {
      const dark = col < matrix.size && matrix.dark[row * matrix.size + col] === true;
      if (dark && run < 0) run = col;
      if (!dark && run >= 0) {
        path += `M${run + quietZone} ${row + quietZone}h${col - run}v1h${run - col}z`;
        run = -1;
      }
    }
  }
  return path;
}
