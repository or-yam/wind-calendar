#!/usr/bin/env node
/**
 * Test Open-Meteo fetch directly
 */

import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";
import { LOCATIONS } from "../shared/locations.js";

async function main() {
  const location = LOCATIONS["tel-aviv"];
  if (!location.coordinates) {
    throw new Error("Tel Aviv missing coordinates");
  }

  console.log(
    `Fetching Open-Meteo data for Tel Aviv (${location.coordinates.lat}, ${location.coordinates.lon})...`,
  );

  const result = await fetchOpenMeteoData(
    location.coordinates.lat,
    location.coordinates.lon,
    "gfs_global",
    location.tz,
  );

  console.log("\n=== RESULT ===");
  console.log(`Sunrise: ${result.sunrise}`);
  console.log(`Sunset: ${result.sunset}`);
  console.log(`Wind data points: ${result.windData.length}`);
  console.log(`\nFirst 5 data points:`);

  for (let i = 0; i < Math.min(5, result.windData.length); i++) {
    const d = result.windData[i];
    console.log(
      `  ${d.date.toISOString()} | Wind: ${d.windSpeed}kn @ ${d.windDirection}° | Gusts: ${d.windGusts}kn | Waves: ${d.waveHeight}m`,
    );
  }
}

main().catch(console.error);
