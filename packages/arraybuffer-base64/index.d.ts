
declare global {
  interface Uint8ArrayConstructor {
    fromBase64(base64: string): Uint8Array;
    fromHex(hex: string): Uint8Array;
  }

  interface Uint8Array {
    toBase64(): string;
    toHex(): string;
    setFromHex(hex: string): void;
    setFromBase64(base64: string): void;
  }
}

export { };