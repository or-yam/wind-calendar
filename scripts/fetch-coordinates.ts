#!/usr/bin/env node
/**
 * Fetch lat/lon coordinates for all active locations from Windguru API
 * Run: npx tsx scripts/fetch-coordinates.ts
 */

import { LOCATIONS } from "../shared/locations";
import { fetchSpotInfo } from "../server/windguru/fetch";

async function fetchCoordinates(spotId: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const spotInfo = await fetchSpotInfo(spotId);

    // Get coordinates from first tab (all tabs have same spot coordinates)
    if (!spotInfo.tabs || spotInfo.tabs.length === 0) {
      console.error(`Spot ${spotId} has no tabs`);
      return null;
    }

    const { lat, lon } = spotInfo.tabs[0];
    return { lat, lon };
  } catch (error) {
    console.error(`Error fetching spotId ${spotId}:`, error);
    return null;
  }
}

async function main() {
  console.log("Fetching coordinates for all locations...\n");

  const results: Record<string, { lat: number; lon: number }> = {};

  for (const [key, location] of Object.entries(LOCATIONS)) {
    console.log(`Fetching ${key} (spotId: ${location.spotId})...`);
    const coords = await fetchCoordinates(location.spotId);

    if (coords) {
      results[key] = coords;
      console.log(`  ✓ ${coords.lat}, ${coords.lon}`);
    } else {
      console.log(`  ✗ Failed`);
    }

    // Rate limit: 1 request per second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n\nTypeScript output for shared/locations.ts:\n");
  console.log("Add this to each location's config:\n");

  for (const [key, coords] of Object.entries(results)) {
    console.log(`  ${key}: { ..., coordinates: { lat: ${coords.lat}, lon: ${coords.lon} } },`);
  }
}

main().catch(console.error);
