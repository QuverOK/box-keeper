import { Plus, Box, QrCode, User, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/shared/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { UnitInput } from "@/shared/ui/unit-input";
import { Label } from "@/shared/ui/label";
import { useState } from "react";
interface Storage {
    id: string;
    name: string;
    boxCount: number;
}
interface DashboardProps {
    userEmail: string;
    storages: Storage[];
    onStorageClick: (storageId: string) => void;
    onCreateStorage: (name: string, roomWidth: number, roomDepth: number, roomHeight: number) => void;
    onDeleteStorage: (storageId: string) => void;
    onProfileClick: () => void;
    onQRScanClick: () => void;
    onLogout: () => void;
}
export function Dashboard({ userEmail, storages, onStorageClick, onCreateStorage, onDeleteStorage, onProfileClick, onQRScanClick, onLogout, }: DashboardProps) {
    const [newStorageName, setNewStorageName] = useState("");
    const [roomWidth, setRoomWidth] = useState("");
    const [roomDepth, setRoomDepth] = useState("");
    const [roomHeight, setRoomHeight] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!newStorageName.trim())
            errs.name = "Введите название";
        const w = parseFloat(roomWidth);
        const d = parseFloat(roomDepth);
        const h = parseFloat(roomHeight);
        if (!roomWidth || isNaN(w) || w <= 0)
            errs.width = "Введите корректную ширину (> 0)";
        if (!roomDepth || isNaN(d) || d <= 0)
            errs.depth = "Введите корректную глубину (> 0)";
        if (!roomHeight || isNaN(h) || h <= 0)
            errs.height = "Введите корректную высоту (> 0)";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };
    const handleCreateStorage = () => {
        if (!validate())
            return;
        onCreateStorage(newStorageName.trim(), parseFloat(roomWidth), parseFloat(roomDepth), parseFloat(roomHeight));
        setNewStorageName("");
        setRoomWidth("");
        setRoomDepth("");
        setRoomHeight("");
        setErrors({});
        setIsDialogOpen(false);
    };
    const handleDialogOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setNewStorageName("");
            setRoomWidth("");
            setRoomDepth("");
            setRoomHeight("");
            setErrors({});
        }
    };
    return (<div className="min-h-screen bg-background">

      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-8 h-8 text-blue-600"/>
            <h1 className="text-2xl">BoxKeeper</h1>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onProfileClick}>
              <User className="w-5 h-5"/>
            </Button>
            <Button variant="ghost" size="icon" onClick={onQRScanClick}>
              <QrCode className="w-5 h-5"/>
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-5 h-5"/>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl mb-2">Мои хранилища</h2>
            <p className="text-muted-foreground">{userEmail}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4"/>
                Создать хранилище
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Новое хранилище</DialogTitle>
                <DialogDescription>
                  Укажите название и физические размеры помещения. Размеры
                  вводятся в метрах.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">

                <div className="space-y-1">
                  <Label htmlFor="storage-name">Название хранилища</Label>
                  <Input id="storage-name" placeholder="Например: Гараж, Кладовка, Чердак" value={newStorageName} onChange={(e) => setNewStorageName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateStorage()}/>
                  {errors.name && (<p className="text-xs text-red-500">{errors.name}</p>)}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2 text-foreground">
                    Размеры помещения (в метрах)
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="room-width" className="text-xs text-muted-foreground">
                        Ширина (X)
                      </Label>
                      <UnitInput id="room-width" type="number" unit="м" placeholder="6" min="0.1" step="0.1" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)}/>
                      {errors.width && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.width}
                        </p>)}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="room-depth" className="text-xs text-muted-foreground">
                        Глубина (Y)
                      </Label>
                      <UnitInput id="room-depth" type="number" unit="м" placeholder="5" min="0.1" step="0.1" value={roomDepth} onChange={(e) => setRoomDepth(e.target.value)}/>
                      {errors.depth && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.depth}
                        </p>)}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="room-height" className="text-xs text-muted-foreground">
                        Высота (Z)
                      </Label>
                      <UnitInput id="room-height" type="number" unit="м" placeholder="2.5" min="0.1" step="0.1" value={roomHeight} onChange={(e) => setRoomHeight(e.target.value)}/>
                      {errors.height && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.height}
                        </p>)}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    Все поля выше — в метрах (м). Сетка 5×4×3 ячейки
                    масштабируется под реальные размеры помещения.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateStorage}>Создать</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storages.map((storage) => (<Card key={storage.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onStorageClick(storage.id)}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      <Box className="w-5 h-5 text-blue-600 shrink-0"/>
                      <span className="truncate">{storage.name}</span>
                    </CardTitle>
                    <CardDescription>
                      {storage.boxCount}{" "}
                      {storage.boxCount === 1
                ? "коробка"
                : storage.boxCount < 5
                    ? "коробки"
                    : "коробок"}
                    </CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-600" aria-label={`Удалить хранилище ${storage.name}`} onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить хранилище?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Хранилище «{storage.name}» и все коробки с предметами
                          будут удалены безвозвратно. Это действие нельзя
                          отменить.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => {
                e.stopPropagation();
                onDeleteStorage(storage.id);
            }}>
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Открыть
                </Button>
              </CardContent>
            </Card>))}
        </div>

        {storages.length === 0 && (<div className="text-center py-16">
            <Box className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
            <h3 className="text-xl mb-2 text-muted-foreground">Нет хранилищ</h3>
            <p className="text-muted-foreground mb-4">
              Создайте ваше первое хранилище
            </p>
          </div>)}
      </main>
    </div>);
}
