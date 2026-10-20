import { describe, expect, it } from "vitest";
import { scrubErrorBreadcrumb, scrubErrorEvent } from "../../shared/error-observability-privacy";

describe("Error observability privacy", () => {
  it("removes request and user data from events", () => {
    const event = scrubErrorEvent({
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
    const breadcrumb = scrubErrorBreadcrumb({
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
});
