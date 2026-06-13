import {
  ArrowLeft,
  Plus,
  Edit,
  List,
  Box as BoxIcon,
  Layers,
  LayoutGrid,
  Check,
  AlertCircle,
  Search,
  X,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
const boxListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const boxCardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" as const },
  },
};
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { UnitInput } from "@/shared/ui/unit-input";
import { Label } from "@/shared/ui/label";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Storage3DView } from "./Storage3DView";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import {
  MIN_BOX_DIMENSION_CM,
  validateBoxFitsInRoom,
  isDuplicateBoxName,
  validateStorageRoomFitsAllBoxes,
} from "@/features/box-validation";
import { extractStorageCategories } from "@/features/item-category";
import {
  createEmptyDraftItem,
  draftItemsToInput,
  type DraftItem,
} from "../model/bulkItemTypes";
import { BulkItemsForm } from "./BulkItemsForm";
import { searchStorageBoxes, type StorageSearchResult } from "../model/search";
import {
  LayoutEditControls,
  type PendingTemplateDrop,
} from "./LayoutEditControls";
import type { LayoutDragItem } from "../model/useLayoutDrag";
import { shouldUsePointerBoxDrag } from "../model/useBoxPointerDrag";
import type { StorageCanvasLayoutDragApi } from "./StorageCanvas";
import type { Partition, LayoutLabel } from "@/shared/model";
interface BoxItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}
interface Box {
  id: string;
  name: string;
  x?: number;
  y?: number;
  z?: number;
  itemCount: number;
  items: BoxItem[];
  color: string;
  sizeW: number;
  sizeD: number;
  sizeH: number;
}
interface SearchResult extends StorageSearchResult {
  box: Box;
}
interface StorageViewProps {
  storageName: string;
  boxes: Box[];
  onBack: () => void;
  onBoxClick: (boxId: string) => void;
  onAddBox: (
    name: string,
    sizeW: number,
    sizeD: number,
    sizeH: number,
    items?: Array<{
      name: string;
      category: string;
      description?: string;
    }>,
  ) => void | Promise<void>;
  onMoveBox: (
    boxId: string,
    newX?: number,
    newY?: number,
    newZ?: number,
  ) => void;
  gridSize: {
    x: number;
    y: number;
    z: number;
  };
  roomSize: {
    width: number;
    depth: number;
    height: number;
  };
  readOnly?: boolean;
  onRequireAuth?: () => void;
  highlightBoxId?: string;
  partitions?: Partition[];
  layoutLabels?: LayoutLabel[];
  onCreatePartition?: (data: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
    height: number;
    label?: string;
  }) => Promise<void>;
  onDeletePartition?: (id: string) => Promise<void>;
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
  onCreateLayoutLabel?: (data: {
    x: number;
    y: number;
    text: string;
  }) => Promise<void>;
  onDeleteLayoutLabel?: (id: string) => Promise<void>;
  onUpdateLayoutLabel?: (
    id: string,
    data: {
      x: number;
      y: number;
      text: string;
    },
  ) => Promise<void>;
  onMovePartition?: (id: string, x: number, y: number) => void;
  onMoveLayoutLabel?: (id: string, x: number, y: number) => void;
  onUpdateStorage?: (data: {
    name?: string;
    roomWidth?: number;
    roomDepth?: number;
    roomHeight?: number;
  }) => Promise<void>;
}
export function StorageView({
  storageName,
  boxes,
  onBack,
  onBoxClick,
  onAddBox,
  onMoveBox,
  gridSize,
  roomSize,
  readOnly = false,
  onRequireAuth,
  highlightBoxId,
  partitions = [],
  layoutLabels = [],
  onCreatePartition,
  onDeletePartition,
  onUpdatePartition,
  onCreateLayoutLabel,
  onDeleteLayoutLabel,
  onUpdateLayoutLabel,
  onMovePartition,
  onMoveLayoutLabel,
  onUpdateStorage,
}: StorageViewProps) {
  const [newBoxName, setNewBoxName] = useState("");
  const [boxSizeW, setBoxSizeW] = useState("");
  const [boxSizeD, setBoxSizeD] = useState("");
  const [boxSizeH, setBoxSizeH] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRoomWidth, setDraftRoomWidth] = useState("");
  const [draftRoomDepth, setDraftRoomDepth] = useState("");
  const [draftRoomHeight, setDraftRoomHeight] = useState("");
  const [storageEditError, setStorageEditError] = useState<string | null>(null);
  const [isSavingStorage, setIsSavingStorage] = useState(false);
  const effectiveEditMode = readOnly ? false : editMode;
  const effectiveLayoutEditMode = readOnly ? false : layoutEditMode;
  const promptAuth = () => setAuthDialogOpen(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreatingBox, setIsCreatingBox] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([
    createEmptyDraftItem(),
  ]);
  const availableCategories = useMemo(
    () => extractStorageCategories(boxes),
    [boxes],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [fullscreenDialogPortal, setFullscreenDialogPortal] =
    useState<HTMLDivElement | null>(null);
  const [fullscreenControl, setFullscreenControl] = useState<{
    toggle: () => void;
    isFullscreen: boolean;
  } | null>(null);
  const layoutDragApiRef = useRef<StorageCanvasLayoutDragApi | null>(null);
  const [pendingTemplateDrop, setPendingTemplateDrop] =
    useState<PendingTemplateDrop | null>(null);
  const [layoutDragApi, setLayoutDragApi] =
    useState<StorageCanvasLayoutDragApi | null>(null);
  const [usePointerDrag, setUsePointerDrag] = useState(shouldUsePointerBoxDrag);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    const onChange = () => setUsePointerDrag(mql.matches);
    mql.addEventListener("change", onChange);
    setUsePointerDrag(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  const handleLayoutDragMetaChange = useCallback(
    (meta: {
      draggedLayoutItem: LayoutDragItem | null;
      touchHoldTemplate: string | null;
      isTouchHoldActive: boolean;
      isPointerDragging: boolean;
    }) => {
      const api = layoutDragApiRef.current;
      setLayoutDragApi((prev) => {
        if (!api) return null;
        const next = { ...api, ...meta };
        if (
          prev &&
          prev.draggedLayoutItem === next.draggedLayoutItem &&
          prev.touchHoldTemplate === next.touchHoldTemplate &&
          prev.isTouchHoldActive === next.isTouchHoldActive &&
          prev.isPointerDragging === next.isPointerDragging
        ) {
          return prev;
        }
        return next;
      });
    },
    [],
  );
  const handleTemplatePlaced = useCallback(
    (data: PendingTemplateDrop) => setPendingTemplateDrop(data),
    [],
  );
  const handlePendingTemplateDropHandled = useCallback(
    () => setPendingTemplateDrop(null),
    [],
  );
  const handleFullscreenControlChange = useCallback(
    (control: { toggle: () => void; isFullscreen: boolean } | null) => {
      setFullscreenControl(control);
    },
    [],
  );
  const [highlightedBoxId, setHighlightedBoxId] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResults = useMemo<SearchResult[]>(() => {
    return searchStorageBoxes(boxes, searchQuery).map((r) => ({
      ...r,
      box: r.box as Box,
    }));
  }, [searchQuery, boxes]);
  const hasActiveSearch = searchQuery.trim().length > 0;
  const matchingBoxIds = useMemo(
    () => new Set(searchResults.map((r) => r.box.id)),
    [searchResults],
  );
  const handleSearchContainerBlur = (e: React.FocusEvent) => {
    if (!searchContainerRef.current?.contains(e.relatedTarget as Node)) {
      setSearchOpen(false);
      setHighlightedBoxId(null);
    }
  };
  const clearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
    setHighlightedBoxId(null);
  };
  const effectiveRoomSize = useMemo(() => {
    if (!effectiveEditMode) {
      return roomSize;
    }
    const w = parseFloat(draftRoomWidth);
    const d = parseFloat(draftRoomDepth);
    const h = parseFloat(draftRoomHeight);
    if (isNaN(w) || isNaN(d) || isNaN(h) || w <= 0 || d <= 0 || h <= 0) {
      return roomSize;
    }
    return { width: w, depth: d, height: h };
  }, [
    effectiveEditMode,
    draftRoomWidth,
    draftRoomDepth,
    draftRoomHeight,
    roomSize,
  ]);
  const roomWcm = Math.round(effectiveRoomSize.width * 100);
  const roomDcm = Math.round(effectiveRoomSize.depth * 100);
  const roomHcm = Math.round(effectiveRoomSize.height * 100);
  const validateBox = (
    name: string,
    w: number,
    d: number,
    h: number,
  ): string | null => {
    if (!name.trim()) return "Введите название коробки";
    if (isDuplicateBoxName(name, boxes)) {
      return "Коробка с таким названием уже существует";
    }
    if (isNaN(w) || w < MIN_BOX_DIMENSION_CM) {
      return `Длина коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    if (isNaN(d) || d < MIN_BOX_DIMENSION_CM) {
      return `Ширина коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    if (isNaN(h) || h < MIN_BOX_DIMENSION_CM) {
      return `Высота коробки не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    const roomCheck = validateBoxFitsInRoom(
      { sizeW: w, sizeD: d, sizeH: h },
      {
        roomWidth: effectiveRoomSize.width,
        roomDepth: effectiveRoomSize.depth,
        roomHeight: effectiveRoomSize.height,
      },
    );
    if (!roomCheck.valid) {
      return roomCheck.errors[0] ?? "Коробка не помещается в помещение";
    }
    return null;
  };
  const handleAddBox = async () => {
    const w = parseFloat(boxSizeW);
    const d = parseFloat(boxSizeD);
    const h = parseFloat(boxSizeH);
    const error = validateBox(newBoxName, w, d, h);
    if (error) {
      setValidationError(error);
      return;
    }
    setIsCreatingBox(true);
    try {
      const items = draftItemsToInput(draftItems);
      await onAddBox(newBoxName.trim(), w, d, h, items);
      resetDialog();
    } catch {
      setValidationError("Не удалось создать коробку");
    } finally {
      setIsCreatingBox(false);
    }
  };
  const resetDialog = () => {
    setNewBoxName("");
    setBoxSizeW("");
    setBoxSizeD("");
    setBoxSizeH("");
    setDraftItems([createEmptyDraftItem()]);
    setValidationError(null);
    setIsDialogOpen(false);
  };
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetDialog();
  };
  const handleEditModeToggle = async () => {
    if (readOnly) {
      promptAuth();
      return;
    }
    if (!editMode) {
      setDraftName(storageName);
      setDraftRoomWidth(String(roomSize.width));
      setDraftRoomDepth(String(roomSize.depth));
      setDraftRoomHeight(String(roomSize.height));
      setStorageEditError(null);
      setEditMode(true);
      return;
    }
    const trimmedName = draftName.trim();
    const w = parseFloat(draftRoomWidth);
    const d = parseFloat(draftRoomDepth);
    const h = parseFloat(draftRoomHeight);
    const nameChanged = trimmedName !== storageName;
    const widthChanged = w !== roomSize.width;
    const depthChanged = d !== roomSize.depth;
    const heightChanged = h !== roomSize.height;
    const isDirty =
      nameChanged || widthChanged || depthChanged || heightChanged;
    if (!isDirty) {
      setEditMode(false);
      setStorageEditError(null);
      return;
    }
    if (!trimmedName) {
      setStorageEditError("Введите название хранилища");
      return;
    }
    if (!draftRoomWidth || isNaN(w) || w <= 0) {
      setStorageEditError("Введите корректную ширину (> 0)");
      return;
    }
    if (!draftRoomDepth || isNaN(d) || d <= 0) {
      setStorageEditError("Введите корректную глубину (> 0)");
      return;
    }
    if (!draftRoomHeight || isNaN(h) || h <= 0) {
      setStorageEditError("Введите корректную высоту (> 0)");
      return;
    }
    if (w > 30) {
      setStorageEditError("Ширина не может превышать 30 м");
      return;
    }
    if (d > 30) {
      setStorageEditError("Глубина не может превышать 30 м");
      return;
    }
    if (h > 5) {
      setStorageEditError("Высота не может превышать 5 м");
      return;
    }
    const newRoom = {
      roomWidth: w,
      roomDepth: d,
      roomHeight: h,
    };
    const roomCheck = validateStorageRoomFitsAllBoxes(
      boxes.map((box) => ({
        name: box.name,
        sizeW: box.sizeW,
        sizeD: box.sizeD,
        sizeH: box.sizeH,
      })),
      newRoom,
    );
    if (!roomCheck.valid) {
      setStorageEditError(
        roomCheck.errors[0] ??
          "Невозможно изменить размеры: некоторые коробки превышают новые размеры хранилища",
      );
      return;
    }
    if (!onUpdateStorage) {
      setEditMode(false);
      setStorageEditError(null);
      return;
    }
    const payload: {
      name?: string;
      roomWidth?: number;
      roomDepth?: number;
      roomHeight?: number;
    } = {};
    if (nameChanged) payload.name = trimmedName;
    if (widthChanged) payload.roomWidth = w;
    if (depthChanged) payload.roomDepth = d;
    if (heightChanged) payload.roomHeight = h;
    setIsSavingStorage(true);
    try {
      await onUpdateStorage(payload);
      setEditMode(false);
      setStorageEditError(null);
    } catch {
      setStorageEditError("Не удалось сохранить изменения");
    } finally {
      setIsSavingStorage(false);
    }
  };
  const handleAddBoxClick = () => {
    if (readOnly) {
      promptAuth();
      return;
    }
    setIsDialogOpen(true);
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sm:sticky sm:top-0 sm:z-30">
        <div className="page-container py-4 space-y-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              {effectiveEditMode ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label
                      htmlFor="storage-name-edit"
                      className="text-xs text-muted-foreground"
                    >
                      Название хранилища
                    </Label>
                    <Input
                      id="storage-name-edit"
                      value={draftName}
                      onChange={(e) => {
                        setDraftName(e.target.value);
                        setStorageEditError(null);
                      }}
                      placeholder="Например: Гараж, Кладовка"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Размеры помещения (м)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: "storage-room-width",
                          label: "Ширина",
                          val: draftRoomWidth,
                          set: setDraftRoomWidth,
                          max: 30,
                        },
                        {
                          id: "storage-room-depth",
                          label: "Глубина",
                          val: draftRoomDepth,
                          set: setDraftRoomDepth,
                          max: 30,
                        },
                        {
                          id: "storage-room-height",
                          label: "Высота",
                          val: draftRoomHeight,
                          set: setDraftRoomHeight,
                          max: 5,
                        },
                      ].map(({ id, label, val, set, max }) => (
                        <div key={id} className="space-y-1">
                          <Label
                            htmlFor={id}
                            className="text-[10px] text-muted-foreground"
                          >
                            {label}
                          </Label>
                          <UnitInput
                            id={id}
                            type="number"
                            unit="м"
                            min="0.1"
                            max={max}
                            step="0.1"
                            value={val}
                            onChange={(e) => {
                              set(e.target.value);
                              setStorageEditError(null);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {storageEditError && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{storageEditError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h1 className="text-xl max-[360px]:text-lg truncate">
                    {storageName}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {boxes.length}{" "}
                    {boxes.length === 1
                      ? "коробка"
                      : boxes.length < 5
                        ? "коробки"
                        : "коробок"}
                    {" · "}
                    <span className="text-muted-foreground/70">
                      {roomSize.width}×{roomSize.depth}×{roomSize.height} м
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>

          {readOnly && (
            <div className="flex flex-col max-[400px]:items-stretch sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Режим просмотра. Войдите, чтобы редактировать хранилище.
              </p>
              {onRequireAuth && (
                <Button
                  size="sm"
                  variant="outline"
                  className="self-end sm:self-auto shrink-0"
                  onClick={promptAuth}
                >
                  Войти
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            <div
              ref={searchContainerRef}
              className="relative flex-1 min-w-0"
              onBlur={handleSearchContainerBlur}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Поиск предметов во всех коробках…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchOpen(true)}
                  className="pl-10 pr-9 max-[360px]:placeholder:text-xs"
                />
                {searchQuery && (
                  <button
                    tabIndex={0}
                    onClick={clearSearch}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <AnimatePresence>
                {searchOpen && searchQuery.trim() && (
                  <motion.div
                    className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto"
                    initial={{ opacity: 0, scale: 0.97, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ transformOrigin: "top" }}
                  >
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground text-base">
                        Ничего не найдено по запросу «{searchQuery}»
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b">
                          <p className="text-sm text-muted-foreground">
                            Найдено: {searchResults.length}{" "}
                            {searchResults.length === 1
                              ? "предмет"
                              : searchResults.length < 5
                                ? "предмета"
                                : "предметов"}
                          </p>
                        </div>
                        <ul>
                          {searchResults.map(({ item, box }, idx) => (
                            <motion.li
                              key={`${box.id}-${item?.id ?? "box"}-${idx}`}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03, duration: 0.15 }}
                            >
                              <button
                                tabIndex={0}
                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/60 transition-colors focus:bg-muted/60 focus:outline-none"
                                onMouseEnter={() => setHighlightedBoxId(box.id)}
                                onMouseLeave={() => setHighlightedBoxId(null)}
                                onFocus={() => setHighlightedBoxId(box.id)}
                                onBlur={() => setHighlightedBoxId(null)}
                                onClick={() => onBoxClick(box.id)}
                              >
                                <div
                                  className="w-9 h-9 rounded shrink-0 flex items-center justify-center text-sm"
                                  style={{ backgroundColor: box.color }}
                                >
                                  📦
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-base font-medium truncate">
                                    {item ? item.name : box.name}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {item ? (
                                      <>
                                        В коробке:{" "}
                                        <span className="font-medium text-foreground">
                                          {box.name}
                                        </span>
                                        {item.category && (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                            {item.category}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <>Коробка · {box.itemCount} предм.</>
                                    )}
                                  </p>
                                </div>
                              </button>
                            </motion.li>
                          ))}
                        </ul>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 shrink-0 max-[400px]:w-full max-[400px]:[&_button]:flex-1">
              <Dialog
                open={readOnly ? false : isDialogOpen}
                onOpenChange={handleDialogOpenChange}
              >
                <DialogTrigger asChild>
                  <Button
                    className="gap-2 shrink-0"
                    onClick={handleAddBoxClick}
                    aria-label="Добавить коробку"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden min-[401px]:inline">
                      Добавить коробку
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent
                  portalContainer={fullscreenDialogPortal}
                  className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
                >
                  <DialogHeader>
                    <DialogTitle>Новая коробка</DialogTitle>
                    <DialogDescription>
                      Укажите название и размеры коробки. Размеры вводятся в
                      сантиметрах.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-1">
                      <Label htmlFor="box-name">Название коробки</Label>
                      <Input
                        id="box-name"
                        placeholder="Например: Зимняя одежда, Книги"
                        value={newBoxName}
                        onChange={(e) => {
                          setNewBoxName(e.target.value);
                          setValidationError(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleAddBox()}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1 text-foreground">
                        Размеры коробки (в сантиметрах)
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Мин. {MIN_BOX_DIMENSION_CM} см · макс. {roomWcm}×
                        {roomDcm}×{roomHcm} см
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            id: "box-w",
                            label: "Длина",
                            val: boxSizeW,
                            set: setBoxSizeW,
                            max: roomWcm,
                          },
                          {
                            id: "box-d",
                            label: "Ширина",
                            val: boxSizeD,
                            set: setBoxSizeD,
                            max: roomDcm,
                          },
                          {
                            id: "box-h",
                            label: "Высота",
                            val: boxSizeH,
                            set: setBoxSizeH,
                            max: roomHcm,
                          },
                        ].map(({ id, label, val, set, max }) => (
                          <div key={id} className="space-y-1">
                            <Label
                              htmlFor={id}
                              className="text-xs text-muted-foreground"
                            >
                              {label}
                            </Label>
                            <UnitInput
                              id={id}
                              type="number"
                              unit="см"
                              placeholder={String(Math.round(max * 0.2))}
                              min={MIN_BOX_DIMENSION_CM}
                              max={max}
                              step="1"
                              value={val}
                              onChange={(e) => {
                                set(e.target.value);
                                setValidationError(null);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Все поля выше — в сантиметрах (см).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Предметы (необязательно)
                      </p>
                      <BulkItemsForm
                        items={draftItems}
                        onChange={setDraftItems}
                        categories={availableCategories}
                      />
                    </div>
                    {validationError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">
                          {validationError}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Перетащите коробку из «не размещённых» на холст
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetDialog}>
                      Отмена
                    </Button>
                    <Button onClick={handleAddBox} disabled={isCreatingBox}>
                      {isCreatingBox ? "Создание…" : "Создать"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant={effectiveLayoutEditMode ? "default" : "outline"}
                className="gap-2 shrink-0"
                onClick={() => {
                  if (readOnly) {
                    promptAuth();
                    return;
                  }
                  setLayoutEditMode(!layoutEditMode);
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden min-[401px]:inline">Планировка</span>
              </Button>

              <Button
                variant={effectiveEditMode ? "default" : "outline"}
                className="gap-2 shrink-0"
                onClick={() => void handleEditModeToggle()}
                disabled={isSavingStorage}
                aria-label={effectiveEditMode ? "Готово" : "Редактировать"}
              >
                <Edit className="w-4 h-4" />
                <span className="hidden min-[401px]:inline">
                  {isSavingStorage
                    ? "Сохранение…"
                    : effectiveEditMode
                      ? "Готово"
                      : "Редактировать"}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="page-container py-6 mt-3">
        <Tabs defaultValue="3d" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="3d" className="gap-2">
              <Layers className="w-4 h-4" />
              <span className="max-[360px]:hidden">2D Визуализация</span>
              <span className="hidden max-[360px]:inline">2D</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              <span className="max-[360px]:hidden">Список коробок</span>
              <span className="hidden max-[360px]:inline">Список</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="3d">
            {boxes.length === 0 &&
            partitions.length === 0 &&
            layoutLabels.length === 0 ? (
              <Card className="p-6">
                <div className="text-center py-16">
                  <BoxIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl mb-2 text-muted-foreground">
                    Нет коробок
                  </h3>
                  <p className="text-muted-foreground">
                    Добавьте первую коробку в хранилище
                  </p>
                </div>
              </Card>
            ) : (
              <>
                {effectiveLayoutEditMode &&
                  onCreatePartition &&
                  onDeletePartition &&
                  onCreateLayoutLabel &&
                  onDeleteLayoutLabel && (
                    <div
                      className={cn(
                        "mb-4 p-3 border rounded-lg bg-muted/30",
                        fullscreenControl?.isFullscreen && "hidden",
                      )}
                    >
                      <LayoutEditControls
                        partitions={partitions}
                        layoutLabels={layoutLabels}
                        roomSize={effectiveRoomSize}
                        onCreatePartition={onCreatePartition}
                        onDeletePartition={onDeletePartition}
                        onUpdatePartition={onUpdatePartition}
                        onCreateLabel={onCreateLayoutLabel}
                        onDeleteLabel={onDeleteLayoutLabel}
                        onUpdateLabel={onUpdateLayoutLabel}
                        layoutDragApi={layoutDragApi}
                        layoutEditMode={effectiveLayoutEditMode}
                        usePointerDrag={usePointerDrag}
                        pendingTemplateDrop={
                          fullscreenControl?.isFullscreen
                            ? null
                            : pendingTemplateDrop
                        }
                        onPendingTemplateDropHandled={
                          handlePendingTemplateDropHandled
                        }
                      />
                    </div>
                  )}
                <Storage3DView
                  boxes={boxes}
                  onBoxClick={onBoxClick}
                  editMode={effectiveEditMode}
                  layoutEditMode={effectiveLayoutEditMode}
                  highlightedBoxId={highlightedBoxId ?? highlightBoxId ?? null}
                  searchActive={hasActiveSearch}
                  matchingBoxIds={matchingBoxIds}
                  gridSize={gridSize}
                  roomSize={effectiveRoomSize}
                  onMoveBox={onMoveBox}
                  partitions={partitions}
                  layoutLabels={layoutLabels}
                  onMovePartition={onMovePartition}
                  onMoveLayoutLabel={onMoveLayoutLabel}
                  onCreatePartition={onCreatePartition}
                  onDeletePartition={onDeletePartition}
                  onUpdatePartition={onUpdatePartition}
                  onCreateLayoutLabel={onCreateLayoutLabel}
                  onDeleteLayoutLabel={onDeleteLayoutLabel}
                  onUpdateLayoutLabel={onUpdateLayoutLabel}
                  onToggleEditMode={() => void handleEditModeToggle()}
                  onToggleLayoutEditMode={() => {
                    if (readOnly) {
                      promptAuth();
                      return;
                    }
                    setLayoutEditMode(!layoutEditMode);
                  }}
                  onAddBox={handleAddBoxClick}
                  isSavingStorage={isSavingStorage}
                  onDialogPortalHostChange={setFullscreenDialogPortal}
                  onFullscreenControlChange={handleFullscreenControlChange}
                  layoutDragApiRef={layoutDragApiRef}
                  onLayoutDragMetaChange={handleLayoutDragMetaChange}
                  onTemplatePlaced={handleTemplatePlaced}
                  pendingTemplateDrop={pendingTemplateDrop}
                  onPendingTemplateDropHandled={
                    handlePendingTemplateDropHandled
                  }
                  usePointerDrag={usePointerDrag}
                  layoutDragApi={layoutDragApi}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="list">
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              variants={boxListVariants}
              initial="hidden"
              animate="visible"
            >
              {boxes.map((box) => {
                const isHighlighted = highlightedBoxId === box.id;
                const isMatch = hasActiveSearch && matchingBoxIds.has(box.id);
                return (
                  <motion.div
                    key={box.id}
                    variants={boxCardVariants}
                    whileHover={{
                      y: -2,
                      boxShadow: "0 6px 20px rgba(0,0,0,0.09)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  >
                    <Card
                      className={[
                        "transition-all cursor-pointer h-full",
                        isHighlighted
                          ? "ring-4 ring-amber-400 ring-offset-2 shadow-lg"
                          : isMatch
                            ? "ring-2 ring-primary border-primary shadow-md"
                            : "",
                      ].join(" ")}
                      onClick={() => onBoxClick(box.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: box.color }}
                          >
                            <BoxIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="mb-0.5 truncate">{box.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {box.itemCount}{" "}
                              {box.itemCount === 1
                                ? "предмет"
                                : box.itemCount < 5
                                  ? "предмета"
                                  : "предметов"}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5">
                              {box.sizeW}×{box.sizeD}×{box.sizeH} см
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-2">
                          Открыть
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>

            {boxes.length === 0 && (
              <Card className="p-6">
                <div className="text-center py-16">
                  <BoxIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl mb-2 text-muted-foreground">
                    Нет коробок
                  </h3>
                  <p className="text-muted-foreground">
                    Добавьте первую коробку в хранилище
                  </p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2 sm:hidden">
        <Button
          variant={fullscreenControl?.isFullscreen ? "default" : "outline"}
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={() => fullscreenControl?.toggle()}
          disabled={!fullscreenControl || fullscreenControl.isFullscreen}
          aria-label="На весь экран"
        >
          <Maximize2 className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={handleAddBoxClick}
          aria-label="Добавить коробку"
        >
          <Plus className="w-5 h-5" />
        </Button>
        <Button
          variant={effectiveLayoutEditMode ? "default" : "outline"}
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={() => {
            if (readOnly) {
              promptAuth();
              return;
            }
            setLayoutEditMode(!layoutEditMode);
          }}
          aria-label="Планировка"
        >
          <LayoutGrid className="w-5 h-5" />
        </Button>
        <Button
          variant={effectiveEditMode ? "default" : "outline"}
          size="icon"
          className="w-12 h-12 rounded-full shadow-lg"
          onClick={() => void handleEditModeToggle()}
          disabled={isSavingStorage}
          aria-label={effectiveEditMode ? "Готово" : "Редактировать"}
        >
          {effectiveEditMode ? (
            <Check className="w-5 h-5" />
          ) : (
            <Edit className="w-5 h-5" />
          )}
        </Button>
      </div>

      <AuthRequiredDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onConfirmLogin={() => {
          setAuthDialogOpen(false);
          onRequireAuth?.();
        }}
      />
    </div>
  );
}
