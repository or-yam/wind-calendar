import { LangfuseSpanProcessor } from "@langfuse/otel";
import { getActiveTraceId, propagateAttributes, startActiveObservation } from "@langfuse/tracing";
import { LangfuseVercelAiSdkIntegration } from "@langfuse/vercel-ai-sdk";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { registerTelemetry } from "ai";

const enabled = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);

export const langfuseSpanProcessor = enabled
  ? new LangfuseSpanProcessor({ exportMode: "immediate" })
  : undefined;

if (langfuseSpanProcessor) {
  new NodeSDK({ spanProcessors: [langfuseSpanProcessor] }).start();
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
}

async function flushObservability(flush: () => Promise<void>): Promise<void> {
  try {
    await flush();
  } catch (error) {
    console.warn("Langfuse flush failed", error);
  }
}

export async function observeFreeTextConfig<T>(
  input: string,
  promptVersion: string,
  operation: (telemetryEnabled: boolean) => Promise<T>,
): Promise<{ result: T; traceId?: string }> {
  if (!langfuseSpanProcessor) return { result: await operation(false) };

  try {
    return await startActiveObservation("interpret-free-text-config", async (span) => {
      span.update({ input: { requestCharacters: Array.from(input).length } });
      return propagateAttributes(
        {
          traceName: "interpret-free-text-config",
          tags: ["free-text-config"],
          version: promptVersion,
          metadata: { promptVersion },
        },
        async () => {
          const result = await operation(true);
          span.update({ output: { status: "completed" } });
          return { result, traceId: getActiveTraceId() };
        },
      );
    });
  } finally {
    await flushObservability(() => langfuseSpanProcessor.forceFlush());
  }
}
