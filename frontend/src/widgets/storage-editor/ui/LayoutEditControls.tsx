import { useState, useEffect, useRef, type ReactNode } from "react";
import { Trash2, Columns3, Type, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { normalizeApiError } from "@/shared/api";
import { cn } from "@/shared/lib/cn";
import {
  STAGING_CARD_SIZE_CLASS,
  STORAGE_STAGING_SCROLL_CLASS,
  STAGING_SCROLL_WRAPPER_CLASS,
} from "../model/viewportZoom";
import {
  DEFAULT_PART_DEPTH,
  DEFAULT_PART_HEIGHT,
  DEFAULT_PART_WIDTH,
} from "../model/layoutDefaults";
import type { LayoutDragItem } from "../model/useLayoutDrag";
import type { StorageCanvasLayoutDragApi } from "./StorageCanvas";
import type { Partition, LayoutLabel } from "@/shared/model";

export type PendingTemplateDrop = {
  kind: "partition" | "label";
  x: number;
  y: number;
};

interface LayoutEditControlsProps {
  partitions: Partition[];
  layoutLabels: LayoutLabel[];
  roomSize: {
    width: number;
    depth: number;
    height: number;
  };
  onCreatePartition: (data: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    label?: string;
  }) => Promise<void>;
  onDeletePartition: (id: string) => Promise<void>;
  onUpdatePartition?: (
    id: string,
    data: {
      x: number;
      y: number;
      z: number;
      width: number;
      depth: number;
      height: number;
      label?: string;
    },
  ) => Promise<void>;
  onCreateLabel: (data: {
    x: number;
    y: number;
    text: string;
  }) => Promise<void>;
  onDeleteLabel: (id: string) => Promise<void>;
  onUpdateLabel?: (
    id: string,
    data: {
      x: number;
      y: number;
      text: string;
    },
  ) => Promise<void>;
  variant?: "default" | "compact";
  scrollContainer?: "inner" | "none";
  dialogPortalContainer?: HTMLElement | null;
  layoutDragApi?: StorageCanvasLayoutDragApi | null;
  layoutEditMode?: boolean;
  usePointerDrag?: boolean;
  pendingTemplateDrop?: PendingTemplateDrop | null;
  onPendingTemplateDropHandled?: () => void;
}

