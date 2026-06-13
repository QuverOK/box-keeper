import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { BulkItemsForm } from "./BulkItemsForm";
import {
  createEmptyDraftItem,
  draftItemsToInput,
  type DraftItem,
  type ItemInput,
} from "../model/bulkItemTypes";
export interface AddItemsDialogProps {
  categories: string[];
  onSubmit: (items: ItemInput[]) => void | Promise<void>;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  readOnly?: boolean;
  onRequireAuth?: () => void;
}
export function AddItemsDialog({
  categories,
  onSubmit,
  trigger,
  title = "Добавить несколько предметов",
  description = "Заполните строки для быстрого добавления",
  submitLabel = "Добавить",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  readOnly = false,
  onRequireAuth,
}: AddItemsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([createEmptyDraftItem()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;
  const reset = () => {
    setItems([createEmptyDraftItem()]);
    setError(null);
  };
  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    setOpen(next);
  };
  const handleSubmit = async () => {
    const validItems = draftItemsToInput(items);
    if (validItems.length === 0) {
      setError("Укажите хотя бы одно название предмета");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(validItems);
      handleOpenChange(false);
    } catch {
      setError("Не удалось добавить предметы");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Dialog open={readOnly ? false : open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
            onClick={(e) => {
              if (readOnly) {
                e.preventDefault();
                onRequireAuth?.();
              }
            }}
          >
            <Plus className="h-4 w-4" />
            Добавить несколько
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <BulkItemsForm
          items={items}
          onChange={setItems}
          categories={categories}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Добавление…" : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
