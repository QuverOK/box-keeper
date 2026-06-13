import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  QrCode,
  Search,
  Check,
} from "lucide-react";
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
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
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

interface Item {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface BoxViewProps {
  boxName: string;
  boxColor: string;
  boxSizeW: number;
  boxSizeD: number;
  boxSizeH: number;
  qrCode: string;
  items: Item[];
  onBack: () => void;
  onItemClick: (itemId: string) => void;
  onAddItem: (name: string, category: string, description: string) => void;
  onUpdateBox: (
    name: string,
    color: string,
    sizeW: number,
    sizeD: number,
    sizeH: number,
  ) => void;
  onDeleteBox: () => void;
  onShowQR: () => void;
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
  boxName,
  boxColor,
  boxSizeW,
  boxSizeD,
  boxSizeH,
  qrCode: _qrCode,
  items,
  onBack,
  onItemClick,
  onAddItem,
  onUpdateBox,
  onDeleteBox,
  onShowQR,
}: BoxViewProps) {
  // Add item dialog state
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Edit box dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSizeW, setEditSizeW] = useState("");
  const [editSizeD, setEditSizeD] = useState("");
  const [editSizeH, setEditSizeH] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const handleAddItem = () => {
    if (newItemName.trim()) {
      onAddItem(newItemName, newItemCategory, newItemDescription);
      setNewItemName("");
      setNewItemCategory("");
      setNewItemDescription("");
      setIsAddDialogOpen(false);
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

  const handleSaveBox = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("Введите название коробки");
      return;
    }

    const w = parseFloat(editSizeW);
    const d = parseFloat(editSizeD);
    const h = parseFloat(editSizeH);

    if (!editSizeW || isNaN(w) || w <= 0) {
      setEditError("Укажите корректную ширину (> 0)");
      return;
    }
    if (!editSizeD || isNaN(d) || d <= 0) {
      setEditError("Укажите корректную глубину (> 0)");
      return;
    }
    if (!editSizeH || isNaN(h) || h <= 0) {
      setEditError("Укажите корректную высоту (> 0)");
      return;
    }

    onUpdateBox(trimmedName, editColor, w, d, h);
    setIsEditDialogOpen(false);
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded flex items-center justify-center"
                  style={{ backgroundColor: boxColor }}
                >
                  <span className="text-xl">📦</span>
                </div>
                <div>
                  <h1 className="text-2xl">{boxName}</h1>
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
            {/* <Button variant="outline" size="icon" onClick={onShowQR}>
              <QrCode className="w-5 h-5" />
            </Button> */}
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Add item dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                    <Input
                      id="item-category"
                      placeholder="Например: Обувь"
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-description">Описание</Label>
                    <Input
                      id="item-description"
                      placeholder="Дополнительная информация"
                      value={newItemDescription}
                      onChange={(e) => setNewItemDescription(e.target.value)}
                    />
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
                    disabled={!newItemName.trim()}
                  >
                    Добавить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit box dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={openEditDialog}
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
                  {/* Name */}
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

                  {/* Color */}
                  <div className="space-y-3">
                    <Label>Цвет</Label>

                    {/* Quick presets */}
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

                    {/* Full color picker */}
                    <div className="flex flex-col items-center gap-3">
                      <HexColorPicker
                        color={editColor}
                        onChange={setEditColor}
                        style={{ width: "100%", height: "160px" }}
                      />
                      {/* Hex input */}
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
                  </div>

                  {/* Dimensions */}
                  <div className="space-y-2">
                    <Label>Размеры (в сантиметрах)</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor="edit-size-w"
                          className="text-xs text-muted-foreground"
                        >
                          Ширина
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
                          className="text-xs text-muted-foreground"
                        >
                          Глубина
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
                          className="text-xs text-muted-foreground"
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

                  {/* Preview */}
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

                  {/* Validation error */}
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

            {/* Delete box */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Поиск предметов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Items Table */}
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
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted"
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Ничего не найдено"
                    : "Нет предметов в коробке"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
