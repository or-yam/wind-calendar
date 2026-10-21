import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const VARIANTS = { A: "All in one", B: "Side by side", C: "Guided setup" } as const;
export type Variant = keyof typeof VARIANTS;
export function readVariant(): Variant {
  const value = new URLSearchParams(window.location.search).get("variant");
  return value === "B" || value === "C" ? value : "A";
}

export function PrototypeSwitcher({
  variant,
  onChange,
}: {
  variant: Variant;
  onChange: (value: Variant) => void;
}) {
  const cycle = (direction: number) => {
    const keys = Object.keys(VARIANTS) as Variant[];
    onChange(keys[(keys.indexOf(variant) + direction + keys.length) % keys.length]);
  };
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof Element &&
          target.closest(
            "input, textarea, select, button, summary, [contenteditable], [role=slider], [role=combobox], [role=menu], [role=listbox]",
          ))
      )
        return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      cycle(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  if (!import.meta.env.DEV) return null;
  return (
    <nav
      aria-label="Layout drafts"
      className="fixed bottom-4 left-1/2 z-[100] flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-full border border-white/25 bg-[#14272c] px-2 py-2 text-[#e8f4ee] shadow-[0_6px_30px_#0009]"
    >
      <button
        type="button"
        aria-label="Previous draft"
        onClick={() => cycle(-1)}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="min-w-0 flex-1 text-center leading-tight">
        <span className="block text-[10px] font-semibold tracking-[0.18em] text-[#a7bbb8] uppercase">
          Layout exploration · {Object.keys(VARIANTS).indexOf(variant) + 1}/3
        </span>
        <span className="text-sm font-bold" aria-live="polite">
          {variant} / {VARIANTS[variant]}
        </span>
      </div>
      <button
        type="button"
        aria-label="Next draft"
        onClick={() => cycle(1)}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-white/10"
      >
        <ArrowRight size={18} />
      </button>
    </nav>
  );
}
