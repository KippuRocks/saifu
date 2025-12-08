interface Uint8Array<TArrayBuffer extends ArrayBufferLike = ArrayBufferLike> {
  setFromBase64(
    string: string,
    options?: {
      alphabet?: "base64" | "base64url";
      lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
    }
  );
  setFromHex(string: string);

  toBase64(options?: {
    alphabet?: "base64" | "base64url";
    omitPadding?: boolean;
  }): string;
  toHex(): string;
}

interface Uint8ArrayConstructor {
  /**
   * The `Uint8Array.fromBase64()` static method creates a new {@link Uint8Array} object from a
   * [base64-encoded](https://developer.mozilla.org/en-US/docs/Glossary/Base64) string.
   *
   * This method should be preferred over [`Window.atob()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/atob)
   * because it results in a byte array, which is easier to work with than a string containing
   * raw bytes, unless your decoded binary data is actually intended to be ASCII text. If you
   * already have an array buffer allocated and you want to populate it, use the instance method
   * [`Uint8Array.prototype.setFromBase64()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/setFromBase64)
   * instead.
   *
   * @param string A base64 string encoding bytes to convert to a `Uint8Array`. The string must
   * only contain characters in the base64 alphabet, which includes A–Z, a–z, 0–9, and two special
   * characters, which are either `+` and `/` (if using `alphabet: "base64"` in `options`) or `-`
   * and `_` (if using `alphabet: "base64url"` in `options`). It may have padding `=` characters
   * at the end. Any ASCII white space characters within the string are ignored.
   */
  static fromBase64(
    string: string,
    options?: {
      alphabet?: "base64" | "base64url";
      lastChunkHandling?: "loose" | "strict" | "stop-before-partial";
    }
  ): Uint8Array<ArrayBuffer>;
  static fromHex(string: string): Uint8Array<ArrayBuffer>;
}

declare var Uint8Array: Uint8ArrayConstructor;
