import { fetchOpenMeteoData } from "./server/open-meteo/forecast.js";

// Test coordinates: Tel Aviv (32.0853°N, 34.7818°E)
const lat = 32.0853;
const lon = 34.7818;
const model = "gfs_global";
const tz = "Asia/Jerusalem";

console.log("Fetching Open-Meteo data...");
console.log(`Location: ${lat}, ${lon}`);
console.log(`Model: ${model}`);
console.log(`Timezone: ${tz}`);
console.log("");

try {
  const result = await fetchOpenMeteoData(lat, lon, model, tz);

  console.log("=== RESULT ===");
  console.log(`Sunrise: ${result.sunrise}`);
  console.log(`Sunset: ${result.sunset}`);
  console.log(`Wind data points: ${result.windData.length}`);
  console.log("");

  console.log("=== FIRST 24 HOURS ===");
  result.windData.slice(0, 24).forEach((condition, _i) => {
    console.log(
      `${condition.date.toISOString()} | ` +
        `Wind: ${condition.windSpeed ?? "N/A"} kn @ ${condition.windDirection ?? "N/A"}° | ` +
        `Gusts: ${condition.windGusts ?? "N/A"} kn | ` +
        `Wave: ${condition.waveHeight ?? "N/A"} m`,
    );
  });

  console.log("");
  console.log("=== FULL RESPONSE ===");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("ERROR:", error);
  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }
}
