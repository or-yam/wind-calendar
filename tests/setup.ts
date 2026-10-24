import { beforeEach } from "vitest";
import i18n, { applyDocumentLocale } from "../src/i18n";

beforeEach(async () => {
  await i18n.changeLanguage("en");
  applyDocumentLocale("en");
});
