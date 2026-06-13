import { ArrowLeft, Edit, Trash2, ImagePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import React, { useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/shared/ui/alert-dialog";
import { AuthRequiredDialog } from "@/shared/ui/auth-required-dialog";
import { compressImage } from "@/shared/lib/compress-image";
import { CategoryCombobox } from "@/features/item-category";
import { clampItemDescription, MAX_ITEM_DESCRIPTION_LENGTH, } from "@/entities/item";
export interface ItemViewProps {
    item: {
        id: string;
        name: string;
        category: string;
        description: string;
        photo?: string;
    };
    onBack: () => void;
    onDelete: () => void;
    onUpdate: (name: string, category: string, description: string, photo?: string) => void | Promise<void>;
    availableCategories?: string[];
    readOnly?: boolean;
    onRequireAuth?: () => void;
}
export function ItemView({ item, onBack, onDelete, onUpdate, availableCategories = [], readOnly = false, onRequireAuth, }: ItemViewProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(item.name);
    const [editCategory, setEditCategory] = useState(item.category);
    const [editDescription, setEditDescription] = useState(item.description);
    const [editPhoto, setEditPhoto] = useState<string | undefined>(item.photo);
    const [nameError, setNameError] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [authDialogOpen, setAuthDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const promptAuth = () => setAuthDialogOpen(true);
    const startEditing = () => {
        if (readOnly) {
            promptAuth();
            return;
        }
        setEditName(item.name);
        setEditCategory(item.category);
        setEditDescription(item.description);
        setEditPhoto(item.photo);
        setNameError(false);
        setIsEditing(true);
    };
    const handleSave = async () => {
        if (!editName.trim()) {
            setNameError(true);
            return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            await onUpdate(editName.trim(), editCategory.trim(), editDescription.trim(), editPhoto);
            setIsEditing(false);
        }
        catch {
            setSaveError("Не удалось сохранить изменения");
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleCancel = () => {
        setEditName(item.name);
        setEditCategory(item.category);
        setEditDescription(item.description);
        setEditPhoto(item.photo);
        setNameError(false);
        setIsEditing(false);
    };
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setPhotoError(null);
        try {
            const dataUrl = await compressImage(file);
            setEditPhoto(dataUrl);
        }
        catch (err) {
            setPhotoError(err instanceof Error ? err.message : "Ошибка загрузки фото");
        }
        e.target.value = "";
    };
    const displayPhoto = isEditing ? editPhoto : item.photo;
    return (<div className="min-h-screen bg-background">

      <header className="bg-card border-b sticky top-0 z-10">
        <div className="page-container py-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="w-5 h-5"/>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl max-[360px]:text-lg truncate">
                {item.name}
              </h1>
              {item.category && (<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 mt-0.5">
                  {item.category}
                </span>)}
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
              {readOnly && onRequireAuth && (<Button variant="outline" size="sm" onClick={promptAuth}>
                  Войти для редактирования
                </Button>)}
              {!readOnly && !isEditing ? (<>
                  <Button variant="outline" className="gap-2" onClick={startEditing}>
                    <Edit className="w-4 h-4"/>
                    Редактировать
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4"/>
                        Удалить
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить предмет?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Предмет будет удалён
                          навсегда.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>) : !readOnly ? (<>
                  <Button variant="outline" onClick={handleCancel}>
                    Отмена
                  </Button>
                  <Button onClick={handleSave} disabled={!editName.trim() || isSaving}>
                    {isSaving ? "Сохранение…" : "Сохранить"}
                  </Button>
                </>) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="page-container py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <Card>
            <CardHeader>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={isEditing ? "editing" : "viewing"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <CardTitle>
                    {isEditing ? "Редактирование предмета" : "Информация о предмете"}
                  </CardTitle>
                </motion.div>
              </AnimatePresence>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="space-y-2">
                <Label>Фото</Label>
                {displayPhoto ? (<div className="relative group">
                    <img src={displayPhoto} alt={item.name} className="w-full max-h-72 object-contain rounded-lg border bg-gray-50"/>
                    {isEditing && (<div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                        <Button size="sm" variant="secondary" className="gap-1" onClick={() => fileInputRef.current?.click()}>
                          <ImagePlus className="w-4 h-4"/>
                          Заменить
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => setEditPhoto(undefined)}>
                          <X className="w-4 h-4"/>
                          Удалить
                        </Button>
                      </div>)}
                  </div>) : (<motion.button type="button" onClick={isEditing ? () => fileInputRef.current?.click() : undefined} disabled={!isEditing} className="w-full border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors disabled:cursor-default enabled:hover:border-muted-foreground enabled:hover:text-foreground enabled:cursor-pointer" whileHover={isEditing ? { scale: 1.015 } : undefined} whileTap={isEditing ? { scale: 0.985 } : undefined} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                    <ImagePlus className="w-10 h-10"/>
                    {isEditing ? (<span className="text-sm">
                        Нажмите, чтобы загрузить фото
                      </span>) : (<span className="text-sm">Фото не загружено</span>)}
                  </motion.button>)}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                {photoError && (<p className="text-sm text-red-600">{photoError}</p>)}
              </div>

              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              <div className="space-y-2">
                <Label htmlFor="item-name">Название</Label>
                <AnimatePresence mode="wait" initial={false}>
                  {isEditing ? (<motion.div key="edit-name" className="space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Input id="item-name" value={editName} onChange={(e) => {
                setEditName(e.target.value);
                if (e.target.value.trim())
                    setNameError(false);
            }} className={nameError
                ? "border-red-500 focus-visible:ring-red-500"
                : ""} placeholder="Название предмета"/>
                      {nameError && (<p className="text-sm text-red-600">
                          Введите название предмета
                        </p>)}
                    </motion.div>) : (<motion.p key="view-name" className="p-3 bg-muted rounded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {item.name}
                    </motion.p>)}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-category">Категория</Label>
                <AnimatePresence mode="wait" initial={false}>
                  {isEditing ? (<motion.div key="edit-category" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <CategoryCombobox id="item-category" value={editCategory} onChange={setEditCategory} categories={availableCategories} placeholder="Например: Одежда, Инструменты, Книги"/>
                    </motion.div>) : (<motion.p key="view-category" className="p-3 bg-muted rounded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {item.category || (<span className="text-muted-foreground">Не указана</span>)}
                    </motion.p>)}
                </AnimatePresence>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Описание</Label>
                <AnimatePresence mode="wait" initial={false}>
                  {isEditing ? (<motion.div key="edit-description" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Textarea id="item-description" value={editDescription} maxLength={MAX_ITEM_DESCRIPTION_LENGTH} onChange={(e) => setEditDescription(clampItemDescription(e.target.value))} placeholder="Дополнительная информация о предмете" rows={4}/>
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        {editDescription.length}/{MAX_ITEM_DESCRIPTION_LENGTH}
                      </p>
                    </motion.div>) : (<motion.p key="view-description" className="p-3 bg-muted rounded min-h-[100px] whitespace-pre-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {item.description || (<span className="text-muted-foreground">Нет описания</span>)}
                    </motion.p>)}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AuthRequiredDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} onConfirmLogin={() => {
            setAuthDialogOpen(false);
            onRequireAuth?.();
        }}/>
    </div>);
}
