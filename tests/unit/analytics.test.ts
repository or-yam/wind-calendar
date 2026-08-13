import { beforeEach, describe, expect, it, vi } from "vitest";

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock("posthog-js/dist/module.no-external", () => ({ default: posthog }));

import {
  activationEvents,
  captureApiError,
  captureEvent,
  initializeAnalytics,
  resetAnalyticsForTests,
  sanitizePostHogEvent,
} from "../../src/lib/analytics";

describe("analytics", () => {
  beforeEach(async () => {
    await resetAnalyticsForTests();
    vi.clearAllMocks();
  });

  it("is a no-op without both configuration values", async () => {
    expect(initializeAnalytics(undefined, "https://us.i.posthog.com")).toBe(false);
    expect(initializeAnalytics("phc_test", undefined)).toBe(false);
    captureEvent("url copied", {});
    await Promise.resolve();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("rejects invalid hosts without crashing", async () => {
    expect(initializeAnalytics("phc_test", "http://us.i.posthog.com")).toBe(false);
    await Promise.resolve();
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("initializes once with attribution and privacy features disabled", async () => {
    expect(initializeAnalytics("phc_test", "https://us.i.posthog.com/path")).toBe(true);
    expect(initializeAnalytics("phc_test", "https://us.i.posthog.com")).toBe(true);
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalledOnce());
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        disable_surveys: true,
        person_profiles: "never",
        advanced_disable_flags: true,
        disable_persistence: true,
        disable_capture_url_hashes: true,
        save_referrer: false,
        save_campaign_params: false,
        store_google: false,
        custom_campaign_params: [],
      }),
    );
  });

  it("queues events while the SDK chunk loads and flushes them in order", async () => {
    initializeAnalytics("phc_test", "https://us.i.posthog.com");
    captureEvent("subscription clicked", { provider: "google" });
    captureEvent("url copied", {});
    expect(posthog.capture).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(2));
    expect(posthog.capture.mock.calls).toEqual([
      ["subscription clicked", { provider: "google" }],
      ["url copied", {}],
    ]);
  });

  it("retains only transport identity and declared event properties", () => {
    const event = {
      uuid: "event-id",
      event: "configuration changed",
      properties: {
        token: "phc_test",
        distinct_id: "anonymous-id",
        $device_id: "device-id",
        $process_person_profile: false,
        field: "model",
        source: "manual",
        provider: "must-not-cross-events",
        $current_url: "https://example.test/?locations=secret",
        $referrer: "https://search.test/secret",
        $utm_campaign: "private-campaign",
        $gclid: "private-click-id",
        $initial_utm_source: "private-source",
      },
    };
    expect(sanitizePostHogEvent(event)).toEqual({
      uuid: "event-id",
      event: "configuration changed",
      properties: {
        token: "phc_test",
        distinct_id: "anonymous-id",
        $device_id: "device-id",
        $process_person_profile: false,
        field: "model",
        source: "manual",
      },
    });
  });

  it("drops undeclared events", () => {
    expect(
      sanitizePostHogEvent({
        uuid: "event-id",
        event: "$pageview",
        properties: { token: "phc_test" },
      }),
    ).toBeNull();
  });

  it("sends exact safe API error properties without raw messages", async () => {
    initializeAnalytics("phc_test", "https://us.i.posthog.com");
    captureApiError("forecast", 503, "http");
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalled());
    expect(posthog.capture).toHaveBeenCalledWith("api error", {
      endpoint: "forecast",
      status_group: "5xx",
      type: "http",
    });
  });

  it("defines only observable subscription and download proxies as activation", () => {
    expect(activationEvents).toEqual(["subscription clicked", "ics downloaded"]);
    expect(activationEvents).not.toContain("url copied");
  });
});
