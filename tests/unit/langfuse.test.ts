import { afterEach, describe, expect, it, vi } from "vitest";

describe("Langfuse optional tracing", () => {
  afterEach(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("@langfuse/otel");
    vi.doUnmock("@langfuse/tracing");
    vi.doUnmock("@langfuse/vercel-ai-sdk");
    vi.doUnmock("@opentelemetry/sdk-node");
    vi.doUnmock("ai");
  });

  it("runs generation as a no-op without credentials", async () => {
    const { observeFreeTextConfig } = await import("../../server/langfuse");
    const operation = vi.fn().mockResolvedValue("result");

    await expect(observeFreeTextConfig("sensitive input", "v1", operation)).resolves.toEqual({
      result: "result",
    });
    expect(operation).toHaveBeenCalledWith(false);
  });

  it("registers, sanitizes root IO, correlates, and flushes tracing when enabled", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    const forceFlush = vi.fn().mockResolvedValue(undefined);
    const update = vi.fn();
    const registerTelemetry = vi.fn();
    vi.doMock("@langfuse/otel", () => ({
      LangfuseSpanProcessor: class {
        forceFlush = forceFlush;
      },
    }));
    vi.doMock("@opentelemetry/sdk-node", () => ({
      NodeSDK: class {
        start = vi.fn();
      },
    }));
    vi.doMock("@langfuse/tracing", () => ({
      getActiveTraceId: () => "0123456789abcdef0123456789abcdef",
      propagateAttributes: (_attributes: unknown, operation: () => unknown) => operation(),
      startActiveObservation: (_name: string, operation: (span: unknown) => unknown) =>
        operation({ update }),
    }));
    vi.doMock("@langfuse/vercel-ai-sdk", () => ({
      LangfuseVercelAiSdkIntegration: class {},
    }));
    vi.doMock("ai", async (importOriginal) => ({
      ...(await importOriginal<typeof import("ai")>()),
      registerTelemetry,
    }));
    const { observeFreeTextConfig } = await import("../../server/langfuse");

    const result = await observeFreeTextConfig(
      "sensitive request",
      "prompt-v1",
      async (telemetryEnabled) => ({ telemetryEnabled }),
    );

    expect(registerTelemetry).toHaveBeenCalledOnce();
    expect(update).toHaveBeenNthCalledWith(1, { input: { requestCharacters: 17 } });
    expect(update).toHaveBeenNthCalledWith(2, { output: { status: "completed" } });
    expect(result).toEqual({
      result: { telemetryEnabled: true },
      traceId: "0123456789abcdef0123456789abcdef",
    });
    expect(forceFlush).toHaveBeenCalledOnce();
  });
});
