import { defineHandler } from "nitro";
import { observedHandler } from "../utils/observed-handler.js";
import { getFeatureFlags } from "../feature-flags.js";

export default defineHandler(
  observedHandler("/api/features", async (event) => {
    const features = await getFeatureFlags();
    event.res.headers.set("Cache-Control", "private, max-age=15");

    return features;
  }),
);
