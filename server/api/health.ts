import { defineHandler } from "nitro";

export default defineHandler((event) => {
  event.res.headers.set("Cache-Control", "no-store");
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
  };
});
