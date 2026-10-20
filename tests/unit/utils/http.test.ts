import { describe, expect, it, vi } from "vitest";
import { Effect } from "effect";
import { providerBodyText } from "../../../server/utils/http";

describe("providerBodyText", () => {
  it("reads an available response body", async () => {
    expect(await Effect.runPromise(providerBodyText(new Response("upstream details")))).toBe(
      "upstream details",
    );
  });

  it("recovers a rejected body read with a placeholder", async () => {
    const response = new Response();
    vi.spyOn(response, "text").mockRejectedValue(new Error("stream interrupted"));
    expect(await Effect.runPromise(providerBodyText(response))).toBe("<response body unavailable>");
  });

  it("recovers a synchronous body read failure with a placeholder", async () => {
    const response = new Response();
    vi.spyOn(response, "text").mockImplementation(() => {
      throw new Error("stream unavailable");
    });
    expect(await Effect.runPromise(providerBodyText(response))).toBe("<response body unavailable>");
  });
});
