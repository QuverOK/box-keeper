interface BoxWithItems {
  items?: Array<{
    category?: string | null;
  }> | null;
}

export function mergeCategorySuggestions(...lists: string[][]): string[] {
  const set = new Set<string>();
  for (const list of lists) {
    for (const entry of list) {
      const trimmed = entry.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

export function extractStorageCategories(boxes: BoxWithItems[]): string[] {
  const categories: string[] = [];
  for (const box of boxes) {
    for (const item of box.items ?? []) {
      const cat = item.category?.trim();
      if (cat) categories.push(cat);
    }
  }
  return mergeCategorySuggestions(categories);
}
