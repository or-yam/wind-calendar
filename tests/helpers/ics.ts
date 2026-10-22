export function readIcsEvents(body: string): Record<string, string>[] {
  const unfolded = body.replace(/\r\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT/g)].map((match) =>
    Object.fromEntries(
      match[1]
        .trimEnd()
        .split("\r\n")
        .map((line) => {
          const separator = line.indexOf(":");
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    ),
  );
}
