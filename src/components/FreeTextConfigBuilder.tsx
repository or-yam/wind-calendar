import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CalendarConfig, InterpretConfigResponse } from "@shared/types";

interface FreeTextConfigBuilderProps {
  onConfig: (config: CalendarConfig, message: string) => void;
}

export function FreeTextConfigBuilder({ onConfig }: FreeTextConfigBuilderProps) {
  const [request, setRequest] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = request.trim();
    if (normalized.length < 10) {
      setMessage("Add a little more detail (at least 10 characters). ");
      return;
    }

    setPending(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/interpret-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: normalized }),
      });
      const body = (await response.json()) as InterpretConfigResponse & {
        data?: { error?: string };
        error?: string;
      };
      if (!response.ok) throw new Error(body.data?.error ?? body.error ?? "Request failed");

      onConfig(body.config, body.message);
      setMessage(
        body.outcome === "configured"
          ? body.message
          : body.outcome === "insufficient"
            ? `Not enough information to build a specific configuration. Defaults were loaded. ${body.message}`
            : `That request is not supported. Defaults were loaded. ${body.message}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not interpret that request.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 grid gap-3" aria-label="Describe conditions">
      <label
        htmlFor="free-text-config-request"
        className="text-sm font-bold tracking-[0.09em] uppercase"
      >
        Describe your ideal session
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="free-text-config-request"
          value={request}
          onChange={(event) => setRequest(event.target.value.slice(0, 500))}
          maxLength={500}
          dir="auto"
          placeholder="e.g. Beginner kitesurfing at Beit Yanai, 14-20 knots"
          className="h-11 min-w-0 flex-1 rounded-sm border-2 border-input bg-transparent px-3 text-foreground placeholder:text-muted-foreground"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || request.trim().length < 10}>
          {pending ? "Interpreting..." : "Build configuration"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        English and Hebrew supported. Do not include personal information.
      </p>
      {message && (
        <p role="status" className="text-sm font-bold text-primary">
          {message}
        </p>
      )}
    </form>
  );
}
