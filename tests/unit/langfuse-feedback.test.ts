import { afterEach, describe, expect, it, vi } from "vitest";

describe("Langfuse feedback", () => {
  afterEach(() => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    vi.clearAllMocks();
    vi.resetModules();
    vi.doUnmock("@langfuse/client");
  });

  it("rejects scoring without credentials", async () => {
    const { scoreConfigConfirmation } = await import("../../server/langfuse-feedback");

    await expect(
      scoreConfigConfirmation("0123456789abcdef0123456789abcdef", true, "score-id"),
    ).rejects.toThrow("disabled");
  });

  it("creates and flushes an idempotent score when enabled", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
    const create = vi.fn();
    const flush = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@langfuse/client", () => ({
      LangfuseClient: class {
        score = { create };
        flush = flush;
      },
    }));
    const { scoreConfigConfirmation } = await import("../../server/langfuse-feedback");

    await scoreConfigConfirmation("0123456789abcdef0123456789abcdef", false, "stable-score-id");

    expect(create).toHaveBeenCalledWith({
      id: "stable-score-id",
      traceId: "0123456789abcdef0123456789abcdef",
      name: "config-confirmed-unchanged",
      value: 0,
      dataType: "BOOLEAN",
      comment: "User edited the generated configuration before confirmation",
    });
    expect(flush).toHaveBeenCalledOnce();
  });
});
