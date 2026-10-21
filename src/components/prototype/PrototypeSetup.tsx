// Throwaway: three main-page structures on /?variant=A|B|C. Keep off production.
import { useEffect, useState } from "react";
import type { HeroProps } from "../Hero";
import { PrototypeHero } from "./PrototypeHero";
import { PrototypeSwitcher, readVariant, type Variant } from "./PrototypeSwitcher";
import { VariantA, VariantB } from "./PrototypeVariants";
import { VariantC } from "./PrototypeGuided";
import "./prototype.css";

export default function PrototypeSetup(props: HeroProps) {
  const [variant, setVariant] = useState(readVariant);
  useEffect(() => {
    const onPopState = () => setVariant(readVariant());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    const {
      locations,
      model,
      windEnabled,
      windMin,
      windMax,
      waveEnabled,
      waveSource,
      waveHeightMin,
      waveHeightMax,
      wavePeriodMin,
      minSessionHours,
      wavesForecastEnabled,
      windguruForecastModelsEnabled,
    } = props;
    console.info("[Layout prototype]", {
      variant,
      locations,
      model,
      windEnabled,
      windMin,
      windMax,
      waveEnabled,
      waveSource,
      waveHeightMin,
      waveHeightMax,
      wavePeriodMin,
      minSessionHours,
      wavesForecastEnabled,
      windguruForecastModelsEnabled,
    });
  }, [variant, props]);
  const changeVariant = (next: Variant) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next);
    url.hash = "";
    window.history.replaceState(null, "", url);
    setVariant(next);
    window.scrollTo({ top: 0 });
  };
  return (
    <>
      <div className="prototype-setup">
        <PrototypeHero variant={variant} />
        {variant === "A" && <VariantA {...props} />}
        {variant === "B" && <VariantB {...props} />}
        {variant === "C" && <VariantC {...props} />}
      </div>
      <PrototypeSwitcher variant={variant} onChange={changeVariant} />
    </>
  );
}
