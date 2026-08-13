import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { CalendarConfig, InterpretConfigResponse } from "@shared/types";

interface FreeTextConfigBuilderProps {
  onConfig: (config: CalendarConfig, message: string) => void;
}

async function interpretConfig(request: string): Promise<InterpretConfigResponse> {
  const response = await fetch("/api/interpret-config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request }),
  });
  const body = (await response.json()) as InterpretConfigResponse & {
    data?: { error?: string };
    error?: string;
  };
  if (!response.ok) throw new Error(body.data?.error ?? body.error ?? "Request failed");
  return body;
}

function resultMessage(result: InterpretConfigResponse): string {
  if (result.outcome === "configured") return result.message;
  if (result.outcome === "insufficient") {
    return `Not enough information to build a specific configuration. Defaults were loaded. ${result.message}`;
  }
  return `That request is not supported. Defaults were loaded. ${result.message}`;
}

export function FreeTextConfigBuilder({ onConfig }: FreeTextConfigBuilderProps) {
  const [request, setRequest] = useState("");
  const interpretation = useMutation({
    mutationFn: interpretConfig,
    onSuccess: (result) => onConfig(result.config, result.message),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = request.trim();
    if (normalized.length < 10) return;
    interpretation.mutate(normalized);
  }

  const message = interpretation.data
    ? resultMessage(interpretation.data)
    : interpretation.error?.message;

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
          disabled={interpretation.isPending}
        />
        <Button type="submit" disabled={interpretation.isPending || request.trim().length < 10}>
          {interpretation.isPending ? "Interpreting..." : "Build configuration"}
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
