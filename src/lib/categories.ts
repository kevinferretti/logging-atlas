import type { CategoryKey } from "./types";

export interface Category {
  key: CategoryKey;
  label: string; // plural, used in tabs/chips
  one: string; // singular, used on cards
  color: string;
  glyph: string;
  // Origin/subject semantics: the entry's primary country is where the work
  // is FROM and the extra countries are what it's ABOUT. Categories without
  // it read all covered countries as one flat "also covers" list.
  subjects: boolean;
  // Whether entries carry an optional URL (the recipe source, the place's
  // site). Media entries don't — the work itself is the reference.
  links: boolean;
}

export const CATEGORIES: Category[] = [
  { key: "recipe", label: "Recipes", one: "Recipe", color: "#8A5A3B", glyph: "R", subjects: false, links: true },
  { key: "book", label: "Books", one: "Book", color: "#5E7A6F", glyph: "B", subjects: true, links: false },
  { key: "movie", label: "Film", one: "Film", color: "#9B4A39", glyph: "F", subjects: true, links: false },
  { key: "music", label: "Music", one: "Music", color: "#A9762F", glyph: "M", subjects: true, links: false },
  { key: "place", label: "Places", one: "Place", color: "#4A5A63", glyph: "P", subjects: false, links: true },
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

/** True when the category splits countries into origin vs subject. */
export function hasSubjects(key: string): boolean {
  return byKey.get(key as CategoryKey)?.subjects ?? false;
}

/** True when the category's entries carry an optional link. */
export function hasLink(key: string): boolean {
  return byKey.get(key as CategoryKey)?.links ?? false;
}
