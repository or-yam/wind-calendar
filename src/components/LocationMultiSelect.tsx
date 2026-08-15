import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { LOCATIONS } from "@shared/locations";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getLocationName } from "@/i18n/locations";
import type { Locale } from "@/i18n/locale";

interface LocationMultiSelectProps {
  locations: string[];
  onLocationsChange: (locations: string[]) => void;
}

export function LocationMultiSelect({ locations, onLocationsChange }: LocationMultiSelectProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const labels = locations.map((id) => getLocationName(id, locale));
  const options = Object.keys(LOCATIONS).map((id) => ({ id, label: getLocationName(id, locale) }));

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        pickerRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function toggle(id: string) {
    if (locations.includes(id)) {
      if (locations.length > 1) onLocationsChange(locations.filter((location) => location !== id));
      return;
    }
    if (locations.length < 3) onLocationsChange([...locations, id]);
  }

  return (
    <details ref={pickerRef} className="group relative">
      <summary
        aria-label={t("locationPicker")}
        className="flex h-11 cursor-pointer list-none items-center justify-between rounded-sm border-2 border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className="truncate">{labels.join(", ")}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border-2 bg-popover p-1 text-popover-foreground shadow-[5px_5px_0_#ff3d8d]">
        {options.map((option) => {
          const checked = locations.includes(option.id);
          const disabled = !checked && locations.length === 3;
          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex w-full items-center rounded-sm py-1.5 pe-2 ps-8 text-start text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <span className="absolute start-3 flex h-3.5 w-3.5 items-center justify-center">
                {checked ? <Check className="h-4 w-4" /> : null}
              </span>
              {option.label}
            </button>
          );
        })}
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          {t("locationsSelected", { count: locations.length })}
        </p>
      </div>
    </details>
  );
}
