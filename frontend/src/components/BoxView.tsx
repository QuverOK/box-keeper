import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  QrCode,
  Search,
  Check,
  Download,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
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
import { Label } from "@/shared/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
const MotionTableRow = motion(TableRow);
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { HexColorPicker } from "react-colorful";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import {
  validateBoxFitsInRoom,
  isDuplicateBoxName,
} from "@/features/box-validation";
import { isColorTooDark } from "@/features/box-drag";
import { CategoryCombobox } from "@/features/item-category";
import { AddItemsDialog } from "@/features/bulk-items";
import type { ItemInput } from "@/features/bulk-items";
import {
  clampItemDescription,
  MAX_ITEM_DESCRIPTION_LENGTH,
} from "@/entities/item";
import {
  createQrLabelDataUrl,
  downloadQrLabel,
} from "@/shared/lib/qr-label-image";
interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
}
export interface BoxViewProps {
  boxId: string;
  boxName: string;
  boxColor: string;
  boxSizeW: number;
  boxSizeD: number;
  boxSizeH: number;
  qrCode: string;
  items: Item[];
  availableCategories?: string[];
  roomSize?: {
    width: number;
    depth: number;
    height: number;
  };
  siblingBoxes?: Array<{
    id: string;
    name: string;
  }>;
  onBack: () => void;
  onItemClick: (itemId: string) => void;
  onAddItem: (
    name: string,
    category: string,
    description: string,
  ) => void | Promise<void>;
  onAddItems: (items: ItemInput[]) => void | Promise<void>;
  onUpdateBox: (
    name: string,
    color: string,
    sizeW: number,
    sizeD: number,
    sizeH: number,
  ) => void | Promise<void>;
  onDeleteBox: () => void;
  onShowQR: () => void;
  readOnly?: boolean;
  onRequireAuth?: () => void;
}
const COLOR_PALETTE = [
  { value: "#e0f2fe", label: "Голубой" },
  { value: "#fef3c7", label: "Жёлтый" },
  { value: "#ddd6fe", label: "Фиолетовый" },
  { value: "#fce7f3", label: "Розовый" },
  { value: "#d1fae5", label: "Зелёный" },
  { value: "#fee2e2", label: "Красный" },
  { value: "#ffedd5", label: "Оранжевый" },
  { value: "#f1f5f9", label: "Серый" },
];
export function BoxView({
  boxId,
  boxName,
  boxColor,
  boxSizeW,
  boxSizeD,
  boxSizeH,
  qrCode,
  items,
  availableCategories = [],
  roomSize,
  siblingBoxes = [],
  onBack,
  onItemClick,
  onAddItem,
  onAddItems,
  onUpdateBox,
  onDeleteBox,
  readOnly = false,
  onRequireAuth,
}: BoxViewProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSizeW, setEditSizeW] = useState("");
  const [editSizeD, setEditSizeD] = useState("");
  const [editSizeH, setEditSizeH] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const promptAuth = () => setAuthDialogOpen(true);
  useEffect(() => {
    if (!qrCode) {
      setQrImageUrl(null);
      return;
    }
    createQrLabelDataUrl(qrCode, boxName)
      .then(setQrImageUrl)
      .catch(() => setQrImageUrl(null));
  }, [qrCode, boxName]);
  const handleDownloadQR = () => {
    if (!qrImageUrl) return;
    downloadQrLabel(qrImageUrl, boxName);
  };
  const guardEdit = () => {
    if (readOnly) {
      promptAuth();
      return true;
    }
    return false;
  };
  const handleAddItem = async () => {
    if (!newItemName.trim() || isAddingItem) return;
    setIsAddingItem(true);
    try {
      await onAddItem(newItemName, newItemCategory, newItemDescription);
      setNewItemName("");
      setNewItemCategory("");
      setNewItemDescription("");
      setIsAddDialogOpen(false);
    } finally {
      setIsAddingItem(false);
    }
  };
  const openEditDialog = () => {
    setEditName(boxName);
    setEditColor(boxColor);
    setEditSizeW(String(boxSizeW));
    setEditSizeD(String(boxSizeD));
    setEditSizeH(String(boxSizeH));
    setEditError(null);
    setIsEditDialogOpen(true);
  };
  const handleSaveBox = async () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Введите название коробки");
      return;
    }
    if (isDuplicateBoxName(trimmedName, siblingBoxes, boxId)) {
      setEditError("Коробка с таким названием уже существует");
      return;
    }
    const w = parseFloat(editSizeW);
    const d = parseFloat(editSizeD);
    const h = parseFloat(editSizeH);
    if (!editSizeW || isNaN(w) || w <= 0) {
      setEditError("Укажите корректную длину (> 0)");
      return;
    }
    if (!editSizeD || isNaN(d) || d <= 0) {
      setEditError("Укажите корректную ширину (> 0)");
      return;
    }
    if (!editSizeH || isNaN(h) || h <= 0) {
      setEditError("Укажите корректную высоту (> 0)");
      return;
    }
    if (roomSize) {
      const roomCheck = validateBoxFitsInRoom(
        { sizeW: w, sizeD: d, sizeH: h },
        roomSize,
      );
      if (!roomCheck.valid) {
        setEditError(
          roomCheck.errors[0] ?? "Коробка не помещается в помещение",
        );
        return;
      }
    }
    await onUpdateBox(trimmedName, editColor, w, d, h);
    setIsEditDialogOpen(false);
  };
  const searchNormalized = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchNormalized) ||
      item.category.toLowerCase().includes(searchNormalized) ||
      item.description.toLowerCase().includes(searchNormalized),
  );
  const colorTooDark = useMemo(() => isColorTooDark(editColor), [editColor]);
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="page-container py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: boxColor }}
                >
                  <span className="text-xl">📦</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl max-[360px]:text-lg truncate">
                    {boxName}
                  </h1>
                  <p className="text-muted-foreground">
                    {items.length}{" "}
                    {items.length === 1
                      ? "предмет"
                      : items.length < 5
                        ? "предмета"
                        : "предметов"}
                    {" · "}
                    {boxSizeW}×{boxSizeD}×{boxSizeH} см
                  </p>
                </div>
              </div>
            </div>
          </div>

          {readOnly && (
            <div className="flex flex-col max-[400px]:items-stretch sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Режим просмотра. Войдите, чтобы редактировать коробку.
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

          <div className="flex gap-2 flex-wrap">
            <Dialog
              open={readOnly ? false : isAddDialogOpen}
              onOpenChange={readOnly ? undefined : setIsAddDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={(e) => {
                    if (guardEdit()) e.preventDefault();
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Добавить предмет
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый предмет</DialogTitle>
                  <DialogDescription>
                    Добавьте предмет в коробку
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-name">Название</Label>
                    <Input
                      id="item-name"
                      placeholder="Например: Зимние ботинки"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-category">Категория</Label>
                    <CategoryCombobox
                      id="item-category"
                      value={newItemCategory}
                      onChange={setNewItemCategory}
                      categories={availableCategories}
                      placeholder="Например: Обувь"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-description">Описание</Label>
                    <Input
                      id="item-description"
                      placeholder="Дополнительная информация"
                      value={newItemDescription}
                      maxLength={MAX_ITEM_DESCRIPTION_LENGTH}
                      onChange={(e) =>
                        setNewItemDescription(
                          clampItemDescription(e.target.value),
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {newItemDescription.length}/{MAX_ITEM_DESCRIPTION_LENGTH}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button
                    onClick={handleAddItem}
                    disabled={!newItemName.trim() || isAddingItem}
                  >
                    {isAddingItem ? "Добавление…" : "Добавить"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AddItemsDialog
              categories={availableCategories}
              onSubmit={onAddItems}
              readOnly={readOnly}
              onRequireAuth={promptAuth}
            />

            <Dialog
              open={readOnly ? false : isEditDialogOpen}
              onOpenChange={readOnly ? undefined : setIsEditDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={(e) => {
                    if (guardEdit()) {
                      e.preventDefault();
                      return;
                    }
                    openEditDialog();
                  }}
                >
                  <Edit className="w-4 h-4" />
                  Редактировать коробку
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактировать коробку</DialogTitle>
                  <DialogDescription>
                    Измените параметры коробки
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-box-name">Название</Label>
                    <Input
                      id="edit-box-name"
                      placeholder="Название коробки"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        setEditError(null);
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Цвет</Label>

                    <div className="flex flex-wrap gap-2">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => setEditColor(c.value)}
                          className="w-8 h-8 rounded-md border-2 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
                          style={{
                            backgroundColor: c.value,
                            borderColor:
                              editColor === c.value ? "#1e293b" : "#e2e8f0",
                          }}
                        >
                          {editColor === c.value && (
                            <Check
                              className="w-3.5 h-3.5 text-slate-800"
                              strokeWidth={2.5}
                            />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <HexColorPicker
                        color={editColor}
                        onChange={setEditColor}
                        style={{ width: "100%", height: "160px" }}
                      />

                      <div className="flex items-center gap-2 w-full">
                        <div
                          className="w-8 h-8 rounded border flex-shrink-0"
                          style={{ backgroundColor: editColor }}
                        />
                        <Input
                          value={editColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                              setEditColor(val);
                            }
                          }}
                          className="font-mono text-sm"
                          maxLength={7}
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    {colorTooDark && (
                      <div className="flex gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          Выберите более яркий цвет — при поиске тусклые коробки
                          почти не видны на плане.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Размеры (в сантиметрах)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="edit-size-w"
                          className="text-xs text-gray-500"
                        >
                          Длина
                        </Label>
                        <Input
                          id="edit-size-w"
                          type="number"
                          min="1"
                          placeholder="см"
                          value={editSizeW}
                          onChange={(e) => {
                            setEditSizeW(e.target.value);
                            setEditError(null);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="edit-size-d"
                          className="text-xs text-gray-500"
                        >
                          Ширина
                        </Label>
                        <Input
                          id="edit-size-d"
                          type="number"
                          min="1"
                          placeholder="см"
                          value={editSizeD}
                          onChange={(e) => {
                            setEditSizeD(e.target.value);
                            setEditError(null);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor="edit-size-h"
                          className="text-xs text-gray-500"
                        >
                          Высота
                        </Label>
                        <Input
                          id="edit-size-h"
                          type="number"
                          min="1"
                          placeholder="см"
                          value={editSizeH}
                          onChange={(e) => {
                            setEditSizeH(e.target.value);
                            setEditError(null);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border">
                    <div
                      className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: editColor }}
                    >
                      <span className="text-lg">📦</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {editName || "Название коробки"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {editSizeW || "—"}×{editSizeD || "—"}×{editSizeH || "—"}{" "}
                        см
                      </p>
                    </div>
                  </div>

                  {editError && (
                    <p className="text-sm text-red-600">{editError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Отмена
                  </Button>
                  <Button onClick={handleSaveBox}>Сохранить</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    if (guardEdit()) e.preventDefault();
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить коробку
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить коробку?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие нельзя отменить. Коробка и все её содержимое
                    будут удалены навсегда.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDeleteBox}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Удалить
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="page-container py-8">
        {qrImageUrl && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="bg-white p-3 rounded-lg border shrink-0">
                  <img
                    src={qrImageUrl}
                    alt={`QR-код коробки ${boxName}`}
                    className="max-w-[180px] object-contain"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-medium mb-1 flex items-center justify-center sm:justify-start gap-2">
                    <QrCode className="w-4 h-4" />
                    QR-код: {boxName}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Наклейте на коробку для быстрого сканирования
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleDownloadQR}
                  >
                    <Download className="w-4 h-4" />
                    Скачать QR-код
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Поиск предметов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead className="w-[100px]">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => (
                    <MotionTableRow
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.03,
                        ease: "easeOut",
                      }}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => onItemClick(item.id)}
                    >
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                          {item.category || "Без категории"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemClick(item.id);
                          }}
                        >
                          Открыть
                        </Button>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500">
                  {searchQuery
                    ? "Ничего не найдено"
                    : "Нет предметов в коробке"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

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
