import { vi } from "vitest";

export function stubViewport(initialWidth: number) {
  let width = initialWidth;
  const queries = new Map<string, MediaQueryList>();
  vi.stubGlobal("innerWidth", width);
  vi.stubGlobal("matchMedia", (query: string) => {
    if (!queries.has(query)) {
      const media = new EventTarget();
      Object.defineProperties(media, {
        media: { value: query },
        matches: { get: () => query === "(max-width: 767px)" && width < 768 },
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
