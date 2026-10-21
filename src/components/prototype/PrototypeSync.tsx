import { useState } from "react";
import { Copy, Download } from "lucide-react";

const PROVIDERS = [
  ["Apple Calendar", "/macos-calendar_logo.png"],
  ["Google Calendar", "/google_calendar_logo.svg"],
  ["Outlook", "/outlook-calendar_logo.svg"],
];
const square =
  "grid size-[44px] shrink-0 cursor-pointer place-items-center rounded-sm border-0 bg-transparent p-0 text-[#04090b] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3d8d]";

export function PrototypeSync() {
  const [notice, setNotice] = useState("");
  const simulate = (action: string) =>
    setNotice(`${action} selected. This draft does not create a subscription or download.`);
  return (
    <div className="max-w-full">
      <div className="flex flex-wrap items-center gap-1">
        {PROVIDERS.map(([label, logo]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            onClick={() => simulate(label)}
            className={square}
          >
            <img src={logo} alt="" className="size-[24px] object-contain" />
          </button>
        ))}

        <button
          type="button"
          aria-label="Copy subscription URL"
          title="Copy subscription URL"
          onClick={() => simulate("Copy subscription URL")}
          className={square}
        >
          <Copy size={24} />
        </button>
        <button
          type="button"
          aria-label="Download .ics"
          title="Download .ics"
          onClick={() => simulate("Download .ics")}
          className={square}
        >
          <Download size={24} />
        </button>
      </div>
      <p className="mt-2 text-xs opacity-65">Design preview · calendar actions are simulated.</p>
      <p role="status" className="mt-1 max-w-sm text-xs font-semibold">
        {notice}
      </p>
    </div>
  );
}
