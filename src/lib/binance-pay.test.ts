import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";

import { buildSignature } from "./binance-pay.server";

describe("buildSignature", () => {
  it("firma HMAC-SHA512 en hex mayúsculas del payload canónico", () => {
    const ts = "1700000000000";
    const nonce = "abc123";
    const body = '{"a":1}';
    const secret = "s3cr3t";
    const expected = createHmac("sha512", secret)
      .update(`${ts}\n${nonce}\n${body}\n`)
      .digest("hex")
      .toUpperCase();
    expect(buildSignature(ts, nonce, body, secret)).toBe(expected);
  });

  it("es determinista para las mismas entradas", () => {
    const a = buildSignature("1", "n", "{}", "k");
    const b = buildSignature("1", "n", "{}", "k");
    expect(a).toBe(b);
  });
});
