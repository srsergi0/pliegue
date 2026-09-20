export type ClassValue = string | false | null | undefined;

/**
 * Joins conditional class names. It intentionally does not merge conflicting
 * Tailwind utilities: variants are authored so their classes never conflict,
 * and callers only append layout utilities (margins, flex sizing, widths).
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
