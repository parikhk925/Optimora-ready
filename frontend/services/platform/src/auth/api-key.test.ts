import { describe, it, expect } from "vitest";
import { generateApiKey, hashSecret, parseApiKey } from "./api-key.js";

describe("API key format", () => {
  it("generates a parseable key whose stored hash matches the secret", () => {
    const { plaintext, prefix, secretHash } = generateApiKey();
    expect(plaintext.startsWith(`opt_${prefix}.`)).toBe(true);
    const parsed = parseApiKey(plaintext);
    expect(parsed?.prefix).toBe(prefix);
    expect(hashSecret(parsed!.secret)).toBe(secretHash);
  });

  it("produces unique keys", () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });

  it("rejects malformed keys (fail-closed)", () => {
    for (const bad of ["", "opt_", "opt_xyz.secret", "nope_abc.def", "opt_abcabcabcabc.short"]) {
      expect(parseApiKey(bad)).toBeNull();
    }
  });
});
