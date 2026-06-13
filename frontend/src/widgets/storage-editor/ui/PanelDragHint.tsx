import { ArrowDownToLine, Inbox, Move } from "lucide-react";
import { cn } from "@/shared/lib/cn";

type PanelDragHintKind =
  | "dropToStaging"
  | "dragOnCanvas"
  | "dragToCanvas"
  | "emptyStaging";

const HINT_CONFIG: Record<
  PanelDragHintKind,
  { Icon: typeof Inbox; label: string }
> = {
  dropToStaging: {
    Icon: ArrowDownToLine,
    label: "Отпустите, чтобы убрать с холста",
  },
  dragOnCanvas: {
    Icon: Move,
    label: "Перетаскивайте элементы на холсте",
  },
  dragToCanvas: {
    Icon: Move,
    label: "Перетащите на холст",
  },
  emptyStaging: {
    Icon: Inbox,
    label: "Перетащите сюда коробку с холста",
  },
};

interface PanelDragHintProps {
  kind: PanelDragHintKind;
  active?: boolean;
}

export function PanelDragHint({ kind, active = false }: PanelDragHintProps) {
  const { Icon, label } = HINT_CONFIG[kind];
  return (
    <div
      className={cn(
        "w-full flex items-center justify-center rounded-md py-1.5 transition-colors shrink-0",
        active
          ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
          : "text-muted-foreground/70",
      )}
    >
      <Icon className="w-4 h-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}
