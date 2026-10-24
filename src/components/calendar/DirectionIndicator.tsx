import { useLocale } from "@/hooks/useLocale";
import { WIND_ICON, WAVE_ICON } from "@shared/constants";

const DIRECTION_ROTATION: Record<string, number> = {
  W: 0,
  NW: 45,
  N: 90,
  NE: 135,
  E: 180,
  SE: 225,
  S: 270,
  SW: 315,
};

export function DirectionIndicator({
  direction,
  wave = false,
}: {
  direction: string;
  wave?: boolean;
}) {
  const { t } = useLocale();
  return (
    <span
      dir="ltr"
      role="img"
      aria-label={t(wave ? "waveDirection" : "windDirection", { direction })}
      className="inline-flex items-center gap-0.5 text-sm leading-none text-card-foreground"
    >
      {wave ? <span aria-hidden="true">{WAVE_ICON}</span> : null}
      <span
        aria-hidden="true"
        className="inline-block"
        style={{ transform: `rotate(${DIRECTION_ROTATION[direction] ?? 0}deg)` }}
      >
        {WIND_ICON}
      </span>
      <span aria-hidden="true">-{direction}</span>
    </span>
  );
}
