import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, getPostHogOrigin } from "../../shared/posthog-config";

describe("PostHog CSP configuration", () => {
  it("allows only the validated configured HTTPS origin", () => {
    expect(getPostHogOrigin("https://eu.i.posthog.com/capture")).toBe("https://eu.i.posthog.com");
    expect(buildContentSecurityPolicy(false, "https://eu.i.posthog.com/capture")).toContain(
      "connect-src 'self' https://eu.i.posthog.com;",
    );
  });

  it.each(["javascript:alert(1)", "http://posthog.test", "not a url", "https://a:b@test"])(
    "rejects an unsafe host: %s",
    (host) => {
      expect(getPostHogOrigin(host)).toBeUndefined();
      expect(buildContentSecurityPolicy(false, host)).toContain("connect-src 'self';");
    },
  );

  it("adds local Vite connections only in development", () => {
    expect(buildContentSecurityPolicy(true)).toContain("http://localhost:* ws://localhost:*");
    expect(buildContentSecurityPolicy(false)).not.toContain("localhost");
  });
});
