import { defineHandler, HTTPError } from "nitro";
import { FEATURE_FLAGS, isFeatureEnabled } from "../feature-flags.js";

export default defineHandler(async (event) => {
  if (event.req.method !== "GET") {
    throw new HTTPError({ statusCode: 405, statusMessage: "Method Not Allowed" });
  }

  const freeTextConfigBuilder = await isFeatureEnabled(FEATURE_FLAGS.freeTextConfigBuilder);
  event.res.headers.set("Cache-Control", "private, max-age=15");

  return { freeTextConfigBuilder };
});
