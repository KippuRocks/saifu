// A minimal CBOR (RFC 8949) decoder: enough to read a WebAuthn attestation
// object and the COSE key inside its authenticator data. Definite lengths only;
// WebAuthn requires CTAP2 canonical CBOR, which never uses indefinite lengths.

export type CborValue =
  | number
  | bigint
  | boolean
  | null
  | undefined
  | string
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>;

export class CborError extends Error {
  override readonly name = "CborError";
}

/** Decodes one item at `offset`, returning it and the offset just past it. */
export function decodeItem(bytes: Uint8Array, offset = 0): { value: CborValue; end: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = offset;

  const need = (n: number) => {
    if (at + n > bytes.length) throw new CborError("unexpected end of CBOR input");
  };

  const argument = (info: number): number | bigint => {
    if (info < 24) return info;
    switch (info) {
      case 24:
        need(1);
        return view.getUint8(at++);
      case 25:
        need(2);
        at += 2;
        return view.getUint16(at - 2);
      case 26:
        need(4);
        at += 4;
        return view.getUint32(at - 4);
      case 27: {
        need(8);
        at += 8;
        const big = view.getBigUint64(at - 8);
        return big <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(big) : big;
      }
      default:
        throw new CborError(`unsupported CBOR additional information ${info}`);
    }
  };

  const length = (info: number): number => {
    const n = argument(info);
    if (typeof n !== "number") throw new CborError("CBOR length too large");
    return n;
  };

  const item = (): CborValue => {
    need(1);
    const initial = view.getUint8(at++);
    const major = initial >> 5;
    const info = initial & 31;
    switch (major) {
      case 0:
        return argument(info);
      case 1: {
        const n = argument(info);
        return typeof n === "number" ? -1 - n : -1n - n;
      }
      case 2: {
        const n = length(info);
        need(n);
        at += n;
        return bytes.slice(at - n, at);
      }
      case 3: {
        const n = length(info);
        need(n);
        at += n;
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(at - n, at));
      }
      case 4: {
        const n = length(info);
        const array: CborValue[] = [];
        for (let i = 0; i < n; i++) array.push(item());
        return array;
      }
      case 5: {
        const n = length(info);
        const map = new Map<CborValue, CborValue>();
        for (let i = 0; i < n; i++) {
          const key = item();
          map.set(key, item());
        }
        return map;
      }
      case 6:
        argument(info);
        return item();
      default:
        switch (info) {
          case 20:
            return false;
          case 21:
            return true;
          case 22:
            return null;
          case 23:
            return undefined;
          default:
            throw new CborError(`unsupported CBOR simple value ${info}`);
        }
    }
  };

  const value = item();
  return { value, end: at };
}

/** Decodes exactly one item spanning all of `bytes`. */
export function decode(bytes: Uint8Array): CborValue {
  const { value, end } = decodeItem(bytes);
  if (end !== bytes.length) throw new CborError("trailing bytes after CBOR item");
  return value;
}
