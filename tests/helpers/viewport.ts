import { vi } from "vitest";

export function stubViewport(initialWidth: number, breakpoint = "48rem") {
  let width = initialWidth;
  document.documentElement.style.setProperty("--breakpoint-md", breakpoint);
  const queries = new Map<string, MediaQueryList>();
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("matchMedia", (query: string) => {
    if (!queries.has(query)) {
      const media = new EventTarget();
      Object.defineProperties(media, {
        media: { value: query },
        matches: {
          get: () => {
            const limit = query.match(/^\(width < ([\d.]+)(rem|px)\)$/);
            if (limit) return width < Number(limit[1]) * (limit[2] === "rem" ? 16 : 1);
            return false;
          },
        },
      });
      queries.set(query, media as MediaQueryList);
    }
    return queries.get(query)!;
  });
  return (nextWidth: number) => {
    const previous = new Map([...queries].map(([query, media]) => [query, media.matches]));
    width = nextWidth;
    vi.stubGlobal("innerWidth", width);
    for (const [query, media] of queries) {
      if (previous.get(query) !== media.matches) media.dispatchEvent(new Event("change"));
    }
    window.dispatchEvent(new Event("resize"));
  };
}
