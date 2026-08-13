import { getPostHogOrigin } from "@shared/posthog-config";
import type { CaptureResult, PostHog } from "posthog-js/dist/module.no-external";

type AnalyticsEvents = {
  "forecast loaded": { session_count: number; data_source: string };
  "configuration changed": { field: string; source: "manual" | "free text" };
  "subscription clicked": { provider: "apple" | "google" | "outlook" };
  "url copied": Record<string, never>;
  "ics downloaded": Record<string, never>;
  "api error": { endpoint: string; status_group: string; type: string };
};

type EventName = keyof AnalyticsEvents;
type QueuedEvent = { event: EventName; properties: AnalyticsEvents[EventName] };

export const activationEvents = ["subscription clicked", "ics downloaded"] as const;

const EVENT_PROPERTIES: Record<EventName, readonly string[]> = {
  "forecast loaded": ["session_count", "data_source"],
  "configuration changed": ["field", "source"],
  "subscription clicked": ["provider"],
  "url copied": [],
  "ics downloaded": [],
  "api error": ["endpoint", "status_group", "type"],
};
const TRANSPORT_PROPERTIES = [
  "token",
  "distinct_id",
  "$device_id",
  "$process_person_profile",
] as const;

let configured = false;
let client: PostHog | undefined;
let loadPromise: Promise<void> | undefined;
let queue: QueuedEvent[] = [];

export function sanitizePostHogEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event || !(event.event in EVENT_PROPERTIES)) return null;

  const allowed = new Set([...TRANSPORT_PROPERTIES, ...EVENT_PROPERTIES[event.event as EventName]]);
  event.properties = Object.fromEntries(
    Object.entries(event.properties ?? {}).filter(([property]) => allowed.has(property)),
  );
  return event;
}

export function initializeAnalytics(
  token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN,
  host = import.meta.env.VITE_POSTHOG_HOST,
): boolean {
  if (configured || !token) return configured;
  const apiHost = getPostHogOrigin(host);
  if (!apiHost) return false;

  configured = true;
  loadPromise = import("posthog-js/dist/module.no-external")
    .then(({ default: posthog }) => {
      posthog.init(token, {
        api_host: apiHost,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_performance: false,
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
        before_send: sanitizePostHogEvent,
      });
      client = posthog;
      for (const queuedEvent of queue) {
        posthog.capture(queuedEvent.event, queuedEvent.properties);
      }
      queue = [];
    })
    .catch(() => {
      configured = false;
      queue = [];
    });
  return true;
}

export function captureEvent<Event extends EventName>(
  event: Event,
  properties: AnalyticsEvents[Event],
): void {
  if (!configured) return;
  try {
    if (client) client.capture(event, properties);
    else queue.push({ event, properties } as QueuedEvent);
  } catch {
    // Analytics must never interrupt the product action being measured.
  }
}

export function getStatusGroup(status: number): string {
  return status >= 100 && status <= 599 ? `${Math.floor(status / 100)}xx` : "unknown";
}

export function captureApiError(endpoint: string, status: number, type: string): void {
  captureEvent("api error", { endpoint, status_group: getStatusGroup(status), type });
}

export async function resetAnalyticsForTests(): Promise<void> {
  await loadPromise;
  configured = false;
  client = undefined;
  loadPromise = undefined;
  queue = [];
}
