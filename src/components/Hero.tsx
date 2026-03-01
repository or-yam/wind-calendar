import { ConfigForm } from "./ConfigForm";

interface HeroProps {
  location: string;
  windMin: number;
  windMax: number;
  minSessionHours: number;
  onLocationChange: (location: string) => void;
  onWindMinChange: (value: number) => void;
  onWindMaxChange: (value: number) => void;
  onMinSessionHoursChange: (value: number) => void;
}

export function Hero({
  location,
  windMin,
  windMax,
  minSessionHours,
  onLocationChange,
  onWindMinChange,
  onWindMaxChange,
  onMinSessionHoursChange,
}: HeroProps) {
  return (
    <section className="bg-[#0B1220] py-16 px-5">
      <div className="text-center">
        <h1 className="text-[42px] font-bold mb-4 tracking-tight bg-linear-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
          Wind Calendar
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
          Auto-sync wind sessions to your calendar. Only see the days worth surfing.
        </p>
      </div>
      <ConfigForm
        location={location}
        windMin={windMin}
        windMax={windMax}
        minSessionHours={minSessionHours}
        onLocationChange={onLocationChange}
        onWindMinChange={onWindMinChange}
        onWindMaxChange={onWindMaxChange}
        onMinSessionHoursChange={onMinSessionHoursChange}
      />
    </section>
  );
}
