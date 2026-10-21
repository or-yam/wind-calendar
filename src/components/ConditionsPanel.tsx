import { CalendarPlus } from "lucide-react";
import type { CalendarConfig } from "@shared/types";
import { ConfigForm, type ConfigFormProps } from "./ConfigForm";
import { FreeTextConfigBuilder } from "./FreeTextConfigBuilder";
import { SubscribeActions } from "./SubscribeActions";

export interface ConditionsPanelProps extends ConfigFormProps {
  confirmedConfig: CalendarConfig;
  confirmationPending: boolean;
  onConfirmConfig: () => void;
  onFreeTextConfig: (config: CalendarConfig, message: string) => void;
  freeTextConfigBuilderEnabled: boolean;
}

export function ConditionsPanel({
  confirmedConfig,
  confirmationPending,
  onConfirmConfig,
  onFreeTextConfig,
  freeTextConfigBuilderEnabled,
  ...formProps
}: ConditionsPanelProps) {
  return (
    <section className="content-wrap pb-10" aria-labelledby="conditions-heading">
      <h2 id="conditions-heading" className="sticker-heading text-[clamp(1.6rem,4vw,2.4rem)]">
        Choose your conditions
      </h2>
      <div className="config-panel p-5 md:p-7">
        {freeTextConfigBuilderEnabled && <FreeTextConfigBuilder onConfig={onFreeTextConfig} />}
        <ConfigForm {...formProps} />

        {confirmationPending && (
          <div className="mt-5 flex flex-col gap-3 rounded-sm border-2 border-[#04090b] bg-[#3ee6cf]/35 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">
              Review the extracted settings above before updating subscription links.
            </p>
            <button
              type="button"
              className="shrink-0 rounded-sm bg-primary px-5 py-3 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3d8d]"
              onClick={onConfirmConfig}
            >
              Confirm configuration
            </button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 border-t-2 border-[#04090b]/20 pt-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <CalendarPlus aria-hidden="true" size={20} />
              Add to your calendar
            </h3>
            <p className="mt-1 text-sm text-[#314c4b]">Your conditions, on your schedule.</p>
          </div>
          <SubscribeActions config={confirmedConfig} />
        </div>
      </div>
    </section>
  );
}
