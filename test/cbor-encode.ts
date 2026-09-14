// A CBOR encoder for test fixtures: text-keyed maps, byte and text strings, and
// small unsigned integers — what an attestation object is made of.

export type Encodable = number | string | Uint8Array | Encodable[] | { [key: string]: Encodable };

function head(major: number, length: number): number[] {
  if (length < 24) return [(major << 5) | length];
  if (length < 256) return [(major << 5) | 24, length];
  if (length < 65536) return [(major << 5) | 25, length >> 8, length & 255];
  return [
    (major << 5) | 26,
    (length >>> 24) & 255,
    (length >>> 16) & 255,
    (length >>> 8) & 255,
    length & 255,
  ];
}

export function encodeCbor(value: Encodable): Uint8Array {
  const out: number[] = [];
  const write = (item: Encodable): void => {
    if (typeof item === "number") {
      if (!Number.isInteger(item) || item < 0) throw new TypeError("unsigned integers only");
      out.push(...head(0, item));
    } else if (typeof item === "string") {
      const bytes = new TextEncoder().encode(item);
      out.push(...head(3, bytes.length), ...bytes);
    } else if (item instanceof Uint8Array) {
      out.push(...head(2, item.length), ...item);
    } else if (Array.isArray(item)) {
      out.push(...head(4, item.length));
      item.forEach(write);
    } else {
      const entries = Object.entries(item);
      out.push(...head(5, entries.length));
      for (const [key, entry] of entries) {
        write(key);
        write(entry);
      }
    }
  };
  write(value);
  return Uint8Array.from(out);
}
