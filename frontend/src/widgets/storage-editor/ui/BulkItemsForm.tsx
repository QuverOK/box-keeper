import { useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  CategoryCombobox,
  clampItemDescription,
  MAX_ITEM_DESCRIPTION_LENGTH,
} from "@/entities/item";
import { createEmptyDraftItem, type DraftItem } from "../model/bulkItemTypes";
import { mergeCategorySuggestions } from "@/features/item-category";
export interface BulkItemsFormProps {
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  categories: string[];
  compact?: boolean;
}
export function BulkItemsForm({
  items,
  onChange,
  categories,
  compact = false,
}: BulkItemsFormProps) {
  const nameInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const categoryInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const descriptionInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const addRowButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const categorySuggestions = useMemo(
    () =>
      mergeCategorySuggestions(
        categories,
        items.map((item) => item.category),
      ),
    [categories, items],
  );
  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };
  const removeItem = (id: string) => {
    nameInputRefs.current.delete(id);
    categoryInputRefs.current.delete(id);
    descriptionInputRefs.current.delete(id);
    if (items.length <= 1) {
      onChange([createEmptyDraftItem()]);
      return;
    }
    onChange(items.filter((item) => item.id !== id));
  };
  const addRow = () => {
    const newItem = createEmptyDraftItem();
    pendingFocusIdRef.current = newItem.id;
    onChange([...items, newItem]);
  };
  const handleNameKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    itemId: string,
  ) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    categoryInputRefs.current.get(itemId)?.focus();
  };
  const handleCategoryKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    itemId: string,
  ) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    descriptionInputRefs.current.get(itemId)?.focus();
  };
  const handleDescriptionKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    addRowButtonRef.current?.focus();
  };
  const handleDescriptionShiftTab = (
    e: KeyboardEvent<HTMLInputElement>,
    itemId: string,
  ) => {
    if (e.key !== "Tab" || !e.shiftKey) return;
    e.preventDefault();
    categoryInputRefs.current.get(itemId)?.focus();
  };
  const handleCategoryShiftTab = (
    e: KeyboardEvent<HTMLInputElement>,
    itemId: string,
  ) => {
    if (e.key !== "Tab" || !e.shiftKey) return;
    e.preventDefault();
    nameInputRefs.current.get(itemId)?.focus();
  };
  useEffect(() => {
    const focusId = pendingFocusIdRef.current;
    if (!focusId) return;
    const input = nameInputRefs.current.get(focusId);
    if (input) {
      input.focus();
      pendingFocusIdRef.current = null;
    }
  }, [items]);
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={
            compact
              ? "grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
              : "space-y-3 p-3 border rounded-lg relative"
          }
        >
          {!compact && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Предмет {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                tabIndex={-1}
                onClick={() => removeItem(item.id)}
                aria-label="Удалить строку"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className={compact ? "" : "space-y-2"}>
            {!compact && <Label>Название</Label>}
            <Input
              ref={(el) => {
                if (el) nameInputRefs.current.set(item.id, el);
                else nameInputRefs.current.delete(item.id);
              }}
              placeholder="Название"
              value={item.name}
              onChange={(e) => updateItem(item.id, { name: e.target.value })}
              onKeyDown={(e) => handleNameKeyDown(e, item.id)}
            />
          </div>
          <div className={compact ? "" : "space-y-2"}>
            {!compact && <Label>Категория</Label>}
            <CategoryCombobox
              value={item.category}
              onChange={(category) => updateItem(item.id, { category })}
              categories={categorySuggestions}
              placeholder="Категория"
              inputRef={(el) => {
                if (el) categoryInputRefs.current.set(item.id, el);
                else categoryInputRefs.current.delete(item.id);
              }}
              onInputKeyDown={(e) => {
                handleCategoryShiftTab(e, item.id);
                handleCategoryKeyDown(e, item.id);
              }}
            />
          </div>
          <div className={compact ? "" : "space-y-2"}>
            {!compact && <Label>Описание</Label>}
            <Input
              ref={(el) => {
                if (el) descriptionInputRefs.current.set(item.id, el);
                else descriptionInputRefs.current.delete(item.id);
              }}
              placeholder="Описание"
              value={item.description}
              maxLength={MAX_ITEM_DESCRIPTION_LENGTH}
              onChange={(e) =>
                updateItem(item.id, {
                  description: clampItemDescription(e.target.value),
                })
              }
              onKeyDown={(e) => {
                handleDescriptionShiftTab(e, item.id);
                handleDescriptionKeyDown(e);
              }}
            />
            {!compact && (
              <p className="text-xs text-muted-foreground text-right">
                {item.description.length}/{MAX_ITEM_DESCRIPTION_LENGTH}
              </p>
            )}
          </div>
          {compact && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              tabIndex={-1}
              onClick={() => removeItem(item.id)}
              aria-label="Удалить строку"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button
        ref={addRowButtonRef}
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={addRow}
      >
        <Plus className="h-4 w-4" />
        Добавить строку
      </Button>
    </div>
  );
}
