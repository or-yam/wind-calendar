import { useEffect, useRef, useState } from "react";
import { NumberStepper } from "./NumberStepper";
import { ConditionRow } from "./ConditionRow";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MinSessionFieldProps {
  value: number;
  onChange: (value: number) => void;
}

export function MinSessionField({ value, onChange }: MinSessionFieldProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<number | null>(value);
  const [custom, setCustom] = useState(![1, 2, 3].includes(value));
  const pendingCustomValue = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
    const isCustomCommit = pendingCustomValue.current === value;
    pendingCustomValue.current = null;
    if (![1, 2, 3].includes(value)) setCustom(true);
    else if (!isCustomCommit) setCustom(false);
  }, [value]);

  const selectPreset = (hours: number) => {
    pendingCustomValue.current = null;
    setCustom(false);
    setDraft(hours);
    onChange(hours);
  };

  return (
    <ConditionRow>
      <div>
        <p className="localized-label text-sm font-bold tracking-[0.09em] uppercase">
          {t("minSession")}
        </p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("minSessionA11y")}>
          {[1, 2, 3].map((hours) => (
            <Button
              key={hours}
              type="button"
              variant={!custom && draft === hours ? "default" : "outline"}
              aria-pressed={!custom && draft === hours}
              onClick={() => selectPreset(hours)}
              className={cn(
                "rounded-sm border-2 px-3 font-bold",
                !custom && draft === hours ? "border-primary" : "border-input",
              )}
            >
              {t(hours === 1 ? "presetHours_1" : hours === 2 ? "presetHours_2" : "presetHours_3")}
            </Button>
          ))}
          <Button
            type="button"
            variant={custom ? "default" : "outline"}
            aria-pressed={custom}
            onClick={() => setCustom(true)}
            className={cn(
              "rounded-sm border-2 px-3 font-bold",
              custom ? "border-primary" : "border-input",
            )}
          >
            {t("custom")}
          </Button>
        </div>
        {custom && (
          <div className="mt-3 max-w-60">
            <NumberStepper
              id="min-session"
              label={t("minSessionNumberLabel")}
              stepperLabel={t("minSession")}
              value={draft}
              min={0.5}
              max={8}
              step={0.5}
              invalid={draft === null}
              errorId="min-session-error"
              onValueChange={setDraft}
              onValueCommitted={(next) => {
                if (next === null) return;
                const hours = Math.max(0.5, Math.min(8, Math.round(next * 2) / 2));
                setDraft(hours);
                pendingCustomValue.current = hours === value ? null : hours;
                onChange(hours);
              }}
            />
            {draft === null && (
              <p id="min-session-error" className="mt-2 text-xs text-red-700" aria-live="polite">
                {t("minSessionRequired")}
              </p>
            )}
          </div>
        )}
      </div>
    </ConditionRow>
  );
}
