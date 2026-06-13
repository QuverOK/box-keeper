import { ArrowLeft, Edit, Trash2, ImagePlus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import React, { useRef, useState } from "react";
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

interface ItemViewProps {
  item: {
    id: string;
    name: string;
    category: string;
    description: string;
    photo?: string;
  };
  onBack: () => void;
  onDelete: () => void;
  onUpdate: (
    name: string,
    category: string,
    description: string,
    photo?: string,
  ) => void;
}

export function ItemView({ item, onBack, onDelete, onUpdate }: ItemViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editCategory, setEditCategory] = useState(item.category);
  const [editDescription, setEditDescription] = useState(item.description);
  const [editPhoto, setEditPhoto] = useState<string | undefined>(item.photo);
  const [nameError, setNameError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditName(item.name);
    setEditCategory(item.category);
    setEditDescription(item.description);
    setEditPhoto(item.photo);
    setNameError(false);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editName.trim()) {
      setNameError(true);
      return;
    }
    onUpdate(
      editName.trim(),
      editCategory.trim(),
      editDescription.trim(),
      editPhoto,
    );
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(item.name);
    setEditCategory(item.category);
    setEditDescription(item.description);
    setEditPhoto(item.photo);
    setNameError(false);
    setIsEditing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditPhoto(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const displayPhoto = isEditing ? editPhoto : item.photo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl truncate">{item.name}</h1>
              {item.category && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 mt-0.5">
                  {item.category}
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={startEditing}
                  >
                    <Edit className="w-4 h-4" />
                    Редактировать
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
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
                        <AlertDialogAction
                          onClick={onDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Отмена
                  </Button>
                  <Button onClick={handleSave} disabled={!editName.trim()}>
                    Сохранить
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Редактирование предмета" : "Информация о предмете"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo */}
            <div className="space-y-2">
              <Label>Фото</Label>
              {displayPhoto ? (
                <div className="relative group">
                  <img
                    src={displayPhoto}
                    alt={item.name}
                    className="w-full max-h-72 object-contain rounded-lg border bg-muted"
                  />
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="w-4 h-4" />
                        Заменить
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        onClick={() => setEditPhoto(undefined)}
                      >
                        <X className="w-4 h-4" />
                        Удалить
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={
                    isEditing ? () => fileInputRef.current?.click() : undefined
                  }
                  disabled={!isEditing}
                  className="w-full border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors disabled:cursor-default enabled:hover:border-muted-foreground enabled:hover:text-foreground enabled:cursor-pointer"
                >
                  <ImagePlus className="w-10 h-10" />
                  {isEditing ? (
                    <span className="text-sm">
                      Нажмите, чтобы загрузить фото
                    </span>
                  ) : (
                    <span className="text-sm">Фото не загружено</span>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="item-name">Название</Label>
              {isEditing ? (
                <div className="space-y-1">
                  <Input
                    id="item-name"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (e.target.value.trim()) setNameError(false);
                    }}
                    className={
                      nameError
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                    placeholder="Название предмета"
                  />
                  {nameError && (
                    <p className="text-sm text-red-600">
                      Введите название предмета
                    </p>
                  )}
                </div>
              ) : (
                <p className="p-3 bg-muted rounded">{item.name}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="item-category">Категория</Label>
              {isEditing ? (
                <Input
                  id="item-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Например: Одежда, Инструменты, Книги"
                />
              ) : (
                <p className="p-3 bg-muted rounded">
                  {item.category || (
                    <span className="text-muted-foreground">Не указана</span>
                  )}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="item-description">Описание</Label>
              {isEditing ? (
                <Textarea
                  id="item-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Дополнительная информация о предмете"
                  rows={4}
                />
              ) : (
                <p className="p-3 bg-muted rounded min-h-[100px] whitespace-pre-wrap">
                  {item.description || (
                    <span className="text-muted-foreground">Нет описания</span>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
