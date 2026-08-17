import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CalendarConfig, InterpretConfigResponse } from "@shared/types";

interface FreeTextConfigBuilderProps {
  onConfig: (config: CalendarConfig, message: string, feedbackToken?: string) => void;
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

export function FreeTextConfigBuilder({ onConfig }: FreeTextConfigBuilderProps) {
  const [request, setRequest] = useState("");
  const interpretation = useMutation({
    mutationFn: interpretConfig,
    onSuccess: (result) => onConfig(result.config, result.message, result.feedbackToken),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = request.trim();
    if (normalized.length < 10) return;
    interpretation.mutate(normalized);
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
          disabled={interpretation.isPending}
        />
        <Button type="submit" disabled={interpretation.isPending || request.trim().length < 10}>
          {interpretation.isPending && <Spinner />}
          {interpretation.isPending ? "Interpreting..." : "Build configuration"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        English and Hebrew supported. AI requests may be stored for quality monitoring; do not
        include personal information.
      </p>
      {interpretation.data?.outcome === "configured" && (
        <Alert variant="success">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>Configuration ready</AlertTitle>
          <AlertDescription>{interpretation.data.message}</AlertDescription>
        </Alert>
      )}
      {interpretation.data && interpretation.data.outcome !== "configured" && (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Defaults loaded</AlertTitle>
          <AlertDescription>
            {interpretation.data.outcome === "insufficient"
              ? "There was not enough information to build a specific configuration. "
              : "That request is not supported. "}
            {interpretation.data.message}
          </AlertDescription>
        </Alert>
      )}
      {interpretation.error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Could not build configuration</AlertTitle>
          <AlertDescription>{interpretation.error.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