export function LayoutEditControls({
  partitions,
  layoutLabels,
  roomSize: _roomSize,
  onCreatePartition,
  onDeletePartition,
  onUpdatePartition,
  onCreateLabel,
  onDeleteLabel,
  onUpdateLabel,
  variant = "default",
  scrollContainer = "inner",
  dialogPortalContainer = null,
  layoutDragApi = null,
  layoutEditMode = false,
  usePointerDrag = false,
  pendingTemplateDrop = null,
  onPendingTemplateDropHandled,
}: LayoutEditControlsProps) {
  void _roomSize;
  const [partOpen, setPartOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [px, setPx] = useState("0");
  const [py, setPy] = useState("0");
  const [pz, setPz] = useState("0");
  const [pw, setPw] = useState(String(DEFAULT_PART_WIDTH));
  const [pd, setPd] = useState(String(DEFAULT_PART_DEPTH));
  const [ph, setPh] = useState(String(DEFAULT_PART_HEIGHT));
  const [pLabel, setPLabel] = useState("");
  const [lx, setLx] = useState("0");
  const [ly, setLy] = useState("0");
  const [lText, setLText] = useState("");
  const [partError, setPartError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [editingPartitionId, setEditingPartitionId] = useState<string | null>(
    null,
  );
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const skipPartitionResetRef = useRef(false);
  const skipLabelResetRef = useRef(false);

  const openEditPartition = (p: Partition) => {
    skipPartitionResetRef.current = true;
    setEditingPartitionId(p.id);
    setPx(String(Math.round(p.x)));
    setPy(String(Math.round(p.y)));
    setPz(String(Math.round(p.z)));
    setPw(String(Math.round(p.width)));
    setPd(String(Math.round(p.depth)));
    setPh(String(Math.round(p.height)));
    setPLabel(p.label ?? "");
    setPartError(null);
    setPartOpen(true);
  };

  const openEditLabel = (l: LayoutLabel) => {
    skipLabelResetRef.current = true;
    setEditingLabelId(l.id);
    setLx(String(Math.round(l.x)));
    setLy(String(Math.round(l.y)));
    setLText(l.text);
    setLabelError(null);
    setLabelOpen(true);
  };

  useEffect(() => {
    if (!pendingTemplateDrop) return;
    const { kind, x, y } = pendingTemplateDrop;
    if (kind === "partition") {
      setEditingPartitionId(null);
      skipPartitionResetRef.current = true;
      setPx(String(Math.round(x)));
      setPy(String(Math.round(y)));
      setPz("0");
      setPw(String(DEFAULT_PART_WIDTH));
      setPd(String(DEFAULT_PART_DEPTH));
      setPh(String(DEFAULT_PART_HEIGHT));
      setPLabel("");
      setPartError(null);
      setPartOpen(true);
    } else {
      setEditingLabelId(null);
      skipLabelResetRef.current = true;
      setLx(String(Math.round(x)));
      setLy(String(Math.round(y)));
      setLText("");
      setLabelError(null);
      setLabelOpen(true);
    }
    onPendingTemplateDropHandled?.();
  }, [pendingTemplateDrop, onPendingTemplateDropHandled]);

  const submitPartition = async () => {
    setPartError(null);
    const data = {
      x: parseFloat(px),
      y: parseFloat(py),
      z: parseFloat(pz),
      width: parseFloat(pw),
      depth: parseFloat(pd),
      height: parseFloat(ph),
      label: pLabel.trim() || undefined,
    };
    try {
      if (editingPartitionId && onUpdatePartition) {
        await onUpdatePartition(editingPartitionId, data);
      } else {
        await onCreatePartition(data);
      }
      setPartOpen(false);
      setEditingPartitionId(null);
    } catch (err) {
      setPartError(normalizeApiError(err).message);
    }
  };

  const submitLabel = async () => {
    if (!lText.trim()) return;
    setLabelError(null);
    const data = {
      x: parseFloat(lx),
      y: parseFloat(ly),
      text: lText.trim(),
    };
    try {
      if (editingLabelId && onUpdateLabel) {
        await onUpdateLabel(editingLabelId, data);
      } else {
        await onCreateLabel(data);
      }
      setLabelOpen(false);
      setEditingLabelId(null);
      if (!editingLabelId) setLText("");
    } catch (err) {
      setLabelError(normalizeApiError(err).message);
    }
  };

  const partitionDialog = (
    <Dialog
      open={partOpen}
      onOpenChange={(open) => {
        setPartOpen(open);
        if (open && !skipPartitionResetRef.current) {
          setPx("0");
          setPy("0");
          setPz("0");
          setPw(String(DEFAULT_PART_WIDTH));
          setPd(String(DEFAULT_PART_DEPTH));
          setPh(String(DEFAULT_PART_HEIGHT));
          setPLabel("");
        }
        skipPartitionResetRef.current = false;
        if (!open) {
          setPartError(null);
          setEditingPartitionId(null);
        }
      }}
    >
      <DialogContent portalContainer={dialogPortalContainer}>
        <DialogHeader>
          <DialogTitle>
            {editingPartitionId
              ? "Редактировать перегородку"
              : "Новая перегородка"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 py-2">
          <div>
            <Label>X (см)</Label>
            <Input value={px} onChange={(e) => setPx(e.target.value)} />
          </div>
          <div>
            <Label>Y (см)</Label>
            <Input value={py} onChange={(e) => setPy(e.target.value)} />
          </div>
          <div>
            <Label>Z (см)</Label>
            <Input value={pz} onChange={(e) => setPz(e.target.value)} />
          </div>
          <div>
            <Label>Длина</Label>
            <Input value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <Label>Ширина</Label>
            <Input value={pd} onChange={(e) => setPd(e.target.value)} />
          </div>
          <div>
            <Label>Высота</Label>
            <Input value={ph} onChange={(e) => setPh(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Подпись (необязательно)</Label>
          <Input value={pLabel} onChange={(e) => setPLabel(e.target.value)} />
        </div>
        {partError && (
          <Alert variant="destructive">
            <AlertDescription>{partError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button onClick={submitPartition}>
            {editingPartitionId ? "Сохранить" : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const labelDialog = (
    <Dialog
      open={labelOpen}
      onOpenChange={(open) => {
        setLabelOpen(open);
        if (open && !skipLabelResetRef.current) {
          setLx("0");
          setLy("0");
          setLText("");
        }
        skipLabelResetRef.current = false;
        if (!open) {
          setLabelError(null);
          setEditingLabelId(null);
        }
      }}
    >
      <DialogContent portalContainer={dialogPortalContainer}>
        <DialogHeader>
          <DialogTitle>
            {editingLabelId ? "Редактировать текст" : "Текст на плане"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div>
            <Label>X (см)</Label>
            <Input value={lx} onChange={(e) => setLx(e.target.value)} />
          </div>
          <div>
            <Label>Y (см)</Label>
            <Input value={ly} onChange={(e) => setLy(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Текст</Label>
          <Input
            value={lText}
            onChange={(e) => setLText(e.target.value)}
            autoFocus
          />
        </div>
        {labelError && (
          <Alert variant="destructive">
            <AlertDescription>{labelError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button onClick={submitLabel} disabled={!lText.trim()}>
            {editingLabelId ? "Сохранить" : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const dragFromPanel = !!(layoutDragApi && layoutEditMode);
  const templatePartition: LayoutDragItem = { kind: "template-partition" };
  const templateLabel: LayoutDragItem = { kind: "template-label" };

  const renderTemplateCard = (
    item: LayoutDragItem,
    icon: ReactNode,
    label: string,
  ) => {
    const isDragging = layoutDragApi?.draggedLayoutItem?.kind === item.kind;
    const isTouchHold =
      dragFromPanel &&
      usePointerDrag &&
      layoutDragApi?.touchHoldTemplate === item.kind &&
      !isDragging;
    const html5Draggable = dragFromPanel && !usePointerDrag;

    return (
      <div
        key={item.kind}
        className="shrink-0"
        draggable={html5Draggable}
        onDragStart={
          html5Draggable
            ? (e) => layoutDragApi?.handleTemplateDragStart(e, item)
            : undefined
        }
        onDragEnd={
          dragFromPanel ? layoutDragApi?.handleLayoutDragEnd : undefined
        }
      >
        <Card
          className={cn(
            STAGING_CARD_SIZE_CLASS,
            "border-2 border-dashed border-border flex flex-col items-center justify-center transition-[box-shadow,opacity,transform] select-none shadow-sm",
            dragFromPanel &&
              (html5Draggable
                ? isDragging
                  ? "cursor-grabbing opacity-60"
                  : "cursor-grab hover:bg-muted/50"
                : isDragging
                  ? "cursor-grabbing opacity-60"
                  : "cursor-default"),
            isTouchHold && "scale-[0.97] opacity-90",
          )}
          style={
            dragFromPanel && usePointerDrag
              ? {
                  touchAction: isDragging ? "none" : "pan-x pinch-zoom",
                  WebkitTouchCallout: "none",
                  WebkitTapHighlightColor: "transparent",
                }
              : undefined
          }
          onPointerDown={
            dragFromPanel && usePointerDrag
              ? (e) =>
                  layoutDragApi?.onLayoutTemplatePointerDown(
                    e,
                    item,
                    layoutDragApi.getTemplateOffsetPx(item),
                  )
              : undefined
          }
        >
          {icon}
          <p className="text-[9px] sm:text-xs font-medium text-muted-foreground text-center px-1 leading-tight">
            {label}
          </p>
        </Card>
      </div>
    );
  };

  const cardStrip = (
    <div
      className={cn(
        scrollContainer === "inner" && STORAGE_STAGING_SCROLL_CLASS,
        "flex gap-1.5 min-h-14 rounded-lg sm:gap-3 sm:min-h-[96px]",
        scrollContainer === "inner"
          ? cn(STAGING_SCROLL_WRAPPER_CLASS, "p-1.5 sm:p-3")
          : "w-max min-w-full pb-0",
      )}
    >
      {renderTemplateCard(
        templatePartition,
        <Columns3 className="w-3.5 h-3.5 mb-0.5 shrink-0 sm:w-5 sm:h-5 sm:mb-1 text-muted-foreground" />,
        "Перегородка",
      )}
      {renderTemplateCard(
        templateLabel,
        <Type className="w-3.5 h-3.5 mb-0.5 shrink-0 sm:w-5 sm:h-5 sm:mb-1 text-muted-foreground" />,
        "Текст",
      )}
      {partitions.map((p) => (
        <Card
          key={p.id}
          className={cn(
            STAGING_CARD_SIZE_CLASS,
            "shrink-0 relative overflow-hidden select-none border shadow-sm bg-slate-500/20 border-slate-600/60",
          )}
        >
          <div className="p-1 sm:p-2 h-full flex flex-col items-center justify-center text-center">
            <Columns3 className="w-3.5 h-3.5 mb-0.5 shrink-0 sm:w-5 sm:h-5 sm:mb-1 text-slate-700 dark:text-slate-300" />
            <p className="text-[9px] sm:text-xs font-medium wrap-break-word line-clamp-1 sm:line-clamp-2 leading-tight text-foreground">
              {p.label ?? `${Math.round(p.width)}×${Math.round(p.depth)}`}
            </p>
          </div>
          {onUpdatePartition && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0.5 left-0.5 h-5 w-5 sm:h-6 sm:w-6"
              aria-label="Редактировать перегородку"
              onClick={() => openEditPartition(p)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0.5 right-0.5 h-5 w-5 sm:h-6 sm:w-6"
            aria-label="Удалить перегородку"
            onClick={() => onDeletePartition(p.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </Card>
      ))}
      {layoutLabels.map((l) => (
        <Card
          key={l.id}
          className={cn(
            STAGING_CARD_SIZE_CLASS,
            "shrink-0 relative overflow-hidden select-none border shadow-sm",
          )}
        >
          <div className="p-1 sm:p-2 h-full flex flex-col items-center justify-center text-center">
            <Type className="w-3.5 h-3.5 mb-0.5 shrink-0 sm:w-5 sm:h-5 sm:mb-1 text-muted-foreground" />
            <p className="text-[9px] sm:text-xs font-medium wrap-break-word line-clamp-1 sm:line-clamp-2 leading-tight text-foreground">
              {l.text}
            </p>
          </div>
          {onUpdateLabel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-0.5 left-0.5 h-5 w-5 sm:h-6 sm:w-6"
              aria-label="Редактировать текст"
              onClick={() => openEditLabel(l)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0.5 right-0.5 h-5 w-5 sm:h-6 sm:w-6"
            aria-label="Удалить подпись"
            onClick={() => onDeleteLabel(l.id)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </Card>
      ))}
    </div>
  );

  if (variant === "compact") {
    return (
      <>
        {cardStrip}
        {partitionDialog}
        {labelDialog}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {cardStrip}
      {partitionDialog}
      {labelDialog}
    </div>
  );
}
