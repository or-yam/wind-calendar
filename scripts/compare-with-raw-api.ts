#!/usr/bin/env node
/**
 * Compare our processed data with raw Open-Meteo API responses
 * to ensure data integrity through the pipeline
 */

import { fetchForecast, fetchMarine } from "../server/open-meteo/fetch.js";
import { fetchOpenMeteoData } from "../server/open-meteo/forecast.js";
import { LOCATIONS } from "../shared/locations.js";

async function main() {
  const location = LOCATIONS["tel-aviv"];
  if (!location.coordinates) {
    throw new Error("Tel Aviv missing coordinates");
  }

  const { lat, lon } = location.coordinates;
  const model = "gfs_global";
  const tz = location.tz;

  console.log("Comparing raw API response with processed data");
  console.log("=".repeat(70));
  console.log(`Location: Tel Aviv (${lat}, ${lon})`);
  console.log(`Model: ${model}`);
  console.log(`Timezone: ${tz}\n`);

  // Fetch raw API responses
  console.log("Fetching raw API responses...");
  const [rawForecast, rawMarine] = await Promise.all([
    fetchForecast(lat, lon, model, tz),
    fetchMarine(lat, lon, tz),
  ]);

  console.log(`✓ Raw forecast data: ${rawForecast.hourly.time.length} hourly points`);
  console.log(`✓ Raw marine data: ${rawMarine.hourly.time.length} hourly points`);

  // Fetch processed data
  console.log("\nFetching processed data...");
  const processed = await fetchOpenMeteoData(lat, lon, model, tz);
  console.log(`✓ Processed data: ${processed.windData.length} data points`);

  // Compare sunrise/sunset
  console.log("\n" + "=".repeat(70));
  console.log("SUNRISE/SUNSET VALIDATION");
  console.log("=".repeat(70));

  const rawSunrise = rawForecast.daily?.sunrise?.[0] ?? "missing";
  const rawSunset = rawForecast.daily?.sunset?.[0] ?? "missing";

  console.log(`Raw sunrise:       ${rawSunrise}`);
  console.log(`Processed sunrise: ${processed.sunrise}`);
  console.log(`Match: ${rawSunrise.includes(processed.sunrise) ? "✓" : "✗"}`);

  console.log(`\nRaw sunset:        ${rawSunset}`);
  console.log(`Processed sunset:  ${processed.sunset}`);
  console.log(`Match: ${rawSunset.includes(processed.sunset) ? "✓" : "✗"}`);

  // Compare wind data (first 10 points)
  console.log("\n" + "=".repeat(70));
  console.log("WIND DATA VALIDATION (first 10 points)");
  console.log("=".repeat(70));

  const sampleSize = Math.min(10, processed.windData.length);
  let mismatches = 0;

  for (let i = 0; i < sampleSize; i++) {
    const processedPoint = processed.windData[i];
    const rawTime = rawForecast.hourly.time[i];
    const rawWind = rawForecast.hourly.wind_speed_10m[i];
    const rawDir = rawForecast.hourly.wind_direction_10m[i];
    const rawGusts = rawForecast.hourly.wind_gusts_10m[i];

    // Convert raw time (in local TZ) to UTC for comparison
    // Raw time is "2026-03-03T00:00" which means midnight in Asia/Jerusalem
    // We need to subtract the UTC offset to get the UTC equivalent
    const rawTimeUtc = new Date(rawTime + "Z").getTime() - rawForecast.utc_offset_seconds * 1000;
    const processedTimeUtc = processedPoint.date.getTime();

    const timeMatch = rawTimeUtc === processedTimeUtc;
    const windMatch = processedPoint.windSpeed === rawWind;
    const dirMatch = processedPoint.windDirection === rawDir;
    const gustsMatch = processedPoint.windGusts === rawGusts;

    if (!timeMatch || !windMatch || !dirMatch || !gustsMatch) {
      mismatches++;
      console.log(`\n[${i}] MISMATCH:`);
      console.log(
        `  Time:  ${rawTime} (${new Date(rawTimeUtc).toISOString()}) → ${processedPoint.date.toISOString()} ${timeMatch ? "✓" : "✗"}`,
      );
      console.log(`  Wind:  ${rawWind}kn → ${processedPoint.windSpeed}kn ${windMatch ? "✓" : "✗"}`);
      console.log(`  Dir:   ${rawDir}° → ${processedPoint.windDirection}° ${dirMatch ? "✓" : "✗"}`);
      console.log(
        `  Gusts: ${rawGusts}kn → ${processedPoint.windGusts}kn ${gustsMatch ? "✓" : "✗"}`,
      );
    }
  }

  if (mismatches === 0) {
    console.log("✓ All wind data matches raw API response");
  } else {
    console.log(`\n⚠ ${mismatches}/${sampleSize} points have mismatches`);
  }

  // Compare wave data (first 10 points)
  console.log("\n" + "=".repeat(70));
  console.log("WAVE DATA VALIDATION (first 10 points)");
  console.log("=".repeat(70));

  let waveMismatches = 0;

  for (let i = 0; i < sampleSize; i++) {
    const processedPoint = processed.windData[i];

    // Find matching timestamp in marine data by converting both to UTC milliseconds
    const processedTimeUtc = processedPoint.date.getTime();
    const marineIndex = rawMarine.hourly.time.findIndex((t) => {
      const marineTimeUtc = new Date(t + "Z").getTime() - rawMarine.utc_offset_seconds * 1000;
      return marineTimeUtc === processedTimeUtc;
    });

    if (marineIndex === -1) {
      console.log(`\n[${i}] No matching marine timestamp for ${processedPoint.date.toISOString()}`);
      waveMismatches++;
      continue;
    }

    const rawMarineTime = rawMarine.hourly.time[marineIndex];
    const matchedWave = rawMarine.hourly.wave_height[marineIndex];
    const waveMatch = processedPoint.waveHeight === matchedWave;

    if (!waveMatch) {
      waveMismatches++;
      console.log(`\n[${i}] WAVE MISMATCH:`);
      console.log(`  Time:  ${rawMarineTime} (processed: ${processedPoint.date.toISOString()})`);
      console.log(`  Wave:  ${matchedWave}m → ${processedPoint.waveHeight}m ✗`);
    }
  }

  if (waveMismatches === 0) {
    console.log("✓ All wave data matches raw API response");
  } else {
    console.log(`\n⚠ ${waveMismatches}/${sampleSize} points have mismatches`);
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const sunriseOk = rawSunrise.includes(processed.sunrise);
  const sunsetOk = rawSunset.includes(processed.sunset);
  const windOk = mismatches === 0;
  const waveOk = waveMismatches === 0;

  console.log(`Sunrise/Sunset: ${sunriseOk && sunsetOk ? "✓" : "✗"}`);
  console.log(`Wind data:      ${windOk ? "✓" : "✗"}`);
  console.log(`Wave data:      ${waveOk ? "✓" : "✗"}`);

  if (sunriseOk && sunsetOk && windOk && waveOk) {
    console.log("\n✓ Data pipeline integrity verified!");
  } else {
    console.log("\n⚠ Data pipeline has integrity issues");
    process.exit(1);
  }
}

main().catch(console.error);
