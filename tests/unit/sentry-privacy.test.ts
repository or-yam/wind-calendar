import { describe, expect, it } from "vitest";
import {
  isMonitoredDeployment,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from "../../shared/sentry-privacy";
import { createBrowserSentryOptions } from "../../src/instrument";
import { createServerSentryOptions } from "../../server/plugins/sentry";

describe("Sentry privacy configuration", () => {
  it("removes request and user data from events", () => {
    const event = scrubSentryEvent({
      request: {
        url: "https://example.com/api/interpret-config?request=private#fragment",
        query_string: "request=private",
        headers: { cookie: "private" },
        cookies: { session: "private" },
        data: { request: "private prompt" },
      },
      user: { ip_address: "127.0.0.1" },
    });

    expect(event).toEqual({ request: { url: "https://example.com/api/interpret-config" } });
  });

  it("removes query strings and fragments from navigation breadcrumb fields", () => {
    const breadcrumb = scrubSentryBreadcrumb({
      category: "navigation",
      data: {
        from: "/?locations=private#old",
        to: "/forecast?locations=private#new",
        url: "https://example.com/api?prompt=private#response",
        method: "GET",
      },
    });

    expect(breadcrumb.data).toEqual({
      from: "/",
      to: "/forecast",
      url: "https://example.com/api",
      method: "GET",
    });
  });

  it("gates reporting by Vercel deployment environment, not the custom event label", () => {
    expect(isMonitoredDeployment("production")).toBe(true);
    expect(isMonitoredDeployment("preview")).toBe(true);
    expect(isMonitoredDeployment("my-custom-sentry-environment")).toBe(false);
    expect(isMonitoredDeployment(undefined)).toBe(false);

    expect(
      createServerSentryOptions("https://public@example.com/1", "my-custom-sentry-environment")
        .environment,
    ).toBe("my-custom-sentry-environment");
  });

  it.each([createBrowserSentryOptions, createServerSentryOptions])(
    "disables sensitive automatic collection",
    (createOptions) => {
      const options = createOptions("https://public@example.com/1", "preview", "release-1");

      expect(options).toMatchObject({
        environment: "preview",
        release: "release-1",
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: { request: false, response: false },
          httpBodies: [],
          urlQueryParams: false,
          genAI: { inputs: false, outputs: false },
          stackFrameVariables: false,
        },
      });
    },
  );
});
