// Open-Meteo uses the response's single offset for all hourly and daily ISO labels.
export function parseOpenMeteoTimestamp(isoString: string, utcOffsetSeconds: number): Date {
  return new Date(new Date(isoString + "Z").getTime() - utcOffsetSeconds * 1000);
}
