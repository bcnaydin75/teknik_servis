import { getClientLocale } from "../api-locale";
import { localeMessages } from "./locales";
import { createTranslator } from "./translate";

export function apiFallback(key: string): string {
  const locale = getClientLocale();
  return createTranslator(localeMessages[locale], locale)(key);
}
