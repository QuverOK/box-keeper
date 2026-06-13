export const MAX_ITEM_DESCRIPTION_LENGTH = 500;
export function clampItemDescription(value: string): string {
  return value.slice(0, MAX_ITEM_DESCRIPTION_LENGTH);
}
