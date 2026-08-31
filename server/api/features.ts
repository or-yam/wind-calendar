import { defineHandler, HTTPError } from "nitro";
import { FEATURE_FLAGS, isFeatureEnabled } from "../feature-flags.js";

export default defineHandler(async (event) => {
  if (event.req.method !== "GET") {
    throw new HTTPError({ statusCode: 405, statusMessage: "Method Not Allowed" });
  }

  const [freeTextConfigBuilder, wavesForecast, windguruForecastModels] = await Promise.all([
    isFeatureEnabled(FEATURE_FLAGS.freeTextConfigBuilder),
    isFeatureEnabled(FEATURE_FLAGS.wavesForecast),
    isFeatureEnabled(FEATURE_FLAGS.windguruForecastModels),
  ]);
  event.res.headers.set("Cache-Control", "private, max-age=15");

  return { freeTextConfigBuilder, wavesForecast, windguruForecastModels };
});
