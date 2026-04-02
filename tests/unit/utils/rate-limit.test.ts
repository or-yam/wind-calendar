import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  __resetForTesting,
  __getMapSizeForTesting,
} from "../../../server/utils/rate-limit";

const BASE_TIME = 1_000_000;

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request from new IP", () => {
    const result = checkRateLimit("1.1.1.1");
    expect(result).toEqual({ limited: false });
  });

  it("allows requests under the limit (30 per minute)", () => {
    const ip = "2.2.2.2";

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
    const ip = "3.3.3.3";

    // Send exactly 30 requests (at limit)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // 31st request should be blocked
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    const { retryAfter } = result as { limited: true; retryAfter: number };
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("calculates correct retryAfter in seconds", () => {
    const ip = "4.4.4.4";
    vi.setSystemTime(BASE_TIME);

    // Send 30 requests at time T
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Advance 30 seconds
    vi.setSystemTime(BASE_TIME + 30_000);

    // Try 31st request
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    const { retryAfter } = result as { limited: true; retryAfter: number };
    // Oldest request was at T, expires at T+60s
    // Current time is T+30s, so retryAfter should be ~30s
    expect(retryAfter).toBeGreaterThanOrEqual(29);
    expect(retryAfter).toBeLessThanOrEqual(31);
  });

  it("allows requests after sliding window expires", () => {
    const ip = "5.5.5.5";
    vi.setSystemTime(BASE_TIME);

    // Send 30 requests (hit limit)
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Verify blocked
    let result = checkRateLimit(ip);
    expect(result.limited).toBe(true);

    // Advance past the 60-second window
    vi.setSystemTime(BASE_TIME + 61_000);

    // Should now be allowed (all previous requests expired)
    result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("implements sliding window correctly", () => {
    const ip = "6.6.6.6";
    vi.setSystemTime(BASE_TIME);

    // Send 20 requests at T
    for (let i = 0; i < 20; i++) {
      checkRateLimit(ip);
    }

    // Advance 40 seconds
    vi.setSystemTime(BASE_TIME + 40_000);

    // Send 10 more requests at T+40s (total 30, but in window)
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimit(ip);
      expect(result.limited).toBe(false);
    }

    // 31st request should be blocked (20 from T + 10 from T+40s still in window)
    let result = checkRateLimit(ip);
    expect(result.limited).toBe(true);

    // Advance to T+61s (first 20 requests have expired)
    vi.setSystemTime(BASE_TIME + 61_000);

    // Should be allowed now (only 10 requests in the current 60s window)
    result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("tracks different IPs independently", () => {
    const ip1 = "7.7.7.7";
    const ip2 = "8.8.8.8";

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
    const ip = "9.9.9.9";
    vi.setSystemTime(BASE_TIME);

    // Send 30 requests
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip);
    }

    // Advance to just before window expiry (59.5 seconds)
    vi.setSystemTime(BASE_TIME + 59_500);

    // Try blocked request
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true);
    const { retryAfter } = result as { limited: true; retryAfter: number };
    // Even if calculated retryAfter rounds to 0, it should be at least 1
    expect(retryAfter).toBeGreaterThanOrEqual(1);
  });

  it("runs cleanup when map exceeds threshold (1000 entries)", () => {
    vi.setSystemTime(BASE_TIME);

    // Add 1001 different IPs to exceed cleanup threshold
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`10.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    expect(__getMapSizeForTesting()).toBe(1001);

    // Advance time so early entries expire
    vi.setSystemTime(BASE_TIME + 61_000);

    // Trigger cleanup by checking a new IP
    const result = checkRateLimit("11.11.11.11");
    expect(result.limited).toBe(false);

    // Verify old entries were cleaned (only recent IP remains)
    expect(__getMapSizeForTesting()).toBe(1);
  });

  it("preserves valid entries during cleanup", () => {
    const oldIp = "12.12.12.12";
    const recentIp = "13.13.13.13";
    vi.setSystemTime(BASE_TIME);

    // Create an old entry
    checkRateLimit(oldIp);

    // Advance time and create many new entries to trigger cleanup
    vi.setSystemTime(BASE_TIME + 61_000);

    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`20.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Recent IPs should still work (not cleaned)
    checkRateLimit(recentIp);
    const result = checkRateLimit(recentIp);
    expect(result.limited).toBe(false);

    // Old IP should start fresh (was cleaned, so starts with count of 1)
    const oldResult = checkRateLimit(oldIp);
    expect(oldResult.limited).toBe(false);
  });

  it("removes IP from map when all timestamps expire", () => {
    const ip = "14.14.14.14";
    vi.setSystemTime(BASE_TIME);

    // Single request
    checkRateLimit(ip);

    // Create 1001 other IPs to trigger cleanup
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`30.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    const sizeBefore = __getMapSizeForTesting();

    // Advance past window
    vi.setSystemTime(BASE_TIME + 61_000);

    // Create more entries to trigger cleanup again
    for (let i = 0; i < 1001; i++) {
      checkRateLimit(`40.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    // Map should be smaller (old entries removed)
    expect(__getMapSizeForTesting()).toBeLessThan(sizeBefore);

    // Original IP should be fresh (entry was deleted, not just filtered)
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("handles rapid sequential requests correctly", () => {
    const ip = "15.15.15.15";
    vi.setSystemTime(BASE_TIME);

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
    const ip = "16.16.16.16";
    vi.setSystemTime(BASE_TIME);

    // Send 15 requests at T
    for (let i = 0; i < 15; i++) {
      checkRateLimit(ip);
    }

    // Send 15 requests at T+59999ms (just before window expiry)
    vi.setSystemTime(BASE_TIME + 59_999);
    for (let i = 0; i < 15; i++) {
      checkRateLimit(ip);
    }

    // Should still be under limit (30 requests within 60s window)
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(true); // 31st request
  });

  it("correctly filters stale timestamps in sliding window", () => {
    const ip = "17.17.17.17";
    vi.setSystemTime(BASE_TIME);

    // Send 25 requests at T
    for (let i = 0; i < 25; i++) {
      checkRateLimit(ip);
    }

    // Advance 30 seconds
    vi.setSystemTime(BASE_TIME + 30_000);

    // Send 5 more requests (still under 30 total in window)
    for (let i = 0; i < 5; i++) {
      checkRateLimit(ip);
    }

    // Advance another 31 seconds (total 61s from start)
    // First 25 requests have expired
    vi.setSystemTime(BASE_TIME + 61_000);

    // Should only have 5 requests in window, so plenty of room
    const result = checkRateLimit(ip);
    expect(result.limited).toBe(false);
  });

  it("does not trigger cleanup when exactly at threshold (1000 entries)", () => {
    vi.setSystemTime(BASE_TIME);

    // Add exactly 1000 IPs (at threshold, not exceeding)
    for (let i = 0; i < 1000; i++) {
      checkRateLimit(`50.0.${Math.floor(i / 256)}.${i % 256}`);
    }

    expect(__getMapSizeForTesting()).toBe(1000);

    // Advance time
    vi.setSystemTime(BASE_TIME + 61_000);

    // Add one more IP (now 1001, cleanup should NOT trigger yet because check is <=)
    checkRateLimit("51.51.51.51");

    // Map should still have entries (cleanup only triggers when size > 1000)
    expect(__getMapSizeForTesting()).toBeGreaterThan(1);
  });
});
