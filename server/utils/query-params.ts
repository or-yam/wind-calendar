export function queryToSearchParams(query: Record<string, unknown>): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string") {
      searchParams.append(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") searchParams.append(key, item);
      }
    }
  }

  return searchParams;
}
