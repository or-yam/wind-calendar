import type { CalendarConfig } from "@shared/types";

export async function sendConfigFeedback(
  token: string,
  confirmedConfig: CalendarConfig,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("/api/config-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirmedConfig }),
        keepalive: true,
      });
      if (response.ok) return true;
      if (response.status < 500) return false;
    } catch {
      // Retry one transient network failure.
    }
  }
  return false;
}
