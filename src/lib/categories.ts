import type { CategoryKey } from "./types";

export interface Category {
  key: CategoryKey;
  label: string; // plural, used in tabs/chips
  one: string; // singular, used on cards
  color: string;
  glyph: string;
}

export const CATEGORIES: Category[] = [
  { key: "recipe", label: "Recipes", one: "Recipe", color: "#8A5A3B", glyph: "R" },
  { key: "book", label: "Books", one: "Book", color: "#5E7A6F", glyph: "B" },
  { key: "movie", label: "Film", one: "Film", color: "#9B4A39", glyph: "F" },
  { key: "music", label: "Music", one: "Music", color: "#A9762F", glyph: "M" },
  { key: "place", label: "Places", one: "Place", color: "#4A5A63", glyph: "P" },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

const byKey = new Map(CATEGORIES.map((c) => [c.key, c]));

export function category(key: string): Category | undefined {
  return byKey.get(key as CategoryKey);
}
export function catColor(key: string): string {
  return byKey.get(key as CategoryKey)?.color ?? "#8A5A3B";
}
export function catGlyph(key: string): string {
  return byKey.get(key as CategoryKey)?.glyph ?? "?";
}
export function catLabelOne(key: string): string {
  return byKey.get(key as CategoryKey)?.one ?? "";
}

export function isCategoryKey(value: string): value is CategoryKey {
  return byKey.has(value as CategoryKey);
}
