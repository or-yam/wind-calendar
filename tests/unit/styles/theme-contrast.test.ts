import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve("src/index.css"), "utf8");
const indexHtml = readFileSync(resolve("index.html"), "utf8");
const viteConfig = readFileSync(resolve("vite.config.ts"), "utf8");
const vercelConfig = readFileSync(resolve("vercel.ts"), "utf8");

function themeColor(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) throw new Error(`Missing hex color token --${name}`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
  const firstLuminance = luminance(first);
  const secondLuminance = luminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Beach Rat theme", () => {
  it.each([
    ["foreground", "background", 4.5],
    ["card-foreground", "card", 4.5],
    ["primary", "background", 4.5],
    ["secondary", "background", 4.5],
    ["border", "card", 3],
    ["input", "background", 3],
    ["control-track", "background", 3],
    ["control-off", "background", 3],
    ["range", "background", 3],
  ] as const)("%s has sufficient contrast against %s", (foreground, background, minimum) => {
    expect(contrast(themeColor(foreground), themeColor(background))).toBeGreaterThanOrEqual(
      minimum,
    );
  });

  it("self-hosts the selected fonts", () => {
    expect(indexHtml).not.toContain("fonts.googleapis.com");
    expect(indexHtml).not.toContain("fonts.gstatic.com");
    expect(viteConfig).not.toContain("fonts.googleapis.com");
    expect(viteConfig).not.toContain("fonts.gstatic.com");
    expect(vercelConfig).not.toContain("fonts.googleapis.com");
    expect(vercelConfig).not.toContain("fonts.gstatic.com");
    expect(css).toContain('url("/fonts/barlow-condensed-400.woff2")');
    expect(css).toContain('url("/fonts/permanent-marker-400.woff2")');

    for (const filename of [
      "barlow-condensed-400.woff2",
      "barlow-condensed-500.woff2",
      "barlow-condensed-600.woff2",
      "barlow-condensed-700.woff2",
      "permanent-marker-400.woff2",
      "barlow-condensed-OFL.txt",
      "permanent-marker-LICENSE.txt",
    ]) {
      expect(existsSync(resolve("public/fonts", filename)), filename).toBe(true);
    }
  });
});
