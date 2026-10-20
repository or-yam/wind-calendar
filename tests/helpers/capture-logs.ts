import { Logger } from "effect";
import { vi } from "vitest";

export function captureLogs() {
  const log = vi.fn<(options: Logger.Options<unknown>) => void>();
  return { log, layer: Logger.layer([Logger.make(log)]) };
}
