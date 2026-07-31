import type { Locale } from "./config";

export type MessageTree = string | { [key: string]: MessageTree };

export function getNestedMessage(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let current: MessageTree = tree;

  for (const part of parts) {
    if (typeof current === "string") return undefined;
    const next = current[part];
    if (next === undefined) return undefined;
    current = next;
  }

  return typeof current === "string" ? current : undefined;
}

export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`
  );
}

export function createTranslator(messages: MessageTree, locale: Locale) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const value = getNestedMessage(messages, key);
    if (value) return interpolate(value, params);
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n:${locale}] Missing key: ${key}`);
    }
    return key;
  };
}
