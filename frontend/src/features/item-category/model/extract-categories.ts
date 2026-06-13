interface BoxWithItems {
  items?: Array<{ category?: string | null }> | null;
}

export function extractStorageCategories(boxes: BoxWithItems[]): string[] {
  const set = new Set<string>();
  for (const box of boxes) {
    for (const item of box.items ?? []) {
      const cat = item.category?.trim();
      if (cat) set.add(cat);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}
