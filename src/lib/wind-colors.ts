const STOPS: [number, string][] = [
  [0, "#FFFFFF"],
  [5, "#67F7F1"],
  [10, "#00FF00"],
  [15, "#FFF000"],
  [20, "#FF322C"],
  [25, "#FF0AC8"],
  [30, "#FF00FF"],
  [40, "#9632FF"],
  [50, "#3C3CFF"],
  [60, "#0000FF"],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0").toUpperCase()).join("")
  );
}

export function windColor(knots: number): string {
  if (knots <= 0) return "#FFFFFF";
  if (knots >= 60) return "#0000FF";

  for (let i = 0; i < STOPS.length - 1; i++) {
    const [k0, c0] = STOPS[i];
    const [k1, c1] = STOPS[i + 1];
    if (knots >= k0 && knots <= k1) {
      const t = (knots - k0) / (k1 - k0);
      const [r0, g0, b0] = hexToRgb(c0);
      const [r1, g1, b1] = hexToRgb(c1);
      return rgbToHex(r0 + t * (r1 - r0), g0 + t * (g1 - g0), b0 + t * (b1 - b0));
    }
  }

  return "#0000FF";
}
