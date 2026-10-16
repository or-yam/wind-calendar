import { describe, expect, it } from "vitest";
import { generateIcsEvents } from "../../../server/utils/generateIcsEvents";
import { calendarSession } from "../../helpers/calendar-session";
import { readIcsEvents } from "../../helpers/ics";

describe("calendar identity across timezones", () => {
  it("uses the same UID for equivalent UTC and offset-based times", () => {
    const [utc] = readIcsEvents(generateIcsEvents([calendarSession()]));
    const [offset] = readIcsEvents(
      generateIcsEvents([
        calendarSession({
          start: new Date("2026-06-15T08:00:00+03:00"),
          end: new Date("2026-06-15T11:00:00+03:00"),
        }),
      ]),
    );
    expect(offset.UID).toBe(utc.UID);
    expect(offset.DTSTART).toBe(utc.DTSTART);
    expect(offset.DTEND).toBe(utc.DTEND);
  });

  it("distinguishes repeated local times when daylight saving ends", () => {
    const entries = readIcsEvents(
      generateIcsEvents([
        calendarSession({
          start: new Date("2026-10-25T01:30:00+03:00"),
          end: new Date("2026-10-25T01:45:00+03:00"),
        }),
        calendarSession({
          start: new Date("2026-10-25T01:30:00+02:00"),
          end: new Date("2026-10-25T01:45:00+02:00"),
        }),
      ]),
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].DTSTART).toBe("20261024T223000Z");
    expect(entries[1].DTSTART).toBe("20261024T233000Z");
    expect(entries[1].UID).not.toBe(entries[0].UID);
  });
});
