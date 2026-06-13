import {
  ArrowLeft,
  Plus,
  Edit,
  List,
  Box as BoxIcon,
  Layers,
  AlertCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
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
import React, { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { MIN_BOX_DIMENSION_CM } from "@/features/box-validation";
import { Storage3DView } from "@/widgets/storage-editor";
interface BoxItem {
  id: string;
  name: string;
  category: string;
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
interface SearchResult {
  item: BoxItem;
  box: Box;
}
interface StorageViewProps {
  storageName: string;
  boxes: Box[];
  onBack: () => void;
  onBoxClick: (boxId: string) => void;
  onAddBox: (name: string, sizeW: number, sizeD: number, sizeH: number) => void;
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
}: StorageViewProps) {
  const [newBoxName, setNewBoxName] = useState("");
  const [boxSizeW, setBoxSizeW] = useState("");
  const [boxSizeD, setBoxSizeD] = useState("");
  const [boxSizeH, setBoxSizeH] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedBoxId, setHighlightedBoxId] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];
    for (const box of boxes) {
      for (const item of box.items) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        ) {
          results.push({ item, box });
        }
      }
    }
    return results;
  }, [searchQuery, boxes]);
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
  const roomWcm = Math.round(roomSize.width * 100);
  const roomDcm = Math.round(roomSize.depth * 100);
  const roomHcm = Math.round(roomSize.height * 100);
  const validateBox = (
    name: string,
    w: number,
    d: number,
    h: number,
  ): string | null => {
    if (!name.trim()) return "Введите название коробки";
    if (isNaN(w) || w < MIN_BOX_DIMENSION_CM) {
      return `Ширина не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    if (isNaN(d) || d < MIN_BOX_DIMENSION_CM) {
      return `Глубина не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    if (isNaN(h) || h < MIN_BOX_DIMENSION_CM) {
      return `Высота не может быть меньше ${MIN_BOX_DIMENSION_CM} см`;
    }
    if (w > roomWcm)
      return `Ширина (${w} см) превышает ширину помещения (${roomWcm} см)`;
    if (d > roomDcm)
      return `Глубина (${d} см) превышает глубину помещения (${roomDcm} см)`;
    if (h > roomHcm)
      return `Высота (${h} см) превышает высоту помещения (${roomHcm} см)`;
    return null;
  };
  const handleAddBox = () => {
    const w = parseFloat(boxSizeW);
    const d = parseFloat(boxSizeD);
    const h = parseFloat(boxSizeH);
    const error = validateBox(newBoxName, w, d, h);
    if (error) {
      setValidationError(error);
      return;
    }
    onAddBox(newBoxName.trim(), w, d, h);
    resetDialog();
  };
  const resetDialog = () => {
    setNewBoxName("");
    setBoxSizeW("");
    setBoxSizeD("");
    setBoxSizeH("");
    setValidationError(null);
    setIsDialogOpen(false);
  };
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetDialog();
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl truncate">{storageName}</h1>
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
            </div>
          </div>

          <div className="flex gap-2 items-center">
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
                  className="pl-10 pr-9"
                />
                {searchQuery && (
                  <button
                    tabIndex={0}
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {searchOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                      Ничего не найдено по запросу «{searchQuery}»
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b">
                        <p className="text-xs text-muted-foreground">
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
                          <li key={`${box.id}-${item.id}-${idx}`}>
                            <button
                              tabIndex={0}
                              className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/60 transition-colors focus:bg-muted/60 focus:outline-none"
                              onMouseEnter={() => setHighlightedBoxId(box.id)}
                              onMouseLeave={() => setHighlightedBoxId(null)}
                              onFocus={() => setHighlightedBoxId(box.id)}
                              onBlur={() => setHighlightedBoxId(null)}
                              onClick={() => onBoxClick(box.id)}
                            >
                              <div
                                className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-xs"
                                style={{ backgroundColor: box.color }}
                              >
                                📦
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  В коробке:{" "}
                                  <span className="font-medium text-foreground">
                                    {box.name}
                                  </span>
                                  {item.category && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                                      {item.category}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button className="gap-2 flex-shrink-0">
                  <Plus className="w-4 h-4" />
                  Добавить коробку
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
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
                      Мин. {MIN_BOX_DIMENSION_CM} см · макс. {roomWcm}×{roomDcm}
                      ×{roomHcm} см
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          id: "box-w",
                          label: "Ширина",
                          val: boxSizeW,
                          set: setBoxSizeW,
                          max: roomWcm,
                        },
                        {
                          id: "box-d",
                          label: "Глубина",
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
                  {validationError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700">{validationError}</p>
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
                  <Button onClick={handleAddBox}>Создать</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant={editMode ? "default" : "outline"}
              className="gap-2 flex-shrink-0"
              onClick={() => setEditMode(!editMode)}
            >
              <Edit className="w-4 h-4" />
              {editMode ? "Готово" : "Редактировать"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 mt-3">
        <Tabs defaultValue="3d" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="3d" className="gap-2">
              <Layers className="w-4 h-4" />
              2D Визуализация
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Список коробок
            </TabsTrigger>
          </TabsList>

          <TabsContent value="3d">
            {boxes.length === 0 ? (
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
              <Storage3DView
                boxes={boxes}
                onBoxClick={onBoxClick}
                editMode={editMode}
                highlightedBoxId={highlightedBoxId}
                gridSize={gridSize}
                roomSize={roomSize}
                onMoveBox={onMoveBox}
              />
            )}
          </TabsContent>

          <TabsContent value="list">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boxes.map((box) => {
                const isHighlighted = highlightedBoxId === box.id;
                return (
                  <Card
                    key={box.id}
                    className={[
                      "transition-all cursor-pointer",
                      isHighlighted
                        ? "ring-4 ring-amber-400 ring-offset-2 shadow-lg"
                        : "hover:shadow-lg",
                    ].join(" ")}
                    onClick={() => onBoxClick(box.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
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
                );
              })}
            </div>

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
    </div>
  );
}
