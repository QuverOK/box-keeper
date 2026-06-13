import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/ui/utils";

export interface CategoryComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  placeholder = "Выберите или введите категорию",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const showCustomOption =
    trimmedSearch.length > 0 &&
    !categories.some((c) => c.toLowerCase() === trimmedSearch.toLowerCase());

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            placeholder="Поиск или новая категория..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Нет совпадений</CommandEmpty>
            <CommandGroup>
              {showCustomOption && (
                <CommandItem
                  value={trimmedSearch}
                  onSelect={() => handleSelect(trimmedSearch)}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Использовать: «{trimmedSearch}»
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => handleSelect(category)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === category ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
