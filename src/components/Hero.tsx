export function Hero() {
  return (
    <header className="content-wrap py-6">
      <div className="flex items-center justify-between gap-5">
        <h1 className="font-title -rotate-3 text-[clamp(2.5rem,6vw,3.4rem)] leading-[0.95] tracking-[-0.04em] text-primary [text-shadow:3px_3px_0_#3ee6cf]">
          Wind Calendar
        </h1>
        <img
          src="/android-chrome-512x512.png"
          alt=""
          className="size-14 shrink-0 rotate-6 rounded-full border-[3px] border-secondary shadow-[4px_4px_0_#ff3d8d] md:size-16"
        />
      </div>
      <p className="mt-5 max-w-xl text-xl font-bold">
        Only the days worth surfing Synced to your calendar
      </p>
    </header>
  );
}
