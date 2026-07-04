import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("session lib dev mode", () => {
  it("isAuthConfigured returns false when PLATFORM_API_URL is unset", async () => {
    vi.stubEnv("PLATFORM_API_URL", undefined);

    const { isAuthConfigured } = await import("./session.js");
    expect(isAuthConfigured()).toBe(false);
  });

  it("getDevSession returns a valid stub session shape", async () => {
    const { getDevSession } = await import("./session.js");
    const s = getDevSession();
    expect(typeof s.user.id).toBe("string");
    expect(typeof s.user.email).toBe("string");
    expect(typeof s.tenantId).toBe("string");
    expect(typeof s.accessToken).toBe("string");
  });

  it("getDevSession never returns a real API key or secret token", async () => {
    const { getDevSession } = await import("./session.js");
    const s = getDevSession();
    const json = JSON.stringify(s);
    expect(json).not.toMatch(/opt_[a-f0-9]{12}/);
  });

  it("dev session accessToken is never a real JWT", async () => {
    const { getDevSession } = await import("./session.js");
    const s = getDevSession();
    expect(s.accessToken.split(".").length).not.toBe(3);
  });
});

describe("auth mode gates", () => {
  it("allows local stub only outside production when PLATFORM_API_URL is unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PLATFORM_API_URL", undefined);

    const { isLocalDevStubEnabled } = await import("./auth-mode.js");
    expect(isLocalDevStubEnabled()).toBe(true);
  });

  it("does not allow local stub in production when PLATFORM_API_URL is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PLATFORM_API_URL", undefined);

    const { isLocalDevStubEnabled } = await import("./auth-mode.js");
    expect(isLocalDevStubEnabled()).toBe(false);
  });
});

describe("middleware logic no secrets in session lib", () => {
  it("getDevSession does not embed an opt_ API key", async () => {
    const { getDevSession } = await import("./session.js");
    const token = getDevSession().accessToken;
    expect(token).not.toMatch(/^opt_/);
  });

  it("getDevSession email does not contain a real domain secret", async () => {
    const { getDevSession } = await import("./session.js");
    const email = getDevSession().user.email;
    expect(email).toContain("local");
  });
});

describe("route handler stubs safe in dev mode", () => {
  it("session context exports correct shape", async () => {
    const mod = await import("./session-context.js");
    expect(typeof mod.SessionProvider).toBe("function");
    expect(typeof mod.useSession).toBe("function");
  });
});
