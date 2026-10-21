// Selected layout draft. The initial three options are preserved in commit 74be8c4.
import type { HeroProps } from "../Hero";
import { PrototypeHero } from "./PrototypeHero";
import { VariantA } from "./PrototypeVariants";
import "./prototype.css";

export default function PrototypeSetup(props: HeroProps) {
  return (
    <div className="prototype-setup">
      <PrototypeHero />
      <VariantA {...props} />
    </div>
  );
}
