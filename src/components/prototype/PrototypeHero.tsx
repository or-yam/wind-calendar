import type { Variant } from "./PrototypeSwitcher";

export function PrototypeHero({ variant }: { variant: Variant }) {
  return (
    <header
      className={variant === "C" ? "content-wrap pt-7 pb-8 text-center" : "content-wrap py-6"}
    >
      <div
        className={`flex items-center gap-5 ${variant === "C" ? "justify-center" : "justify-between"}`}
      >
        <h1
          className={`font-title -rotate-3 leading-[0.95] tracking-[-0.04em] text-primary [text-shadow:3px_3px_0_#3ee6cf] ${variant === "C" ? "text-3xl" : "text-[clamp(2.5rem,6vw,3.4rem)]"}`}
        >
          Wind Calendar
        </h1>
        {variant !== "C" && (
          <img
            src="/android-chrome-512x512.png"
            alt=""
            className="size-14 shrink-0 rotate-6 rounded-full border-[3px] border-secondary shadow-[4px_4px_0_#ff3d8d] md:size-16"
          />
        )}
      </div>
      <div
        className={`mt-5 ${variant === "B" ? "flex flex-wrap items-baseline justify-between gap-2" : ""}`}
      >
        <p className={`font-bold ${variant === "C" ? "text-3xl" : "text-xl"}`}>
          Only the days worth surfing.
        </p>
        <p className="mt-1 text-base text-muted-foreground">
          Choose your conditions. Get matching sessions in your calendar.
        </p>
      </div>
    </header>
  );
}
