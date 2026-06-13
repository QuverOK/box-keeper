import { isDuplicateBoxName } from "@/features/box-validation";

export interface SearchableItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface SearchableBox {
  id: string;
  name: string;
  items: SearchableItem[];
}

export interface StorageSearchResult {
  item: SearchableItem | null;
  box: SearchableBox;
}

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query);
}

/**
 * Searches boxes and their items by literal substring (dots preserved).
 */
export function searchStorageBoxes(
  boxes: SearchableBox[],
  rawQuery: string,
): StorageSearchResult[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const results: StorageSearchResult[] = [];
  const seenBoxOnly = new Set<string>();

  for (const box of boxes) {
    let boxMatched = matchesQuery(box.name, q);

    for (const item of box.items) {
      const itemMatched =
        matchesQuery(item.name, q) ||
        matchesQuery(item.category, q) ||
        matchesQuery(item.description ?? "", q);

      if (itemMatched) {
        results.push({ item, box });
        boxMatched = false;
      }
    }

    if (boxMatched && !seenBoxOnly.has(box.id)) {
      seenBoxOnly.add(box.id);
      results.push({ item: null, box });
    }
  }

  return results;
}

export { isDuplicateBoxName };
