import { describe, it, expect } from "vitest";
import { getSessionCookieOptions } from "../_core/cookies";

describe("Cookie options", () => {
  it("uses secure and sameSite=none on https", () => {
    const opts = getSessionCookieOptions({ protocol: "https", headers: {} } as any);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("none");
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe("/");
  });
  it("uses sameSite=lax on http", () => {
    const opts = getSessionCookieOptions({ protocol: "http", headers: {} } as any);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe("lax");
  });
  it("detects https via x-forwarded-proto", () => {
    const opts = getSessionCookieOptions({ protocol: "http", headers: { "x-forwarded-proto": "https" } } as any);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("none");
  });
});
