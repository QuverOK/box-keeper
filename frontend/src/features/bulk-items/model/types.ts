import { clampItemDescription } from "@/entities/item";

export interface DraftItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface ItemInput {
  name: string;
  category: string;
  description?: string;
}

export function createEmptyDraftItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    category: "",
    description: "",
  };
}

export function draftItemsToInput(items: DraftItem[]): ItemInput[] {
  return items
    .filter((item) => item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      category: item.category.trim(),
      description: clampItemDescription(item.description).trim() || undefined,
    }));
}
