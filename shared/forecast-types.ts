export interface HourlyCondition {
  time: string; // ISO 8601 timestamp
  windSpeed: number | null; // knots
  windGusts: number | null; // knots
  windDirection: string | null; // cardinal (N, NE, E, etc.)
  windDirectionDeg: number | null; // degrees 0-360
  waveHeight: number | null; // meters (total wave height)
  wavePeriod: number | null; // seconds
  waveDirection: string | null; // cardinal
  swellHeight: number | null; // meters
  swellPeriod: number | null; // seconds
}

export interface ForecastSession {
  start: string; // ISO 8601 timestamp
  end: string; // ISO 8601 timestamp
  matchType: "wind" | "wave" | "both";
  wind: {
    min: number; // knots (rounded)
    max: number; // knots (rounded)
    gustMax: number; // knots (rounded)
    direction: string; // dominant cardinal direction
  };
  wave: {
    avgHeight: number; // meters (2 decimal places)
    avgPeriod: number; // seconds (rounded)
    direction: string; // dominant cardinal direction
  };
  swell: {
    avgHeight: number; // meters (2 decimal places)
    avgPeriod: number; // seconds (rounded)
  };
  hourly: HourlyCondition[];
}

export interface ForecastResponse {
  meta: {
    location: string; // location slug (e.g. "beit-yanai")
    model: string | number; // Windguru model ID or Open-Meteo model string
    dataSource: string; // e.g. "windguru" or "open-meteo"
    generatedAt: string; // ISO 8601 timestamp
  };
  sessions: ForecastSession[];
}
