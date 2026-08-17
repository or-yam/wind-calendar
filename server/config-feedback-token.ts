import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { CalendarConfig } from "../shared/types.js";

const TOKEN_VERSION = 1;
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface FeedbackEvidence {
  v: number;
  traceId: string;
  generatedConfigHash: string;
  issuedAt: string;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashCalendarConfig(config: CalendarConfig): string {
  return createHash("sha256").update(canonicalize(config)).digest("hex");
}

function getTokenKeys(): { encryption: Buffer; signing: Buffer } | undefined {
  const secret = process.env.LANGFUSE_FEEDBACK_SECRET ?? process.env.LANGFUSE_SECRET_KEY;
  if (!secret) return undefined;
  return {
    encryption: createHmac("sha256", secret)
      .update("wind-calendar/config-feedback/v1/encryption")
      .digest(),
    signing: createHmac("sha256", secret)
      .update("wind-calendar/config-feedback/v1/signing")
      .digest(),
  };
}

function sign(payload: string, key: Buffer): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createConfigFeedbackToken(
  traceId: string,
  config: CalendarConfig,
  now = new Date(),
): string | undefined {
  const keys = getTokenKeys();
  if (!keys) return undefined;
  const evidence: FeedbackEvidence = {
    v: TOKEN_VERSION,
    traceId,
    generatedConfigHash: hashCalendarConfig(config),
    issuedAt: now.toISOString(),
  };
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keys.encryption, nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(evidence)), cipher.final()]);
  const payload = `${nonce.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher
    .getAuthTag()
    .toString("base64url")}`;
  return `${payload}.${sign(payload, keys.signing)}`;
}

export function verifyConfigFeedbackToken(
  token: string,
  now = new Date(),
): FeedbackEvidence | undefined {
  const keys = getTokenKeys();
  const [nonce, ciphertext, authTag, signature, extra] = token.split(".");
  if (!keys || !nonce || !ciphertext || !authTag || !signature || extra) return undefined;

  const payload = `${nonce}.${ciphertext}.${authTag}`;
  const expected = Buffer.from(sign(payload, keys.signing));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return undefined;

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keys.encryption,
      Buffer.from(nonce, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));
    const evidence = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(ciphertext, "base64url")),
        decipher.final(),
      ]).toString(),
    ) as FeedbackEvidence;
    const issuedAt = Date.parse(evidence.issuedAt);
    if (
      evidence.v !== TOKEN_VERSION ||
      !/^[0-9a-f]{32}$/.test(evidence.traceId) ||
      !/^[0-9a-f]{64}$/.test(evidence.generatedConfigHash) ||
      !Number.isFinite(issuedAt) ||
      issuedAt > now.getTime() + 60_000 ||
      now.getTime() - issuedAt > TOKEN_MAX_AGE_MS
    )
      return undefined;
    return evidence;
  } catch {
    return undefined;
  }
}

export function configConfirmationScoreId(evidence: FeedbackEvidence): string {
  return createHash("sha256")
    .update(`config-confirmed-unchanged:${evidence.traceId}:${evidence.generatedConfigHash}`)
    .digest("hex");
}
