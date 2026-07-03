import { describe, it, expect } from "vitest";
import { generateRefreshToken, hashToken, issueAccessToken, verifyAccessToken } from "./tokens.js";

const SECRET = "unit-test-secret-at-least-32-characters-long!!";

describe("access tokens", () => {
  it("round-trips claims", async () => {
    const token = await issueAccessToken(SECRET, {
      sub: "user-1",
      email: "a@b.com",
      tenantId: "tenant-1",
    });
    const claims = await verifyAccessToken(SECRET, token);
    expect(claims).toMatchObject({
      sub: "user-1",
      email: "a@b.com",
      tenantId: "tenant-1",
      type: "access",
    });
  });

  it("returns null for a token signed with a different secret (fail-closed)", async () => {
    const token = await issueAccessToken(SECRET, { sub: "u", email: "a@b.com", tenantId: "t" });
    expect(await verifyAccessToken("a-different-secret-also-32-characters!!", token)).toBeNull();
  });

  it("returns null for garbage", async () => {
    expect(await verifyAccessToken(SECRET, "not-a-token")).toBeNull();
    expect(await verifyAccessToken(SECRET, "")).toBeNull();
  });
});

describe("opaque tokens", () => {
  it("generates a token whose stored hash matches", () => {
    const { token, hash } = generateRefreshToken();
    expect(hash).toBe(hashToken(token));
  });

  it("produces unique tokens", () => {
    expect(generateRefreshToken().token).not.toBe(generateRefreshToken().token);
  });

  it("hashing is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});
