import { useState } from "react";
import { ArrowUpRight, Copy, Download } from "lucide-react";

const PROVIDERS = [
  ["Apple Calendar", "/macos-calendar_logo.png"],
  ["Google Calendar", "/google_calendar_logo.svg"],
  ["Outlook", "/outlook-calendar_logo.svg"],
];

export function PrototypeSync({ stacked = false }: { stacked?: boolean }) {
  const [notice, setNotice] = useState("");
  const simulate = (action: string) =>
    setNotice(`${action} selected. This draft does not create a subscription or download.`);
  return (
    <div>
      <div
        className={`grid gap-2 ${stacked ? "grid-cols-1" : "grid-cols-1 min-[480px]:grid-cols-3"}`}
      >
        {PROVIDERS.map(([label, logo]) => (
          <button
            key={label}
            type="button"
            onClick={() => simulate(label)}
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-sm border-2 border-[#04090b] bg-[#0c171a] px-3 py-2.5 text-sm font-bold text-[#c9e4dd] transition hover:-translate-y-0.5 hover:border-[#ff3d8d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff3d8d]"
          >
            <img src={logo} alt="" className="size-5 object-contain" />
            {label}
            <ArrowUpRight className="ml-auto size-3.5 opacity-60" />
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={() => simulate("Copy subscription URL")}
          className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline"
        >
          <Copy size={13} />
          Copy subscription URL
        </button>
        <button
          type="button"
          onClick={() => simulate("Download .ics")}
          className="flex min-h-8 cursor-pointer items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline"
        >
          <Download size={13} />
          Download .ics
        </button>
      </div>
      <p className="mt-2 text-xs opacity-65">Design preview · calendar actions are simulated.</p>
      <p role="status" className="mt-1 text-xs font-semibold">
        {notice}
      </p>
    </div>
  );
}
