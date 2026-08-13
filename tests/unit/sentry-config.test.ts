import { describe, expect, it } from "vitest";
import { getSentryOrigin } from "../../shared/sentry-config";

describe("getSentryOrigin", () => {
  it("returns only the public ingest origin from a valid DSN", () => {
    expect(getSentryOrigin("https://public-key@o123.ingest.sentry.io/456")).toBe(
      "https://o123.ingest.sentry.io",
    );
  });

  it.each([undefined, "", "not a URL", "javascript:alert(1)"])(
    "ignores a missing, malformed, or unsafe DSN: %s",
    (dsn) => {
      expect(getSentryOrigin(dsn)).toBeUndefined();
    },
  );
});
