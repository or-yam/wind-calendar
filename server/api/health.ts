import { defineHandler } from "nitro";
import { setHeader } from "nitro/h3";

export default defineHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});
