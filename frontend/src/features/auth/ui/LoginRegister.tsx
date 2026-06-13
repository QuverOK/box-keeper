import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Box, Check, QrCode, X } from "lucide-react";
import { api } from "@/shared/api/client";
import { normalizeApiError } from "@/shared/api/errors";
import { useUserStore } from "@/entities/user/model/store";
import type { AuthResponse } from "@/shared/model";
import { validatePassword, passwordsMatch } from "../model/password";

const checklistItemVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.18 },
  }),
};

interface LoginRegisterProps {
  onLogin: () => void;
  onScanQr?: () => void;
}

function PasswordChecklist({
  password,
  visible,
}: {
  password: string;
  visible: boolean;
}) {
  const { checks } = validatePassword(password);
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.ul
          className="mt-2 space-y-1"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{ overflow: "hidden" }}
        >
          {checks.map((check, i) => (
            <motion.li
              key={check.key}
              custom={i}
              variants={checklistItemVariants}
              initial="hidden"
              animate="visible"
              className={`flex items-center gap-1.5 text-xs ${check.passed ? "text-green-600" : "text-gray-400"}`}
            >
              {check.passed ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              {check.label}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

export function LoginRegister({ onLogin, onScanQr }: LoginRegisterProps) {
  const { setAuth } = useUserStore();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [tabKeys, setTabKeys] = useState({ login: 0, register: 0 });

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleTabChange = (value: string) => {
    const tab = value as "login" | "register";
    setActiveTab(tab);
    setTabKeys((prev) => ({ ...prev, [tab]: prev[tab] + 1 }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError("Пожалуйста, заполните все поля");
      return;
    }
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await api.post<AuthResponse>("/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      setAuth(res.user, res.access_token);
      onLogin();
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setLoginError(apiErr.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword || !registerConfirmPassword) {
      setRegisterError("Пожалуйста, заполните все поля");
      return;
    }
    if (!validatePassword(registerPassword).isValid) {
      setPasswordTouched(true);
      setRegisterError("Пароль не соответствует требованиям");
      return;
    }
    if (!passwordsMatch(registerPassword, registerConfirmPassword)) {
      setRegisterError("Пароли не совпадают");
      return;
    }
    setRegisterError("");
    setRegisterLoading(true);
    try {
      const res = await api.post<AuthResponse>("/auth/register", {
        email: registerEmail,
        password: registerPassword,
        name: registerName || registerEmail.split("@")[0],
      });
      setAuth(res.user, res.access_token);
      onLogin();
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setRegisterError(apiErr.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <Box className="w-10 h-10 text-blue-600" />
          <h1 className="text-2xl max-[360px]:text-xl">BoxKeeper</h1>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <motion.div
              key={tabKeys.login}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Card>
                <form onSubmit={handleLogin}>
                  <CardHeader className="mb-2">
                    <CardTitle>Вход в систему</CardTitle>
                    <CardDescription>
                      Введите ваши учётные данные для входа
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setLoginError("");
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Пароль</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError("");
                        }}
                      />
                    </div>
                    {loginError && (
                      <p className="text-red-500 text-sm">{loginError}</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <motion.div className="w-full" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}>
                      <Button
                        type="submit"
                        className="w-full mt-3"
                        disabled={loginLoading}
                      >
                        {loginLoading ? "Вход..." : "Войти"}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="register">
            <motion.div
              key={tabKeys.register}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Card>
                <form onSubmit={handleRegister}>
                  <CardHeader className="mb-4">
                    <CardTitle>Регистрация</CardTitle>
                    <CardDescription>
                      Создайте новый аккаунт для начала работы
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Имя (необязательно)</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Иван Иванов"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          setRegisterError("");
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Пароль</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          setRegisterError("");
                        }}
                        onFocus={() => setPasswordTouched(true)}
                      />
                      <PasswordChecklist
                        password={registerPassword}
                        visible={passwordTouched}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">
                        Подтверждение пароля
                      </Label>
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          setRegisterError("");
                        }}
                      />
                      {registerConfirmPassword &&
                        registerPassword !== registerConfirmPassword && (
                          <p className="text-xs text-red-500 mt-1">
                            Пароли не совпадают
                          </p>
                        )}
                    </div>

                    {registerError && (
                      <p className="text-red-500 text-sm">{registerError}</p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <motion.div className="w-full" whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}>
                      <Button
                        type="submit"
                        className="w-full mt-3"
                        disabled={registerLoading}
                      >
                        {registerLoading ? "Регистрация..." : "Зарегистрироваться"}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {onScanQr && (
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onScanQr}
            >
              <QrCode className="w-4 h-4" />
              Сканировать QR без входа
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
