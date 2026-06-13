import { ArrowLeft, Mail, Lock, LogOut, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { normalizeApiError } from "@/shared/api/errors";

interface ProfileProps {
  userEmail: string;
  onBack: () => void;
  onLogout: () => void;
}

const PASSWORD_RULES = [
  { label: "Минимум 6 символов", test: (pw: string) => pw.length >= 6 },
  {
    label: "Хотя бы одна заглавная буква",
    test: (pw: string) => /[A-ZА-ЯЁ]/.test(pw),
  },
  {
    label: "Хотя бы один специальный знак",
    test: (pw: string) => /[^a-zA-Zа-яА-ЯёЁ0-9]/.test(pw),
  },
];

function isPasswordValid(pw: string) {
  return PASSWORD_RULES.every((r) => r.test(pw));
}

function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600" : "text-gray-400"}`}
          >
            {ok ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export function Profile({ userEmail, onBack, onLogout }: ProfileProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const userInitials = userEmail.substring(0, 2).toUpperCase();

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNewPasswordTouched(false);
    setFormError("");
    setSuccessMessage("");
  };

  const handleChangePassword = async () => {
    setFormError("");
    if (!currentPassword) {
      setFormError("Введите текущий пароль");
      return;
    }
    if (!isPasswordValid(newPassword)) {
      setNewPasswordTouched(true);
      setFormError("Новый пароль не соответствует требованиям");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Пароли не совпадают");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSuccessMessage("Пароль успешно изменён");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNewPasswordTouched(false);
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setFormError(apiErr.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="page-container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl">Профиль</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-container py-8 max-w-2xl">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Информация профиля</CardTitle>
              <CardDescription>Ваши личные данные</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-start sm:flex-row sm:items-center gap-3 sm:gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 18 }}
                >
                  <Avatar className="w-20 h-20">
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-lg break-all">{userEmail}</p>
                </div>
                {/* <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Изменить фото
                </Button> */}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email">Email адрес</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    value={userEmail}
                    disabled
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Для изменения email свяжитесь с поддержкой
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <CardTitle>Безопасность</CardTitle>
              <CardDescription>Управление паролем и доступом</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {successMessage && (
                  <motion.div
                    className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    <Check className="w-4 h-4 flex-shrink-0" />
                    {successMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" initial={false}>
                {!isChangingPassword ? (
                  <motion.div
                    key="change-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setSuccessMessage("");
                        setIsChangingPassword(true);
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      Сменить пароль
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="password-form"
                    className="space-y-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Текущий пароль</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setFormError("");
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">Новый пароль</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onFocus={() => setNewPasswordTouched(true)}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setFormError("");
                        }}
                      />
                      {newPasswordTouched && (
                        <PasswordChecklist password={newPassword} />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">
                        Подтвердите новый пароль
                      </Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setFormError("");
                        }}
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-red-500">
                          Пароли не совпадают
                        </p>
                      )}
                    </div>

                    {formError && (
                      <p className="text-sm text-red-600">{formError}</p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleCancelPasswordChange}
                        disabled={isSaving}
                      >
                        Отмена
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleChangePassword}
                        disabled={isSaving}
                      >
                        {isSaving ? "Сохранение..." : "Сохранить"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Logout */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                className="w-full gap-2 text-red-600 hover:text-red-700"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                Выйти из системы
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
