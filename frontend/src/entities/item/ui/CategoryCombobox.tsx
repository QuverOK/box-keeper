import { useId, type KeyboardEvent, type Ref } from "react";
import { Input } from "@/shared/ui/input";

export interface CategoryComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  placeholder = "Категория",
  disabled = false,
  inputRef,
  onInputKeyDown,
}: CategoryComboboxProps) {
  const fallbackId = useId();
  const listId = id ? `${id}-suggestions` : fallbackId;

  return (
    <>
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </>
  );
}
