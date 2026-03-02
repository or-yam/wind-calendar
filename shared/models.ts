export const MODELS = {
  3: { id: 3, name: "GFS 13 km" },
  45: { id: 45, name: "ICON 13 km" },
  59: { id: 59, name: "GDPS 15 km" },
  117: { id: 117, name: "IFS-HRES 9 km" },
} as const;

export type ModelId = keyof typeof MODELS;

export function isValidModelId(id: number): id is ModelId {
  return id in MODELS;
}
