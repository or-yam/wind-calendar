import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Test coordinates: Tel Aviv (32.0853°N, 34.7818°E)
  const lat = 32.0853;
  const lon = 34.7818;
  const model = "gfs_global";
  const tz = "Asia/Jerusalem";

  try {
    console.log("Fetching Open-Meteo data...");
    console.log(`Location: ${lat}, ${lon}`);
    console.log(`Model: ${model}`);
    console.log(`Timezone: ${tz}`);

    const result = await fetchOpenMeteoData(lat, lon, model, tz);

    console.log("=== RESULT ===");
    console.log(`Sunrise: ${result.sunrise}`);
    console.log(`Sunset: ${result.sunset}`);
    console.log(`Wind data points: ${result.windData.length}`);

    console.log("\n=== FIRST 24 HOURS ===");
    result.windData.slice(0, 24).forEach((condition) => {
      console.log(
        `${condition.date.toISOString()} | ` +
          `Wind: ${condition.windSpeed ?? "N/A"} kn @ ${condition.windDirection ?? "N/A"}° | ` +
          `Gusts: ${condition.windGusts ?? "N/A"} kn | ` +
          `Wave: ${condition.waveHeight ?? "N/A"} m`,
      );
    });

    res.status(200).json({
      success: true,
      sunrise: result.sunrise,
      sunset: result.sunset,
      totalDataPoints: result.windData.length,
      first24Hours: result.windData.slice(0, 24).map((c) => ({
        date: c.date.toISOString(),
        windSpeed: c.windSpeed,
        windDirection: c.windDirection,
        windGusts: c.windGusts,
        waveHeight: c.waveHeight,
      })),
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
