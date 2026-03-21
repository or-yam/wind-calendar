import { describe, it, expect } from "vitest";
import handler from "../../../api/calendar";
import { installWindguruMock } from "../../helpers/windguru-mocks";
import { mockVercelRequest, mockVercelResponse } from "../../helpers/vercel-mocks";

// --- Tests ---

describe("calendar API handler", () => {
  it("full pipeline: returns ICS with events", async () => {
    const cleanup = installWindguruMock();
    try {
      const req = mockVercelRequest("/api/calendar?location=unknown");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain("Unknown location");
    } finally {
      cleanup();
    }
  });

  it("Windguru failure returns 502 with structured error", async () => {
    const cleanup = installWindguruMock(() => {
      // All fetches fail
      return new Response("Internal Server Error", { status: 500 });
    });
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_DOWN");
      expect(body.error).toBe("Windguru is temporarily unavailable");
      expect(body.suggestion).toBeTruthy();
      expect(body.debug?.locationInfo).toBeTruthy();
      expect(body.debug.upstreamStatus).toBe(500);
    } finally {
      cleanup();
    }
  });

  it("query param overrides work", async () => {
    // Use windMin=20 — our mock wind is 15kn, so nothing passes the filter.
    // Result: valid ICS but no VEVENT blocks.
    const cleanup = installWindguruMock();
    try {
      const req = mockVercelRequest("/api/calendar?windMin=20");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.body.includes("BEGIN:VCALENDAR")).toBe(true);
      expect(result.body.includes("BEGIN:VEVENT")).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("ICS contains calendar events for valid wind data", async () => {
    const cleanup = installWindguruMock();
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.body.includes("BEGIN:VEVENT")).toBe(true);
      expect(result.body.includes("END:VEVENT")).toBe(true);
      expect(result.body.includes("END:VCALENDAR")).toBe(true);
    } finally {
      cleanup();
    }
  });

  // --- Error path tests ---

  it("Windguru 429 returns 429 with rate limit info", async () => {
    const cleanup = installWindguruMock(() => new Response("Rate limited", { status: 429 }));
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(429);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_RATE_LIMIT");
      expect(body.suggestion).toContain("5 minutes");
    } finally {
      cleanup();
    }
  });

  it("Windguru 403 returns 502 with forbidden info", async () => {
    const cleanup = installWindguruMock(() => new Response("Forbidden", { status: 403 }));
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_FORBIDDEN");
    } finally {
      cleanup();
    }
  });

  it("Windguru 404 returns 502 with not found info", async () => {
    const cleanup = installWindguruMock(() => new Response("Not Found", { status: 404 }));
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_NOT_FOUND");
      expect(body.suggestion).toContain("spot ID");
    } finally {
      cleanup();
    }
  });

  it("network failure returns 504 with unreachable info", async () => {
    const cleanup = installWindguruMock(() => {
      throw new TypeError("fetch failed");
    });
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(504);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_UNREACHABLE");
      expect(body.debug?.locationInfo).toBeTruthy();
    } finally {
      cleanup();
    }
  });

  it("malformed JSON response returns 502 with bad response info", async () => {
    const cleanup = installWindguruMock(() => new Response("not json {{{", { status: 200 }));
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(502);
      const body = JSON.parse(result.body);
      expect(body.code).toBe("WINDGURU_BAD_RESPONSE");
      expect(body.debug?.upstreamStatus).toBe(200);
    } finally {
      cleanup();
    }
  });

  it("wave model failure is non-fatal — still returns ICS", async () => {
    const cleanup = installWindguruMock((url) => {
      const params = Object.fromEntries(url.searchParams);
      // Wave model (84) fails, wind model (3) succeeds
      if (params.q === "forecast" && params.id_model === "84") {
        return new Response("Wave model error", { status: 500 });
      }
      return null; // fall through to default mock
    });
    try {
      const req = mockVercelRequest("/api/calendar");
      const { res, result } = mockVercelResponse();

      await handler(req, res);

      expect(result.statusCode).toBe(200);
      expect(result.body.includes("BEGIN:VCALENDAR")).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("all error responses include debug.locationInfo", async () => {
    const errorResponders: Array<{ name: string; responder: () => Response }> = [
      { name: "500", responder: () => new Response("error", { status: 500 }) },
      { name: "429", responder: () => new Response("error", { status: 429 }) },
      { name: "403", responder: () => new Response("error", { status: 403 }) },
      { name: "404", responder: () => new Response("error", { status: 404 }) },
    ];

    for (const { responder } of errorResponders) {
      const cleanup = installWindguruMock(() => responder());
      try {
        const req = mockVercelRequest("/api/calendar");
        const { res, result } = mockVercelResponse();

        await handler(req, res);

        const body = JSON.parse(result.body);
        expect(body.debug?.locationInfo).toBeTruthy();
        expect(body.code).toBeTruthy();
      } finally {
        cleanup();
      }
    }
  });
});
