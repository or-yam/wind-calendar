export const WIND_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export type WindDirection = (typeof WIND_DIRECTIONS)[number];

const WIND_DIRECTION_SET = new Set<string>(WIND_DIRECTIONS);

export function canonicalizeWindDirections(directions: readonly WindDirection[]): WindDirection[] {
  const selected = new Set(directions);
  return WIND_DIRECTIONS.filter((direction) => selected.has(direction));
}

export function parseWindDirections(raw: string | null): WindDirection[] {
  if (raw === null) return [...WIND_DIRECTIONS];

  const values = raw.split(",").map((value) => value.trim());
  if (values.length === 1 && values[0] === "") {
    throw new Error("windDirections must contain at least one direction");
  }

  const invalid = values.find((value) => !WIND_DIRECTION_SET.has(value));
  if (invalid !== undefined) throw new Error(`Invalid windDirections: "${invalid}"`);
  if (new Set(values).size !== values.length) {
    throw new Error("windDirections must not contain duplicates");
  }

  return canonicalizeWindDirections(values as WindDirection[]);
}

export function degreesToCardinal(degrees: number): WindDirection | null {
  if (!Number.isFinite(degrees)) return null;
  const normalized = ((degrees % 360) + 360) % 360;
  return WIND_DIRECTIONS[Math.round(normalized / 45) % WIND_DIRECTIONS.length];
}
