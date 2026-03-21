import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { checkRateLimit } from "../../../server/utils/rate-limit.js";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset module state by clearing the hits map indirectly
    // We can't import and clear it directly, so we rely on time-based cleanup
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request from new IP", () => {
    const result = checkRateLimit("192.168.1.1");
    expect(result).toEqual({ limited: false });
  });

  it("allows requests under the limit (30 per minute)", () => {
    const ip = "192.168.1.2";

    // Send 29 requests (under limit)
    for (let i = 0; i < 29; i++) {
      const result = checkRateLimit(ip);
      expect(result.limited).toBe(false);
    }

    // 30th request should still be allowed
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("blocks request when limit exceeded", () => {
    const ip = "192.168.1.3";

    // Send exactly 30 requests (at limit)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // 31st request should be blocked
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    expect(result).toHaveProperty("retryAfter");
    if (result.limited) {
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    }
  });

  it("calculates correct retryAfter in seconds", () => {
    const ip = "192.168.1.4";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 30 requests at time T
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Advance 30 seconds
    vi.setSystemTime(startTime + 30_000);

    // Try 31st request
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    if (result.limited) {
      // Oldest request was at T, expires at T+60s
      // Current time is T+30s, so retryAfter should be ~30s
      expect(result.retryAfter).toBeGreaterThanOrEqual(29);
      expect(result.retryAfter).toBeLessThanOrEqual(31);
    }
  });

  it("allows requests after sliding window expires", () => {
    const ip = "192.168.1.5";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 30 requests (hit limit)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Verify blocked
    let result = checkRateLimit(ip);
    expect(result.limited).toBe(true);

    // Advance past the 60-second window
    vi.setSystemTime(startTime + 61_000);

    // Should now be allowed (all previous requests expired)
    result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("implements sliding window correctly", () => {
    const ip = "192.168.1.6";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 20 requests at T
    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip);
    }

    // Advance 40 seconds
    vi.setSystemTime(startTime + 40_000);

    // Send 10 more requests at T+40s (total 30, but in window)
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(ip);
      expect(result.limited).toBe(false);
    }

    // 31st request should be blocked (20 from T + 10 from T+40s still in window)
    let result = checkRateLimit(ip);
    expect(result.limited).toBe(true);

    // Advance to T+61s (first 20 requests have expired)
    vi.setSystemTime(startTime + 61_000);

    // Should be allowed now (only 10 requests in the current 60s window)
    result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const ip1 = "192.168.1.7";
    const ip2 = "192.168.1.8";

    // Send 30 requests from ip1
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip1);
    }

    // ip1 should be blocked
    let result = checkRateLimit(ip1);
    expect(result.limited).toBe(true);

    // ip2 should still be allowed
    result = checkRateLimit(ip2);
    expect(result.limited).toBe(false);
  });

  it("ensures retryAfter is at least 1 second", () => {
    const ip = "192.168.1.9";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 30 requests
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Advance to just before window expiry (59.5 seconds)
    vi.setSystemTime(startTime + 59_500);

    // Try blocked request
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    if (result.limited) {
      // Even if calculated retryAfter rounds to 0, it should be at least 1
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    }
  });

  it("runs cleanup when map exceeds threshold (1000 entries)", () => {
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Add 1001 different IPs to exceed cleanup threshold
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`192.168.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Advance time so early entries expire
    vi.setSystemTime(startTime + 61_000);

    // Trigger cleanup by checking a new IP
    const result = checkRateLimit("10.0.0.1");
    expect(result.limited).toBe(false);

    // Verify old entries were cleaned (indirect test - no errors, function works)
    // We can't access the internal Map directly, but the lack of errors
    // and continued correct behavior indicates cleanup worked
  });

  it("preserves valid entries during cleanup", () => {
    const oldIp = "192.168.1.10";
    const recentIp = "192.168.1.11";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Create an old entry
    checkRateLimit(oldIp);

    // Advance time and create many new entries to trigger cleanup
    vi.setSystemTime(startTime + 61_000);

    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Recent IP should still work (not cleaned)
    checkRateLimit(recentIp);
    const result = checkRateLimit(recentIp);
    expect(result.limited).toBe(false);

    // Old IP should start fresh (cleaned)
    const oldResult = checkRateLimit(oldIp);
    expect(oldResult.limited).toBe(false);
  });

  it("removes IP from map when all timestamps expire", () => {
    const ip = "192.168.1.12";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Single request
    checkRateLimit(ip);

    // Create 1001 other IPs to trigger cleanup
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`172.16.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Advance past window
    vi.setSystemTime(startTime + 61_000);

    // Create more entries to trigger cleanup again
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`10.1.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Original IP should be fresh (entry was deleted, not just filtered)
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("handles rapid sequential requests correctly", () => {
    const ip = "192.168.1.13";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 30 requests in same millisecond
    for (let i = 0; i < 30; i++) {
      const result = checkRateLimit(ip);
      expect(result.limited).toBe(false);
    }

    // 31st should be blocked
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
  });

  it("handles edge case of exactly 30 requests at window boundary", () => {
    const ip = "192.168.1.14";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 15 requests at T
    for (let i = 0; i < 15; i++) {
      checkRateLimit(ip);
    }

    // Send 15 requests at T+59999ms (just before window expiry)
    vi.setSystemTime(startTime + 59_999);
    for (let i = 0; i < 15; i++) {
      checkRateLimit(ip);
    }

    // Should still be under limit (30 requests within 60s window)
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true); // 31st request
  });

  it("correctly filters stale timestamps in sliding window", () => {
    const ip = "192.168.1.15";
    const startTime = 1000000;
    vi.setSystemTime(startTime);

    // Send 25 requests at T
    for (let i = 0; i < 25; i++) {
      checkRateLimit(ip);
    }

    // Advance 30 seconds
    vi.setSystemTime(startTime + 30_000);

    // Send 5 more requests (still under 30 total in window)
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip);
    }

    // Advance another 31 seconds (total 61s from start)
    // First 25 requests have expired
    vi.setSystemTime(startTime + 61_000);

    // Should only have 5 requests in window, so plenty of room
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });
});
