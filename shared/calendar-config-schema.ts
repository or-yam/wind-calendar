import { z } from "zod";
import { LOCATIONS } from "./locations";

const locationIds = Object.keys(LOCATIONS) as [string, ...string[]];

export const calendarConfigSchema = z
  .object({
    locations: z.array(z.enum(locationIds)).min(1).max(3),
    minSessionHours: z.number().min(0).max(24),
    model: z.union([
      z.literal(3),
      z.literal(45),
      z.literal(59),
      z.literal(117),
      z.enum(["om_gfs", "om_icon", "om_gdps", "om_ifs"]),
    ]),
    windEnabled: z.boolean(),
    windMin: z.number().min(0),
    windMax: z.number().max(200),
    waveEnabled: z.boolean(),
    waveSource: z.enum(["total", "swell"]),
    waveHeightMin: z.number().min(0),
    waveHeightMax: z.number().max(20),
    wavePeriodMin: z.number().min(0),
  })
  .strict()
  .refine((config) => config.windMin < config.windMax, {
    message: "windMin must be less than windMax",
    path: ["windMin"],
  })
  .refine((config) => config.waveHeightMin < config.waveHeightMax, {
    message: "waveHeightMin must be less than waveHeightMax",
    path: ["waveHeightMin"],
  })
  .refine((config) => config.windEnabled || config.waveEnabled, {
    message: "At least one of wind or waves must be enabled",
  });
