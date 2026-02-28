export function Caveats() {
  return (
    <section className="caveats">
      <h2>Important Notes</h2>

      <div className="caveat-item">
        <h3>Sync Frequency</h3>
        <p>
          Calendar refresh rates vary by provider:
          <strong> Google Calendar</strong> ~12–24 hours,
          <strong> Apple Calendar</strong> ~15 minutes (configurable),
          <strong> Outlook</strong> ~12 hours. Changes to your wind settings won't appear instantly.
        </p>
      </div>

      <div className="caveat-item">
        <h3>Forecast Accuracy</h3>
        <p>
          Wind predictions are forecasts, not guarantees. Always check current conditions before
          heading out. Data is sourced from third-party weather APIs and may differ from reality.
        </p>
      </div>

      <div className="caveat-item">
        <h3>Session Definition</h3>
        <p>
          A "session" is any consecutive block of hours where wind speed stays within your
          configured range. Events shorter than your minimum session hours are filtered out.
        </p>
      </div>

      <div className="caveat-item">
        <h3>Daylight Hours</h3>
        <p>
          Calendar shows 06:00–20:00 local time. Sessions outside this window are still included but
          may not be visible in the grid.
        </p>
      </div>

      <div className="caveat-item">
        <h3>Timezone</h3>
        <p>
          All times are displayed in your local timezone. Events are stored in UTC and converted for
          display.
        </p>
      </div>
    </section>
  );
}
