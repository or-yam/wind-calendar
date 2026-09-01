import { defineHandler } from "nitro";
import { getFeatureFlags } from "../feature-flags.js";

export default defineHandler(async (event) => {
  const features = await getFeatureFlags();
  event.res.headers.set("Cache-Control", "private, max-age=15");

  return features;
});
