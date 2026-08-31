/** Values a translation key may resolve to. */
export type TranslationValue = unknown;

/** Replaces {name} placeholders with the matching value. */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Walks a dot-separated path through the dictionary. Returns undefined if absent. */
export function lookup(dict: unknown, path: string): TranslationValue {
  let current: TranslationValue = dict;
  for (const segment of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
