import { vi } from "vitest";
import { LOCATIONS } from "../../shared/locations";
import { openMeteoForecast, openMeteoMarine } from "./open-meteo-http-fixtures";
import { windguruForecast, windguruSpot } from "./windguru-http-fixtures";
import { DEFAULT_PROVIDER_FIXTURES, type ProviderFixtures } from "./provider-hours";

export function mockExternalFetch(
  respond: (url: URL, init?: RequestInit) => Response | Promise<Response>,
) {
  const realFetch = globalThis.fetch;
  const requests: URL[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      return realFetch(input, init);
    }
    requests.push(url);
    return Promise.resolve().then(() => respond(url, init));
  });
  return { requests, spy };
}

export function providerResponse(url: URL, fixtures: ProviderFixtures = DEFAULT_PROVIDER_FIXTURES) {
  const params = url.searchParams;
  const entry = Object.entries(LOCATIONS).find(([, location]) =>
    url.hostname === "www.windguru.cz"
      ? location.spotId === params.get("id_spot")
      : String(location.coordinates.lat) === params.get("latitude") &&
        String(location.coordinates.lon) === params.get("longitude"),
  );
  const hours = entry && fixtures[entry[0]];
  if (!entry || !hours) throw new Error(`No provider fixture for ${url}`);
  const [, location] = entry;
  if (url.origin === "https://www.windguru.cz" && url.pathname === "/int/iapi.php") {
    if (params.get("q") === "forecast_spot") return Response.json(windguruSpot(location));
    if (params.get("q") === "forecast") {
      const model = Number(params.get("id_model"));
      if (![...location.models, 84].includes(model)) throw new Error(`Unexpected model: ${url}`);
      if (params.get("rundef") !== `run-${model}`) throw new Error(`Unexpected run: ${url}`);
      const points = model === 84 ? [...hours].reverse() : hours;
      return Response.json(windguruForecast(location, model, points));
    }
  }
  const { lat, lon } = location.coordinates;
  if (url.origin === "https://api.open-meteo.com" && url.pathname === "/v1/forecast") {
    return Response.json(openMeteoForecast(lat, lon, hours));
  }
  if (url.origin === "https://marine-api.open-meteo.com" && url.pathname === "/v1/marine") {
    return Response.json(openMeteoMarine(lat, lon, hours));
  }
  throw new Error(`Unexpected external HTTP request: ${url}`);
}
