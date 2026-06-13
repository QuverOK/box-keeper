import { Plus, Box, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, } from "./ui/card";
const gridVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
};
const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: "easeOut" as const } },
    exit: { opacity: 0, scale: 0.94, transition: { duration: 0.15 } },
};
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { UnitInput } from "@/shared/ui/unit-input";
import { Label } from "./ui/label";
import { useState } from "react";
import { MAX_ROOM_WIDTH, MAX_ROOM_DEPTH, MAX_ROOM_HEIGHT, } from "@/shared/model";
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
}
export function Dashboard({ userEmail, storages, onStorageClick, onCreateStorage, onDeleteStorage, }: DashboardProps) {
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
            errs.width = "Введите корректную длину (> 0)";
        else if (w > MAX_ROOM_WIDTH)
            errs.width = `Максимум ${MAX_ROOM_WIDTH} м`;
        if (!roomDepth || isNaN(d) || d <= 0)
            errs.depth = "Введите корректную ширину (> 0)";
        else if (d > MAX_ROOM_DEPTH)
            errs.depth = `Максимум ${MAX_ROOM_DEPTH} м`;
        if (!roomHeight || isNaN(h) || h <= 0)
            errs.height = "Введите корректную высоту (> 0)";
        else if (h > MAX_ROOM_HEIGHT)
            errs.height = `Максимум ${MAX_ROOM_HEIGHT} м`;
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

      <main className="page-container py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl max-[360px]:text-xl mb-2">Мои хранилища</h2>
            <p className="text-muted-foreground break-all">{userEmail}</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
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
                      <Label htmlFor="room-width" className="text-xs text-gray-500">
                        Длина (X)
                      </Label>
                      <UnitInput id="room-width" type="number" unit="м" placeholder="6" min="0.1" max={MAX_ROOM_WIDTH} step="0.1" value={roomWidth} onChange={(e) => setRoomWidth(e.target.value)}/>
                      {errors.width && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.width}
                        </p>)}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="room-depth" className="text-xs text-gray-500">
                        Ширина (Y)
                      </Label>
                      <UnitInput id="room-depth" type="number" unit="м" placeholder="5" min="0.1" max={MAX_ROOM_DEPTH} step="0.1" value={roomDepth} onChange={(e) => setRoomDepth(e.target.value)}/>
                      {errors.depth && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.depth}
                        </p>)}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="room-height" className="text-xs text-gray-500">
                        Высота (Z)
                      </Label>
                      <UnitInput id="room-height" type="number" unit="м" placeholder="2.5" min="0.1" max={MAX_ROOM_HEIGHT} step="0.1" value={roomHeight} onChange={(e) => setRoomHeight(e.target.value)}/>
                      {errors.height && (<p className="text-[10px] text-red-500 leading-tight">
                          {errors.height}
                        </p>)}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
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

        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" variants={gridVariants} initial="hidden" animate="visible">
          <AnimatePresence mode="popLayout">
            {storages.map((storage) => (<motion.div key={storage.id} variants={cardVariants} exit="exit" layout whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <Card className="cursor-pointer h-full" onClick={() => onStorageClick(storage.id)}>
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
                </Card>
              </motion.div>))}
          </AnimatePresence>
        </motion.div>

        {storages.length === 0 && (<motion.div className="text-center py-16" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Box className="w-16 h-16 text-muted-foreground mx-auto mb-4"/>
            <h3 className="text-xl mb-2 text-muted-foreground">Нет хранилищ</h3>
            <p className="text-muted-foreground mb-4">
              Создайте ваше первое хранилище
            </p>
          </motion.div>)}
      </main>
    </div>);
}
