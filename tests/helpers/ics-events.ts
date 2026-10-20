/** Unfold RFC 5545 lines and read event properties without comparing random UID/DTSTAMP. */
export function readIcsEvents(calendar: string): Record<string, string>[] {
  const unfolded = calendar.replace(/\r\n[ \t]/g, "");
  return [...unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)\r\nEND:VEVENT/g)].map((match) =>
    Object.fromEntries(
      match[1].split("\r\n").map((line) => {
        const colon = line.indexOf(":");
        const value = line
          .slice(colon + 1)
          .replace(/\\([nN,;\\])/g, (_, escaped: string) =>
            escaped.toLowerCase() === "n" ? "\n" : escaped,
          );
        return [line.slice(0, colon), value];
      }),
    ),
  );
}
