import { LangfuseClient } from "@langfuse/client";

const enabled = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
const langfuseClient = enabled ? new LangfuseClient() : undefined;

export async function scoreConfigConfirmation(
  traceId: string,
  unchanged: boolean,
  id: string,
): Promise<void> {
  if (!langfuseClient) throw new Error("Langfuse feedback is disabled");

  langfuseClient.score.create({
    id,
    traceId,
    name: "config-confirmed-unchanged",
    value: unchanged ? 1 : 0,
    dataType: "BOOLEAN",
    comment: unchanged
      ? "User confirmed the generated configuration without edits"
      : "User edited the generated configuration before confirmation",
  });
  await langfuseClient.flush();
}
