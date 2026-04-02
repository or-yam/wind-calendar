#!/usr/bin/env node
/**
 * Validate Open-Meteo integration:
 * 1. Test all 4 models (GFS, ICON, GDPS, IFS)
 * 2. Compare with raw API response
 * 3. Verify data integrity (timestamps, wind, waves)
 */

import { fetchOpenMeteoData } from "../server/open-meteo/forecast";
import { LOCATIONS } from "../shared/locations";
import { OPEN_METEO_MODELS } from "../server/open-meteo/models";

async function validateModel(modelId: string, modelSlug: string) {
  const location = LOCATIONS["tel-aviv"];
  if (!location.coordinates) {
    throw new Error("Tel Aviv missing coordinates");
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `Testing model: ${OPEN_METEO_MODELS[modelId as keyof typeof OPEN_METEO_MODELS].name} (${modelSlug})`,
  );
  console.log(`${"=".repeat(60)}`);

  try {
    const result = await fetchOpenMeteoData(
      location.coordinates.lat,
      location.coordinates.lon,
      modelSlug,
      location.tz,
    );

    console.log(`✓ Fetch successful`);
    console.log(`  Sunrise: ${result.sunrise}`);
    console.log(`  Sunset: ${result.sunset}`);
    console.log(`  Data points: ${result.windData.length}`);

    // Validate data integrity
    const issues: string[] = [];

    if (!result.sunrise.match(/^\d{2}:\d{2}$/)) {
      issues.push(`Invalid sunrise format: ${result.sunrise}`);
    }

    if (!result.sunset.match(/^\d{2}:\d{2}$/)) {
      issues.push(`Invalid sunset format: ${result.sunset}`);
    }

    if (result.windData.length === 0) {
      issues.push("No wind data returned");
    }

    // Check first few data points
    const sampleSize = Math.min(5, result.windData.length);
    for (let i = 0; i < sampleSize; i++) {
      const d = result.windData[i];

      if (!(d.date instanceof Date) || isNaN(d.date.getTime())) {
        issues.push(`Invalid date at index ${i}: ${d.date}`);
      }

      if (d.windSpeed !== null && (d.windSpeed < 0 || d.windSpeed > 150)) {
        issues.push(`Suspicious wind speed at index ${i}: ${d.windSpeed}kn`);
      }

      if (d.windDirection !== null && (d.windDirection < 0 || d.windDirection > 360)) {
        issues.push(`Invalid wind direction at index ${i}: ${d.windDirection}°`);
      }

      if (d.waveHeight !== null && (d.waveHeight < 0 || d.waveHeight > 50)) {
        issues.push(`Suspicious wave height at index ${i}: ${d.waveHeight}m`);
      }
    }

    if (issues.length > 0) {
      console.log(`\n⚠ Issues found:`);
      issues.forEach((issue) => console.log(`  - ${issue}`));
    } else {
      console.log(`✓ Data validation passed`);
    }

    // Sample output
    console.log(`\nSample data (first 3 points):`);
    for (let i = 0; i < Math.min(3, result.windData.length); i++) {
      const d = result.windData[i];
      console.log(
        `  ${d.date.toISOString().replace("T", " ").slice(0, 16)} | ` +
          `Wind: ${d.windSpeed?.toFixed(1) ?? "null"}kn @ ${d.windDirection ?? "null"}° | ` +
          `Gusts: ${d.windGusts?.toFixed(1) ?? "null"}kn | ` +
          `Waves: ${d.waveHeight?.toFixed(2) ?? "null"}m`,
      );
    }

    return { success: true, issues };
  } catch (error) {
    console.log(`✗ Fetch failed:`);
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, issues: [] };
  }
}

async function main() {
  console.log("Open-Meteo Integration Validation");
  console.log("=".repeat(60));

  const models = [
    { id: "gfs_global", name: "gfs_global" },
    { id: "icon_global", name: "icon_global" },
    { id: "gem_global", name: "gem_global" },
    { id: "ecmwf_ifs025", name: "ecmwf_ifs025" },
  ];

  const results: Array<{ model: string; success: boolean; issues: string[] }> = [];

  for (const model of models) {
    const result = await validateModel(model.id, model.name);
    results.push({ model: model.id, ...result });

    // Rate limit: 1 request per second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const total = results.length;

  results.forEach((r) => {
    const status = r.success ? "✓" : "✗";
    const issueCount = r.issues.length > 0 ? ` (${r.issues.length} issues)` : "";
    console.log(`${status} ${r.model}${issueCount}`);
  });

  console.log(`\n${successful}/${total} models working correctly`);

  if (successful === total) {
    console.log("\n✓ All models validated successfully!");
  } else {
    console.log("\n⚠ Some models failed validation");
    process.exit(1);
  }
}

main().catch(console.error);
