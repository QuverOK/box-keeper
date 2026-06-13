import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/shared/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Box, Check, X } from "lucide-react";
interface LoginRegisterProps {
    onLogin: (email: string) => void;
}
interface PasswordRule {
    label: string;
    test: (pw: string) => boolean;
}
const PASSWORD_RULES: PasswordRule[] = [
    { label: "Минимум 6 символов", test: (pw) => pw.length >= 6 },
    { label: "Хотя бы одна заглавная буква", test: (pw) => /[A-ZА-ЯЁ]/.test(pw) },
    {
        label: "Хотя бы один специальный знак",
        test: (pw) => /[^a-zA-Zа-яА-ЯёЁ0-9]/.test(pw),
    },
];
function isPasswordValid(pw: string) {
    return PASSWORD_RULES.every((r) => r.test(pw));
}
function PasswordChecklist({ password, visible, }: {
    password: string;
    visible: boolean;
}) {
    if (!visible)
        return null;
    return (<ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (<li key={rule.label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {ok ? (<Check className="w-3.5 h-3.5 flex-shrink-0"/>) : (<X className="w-3.5 h-3.5 flex-shrink-0"/>)}
            {rule.label}
          </li>);
        })}
    </ul>);
}
export function LoginRegister({ onLogin }: LoginRegisterProps) {
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
    const [registerError, setRegisterError] = useState("");
    const [passwordTouched, setPasswordTouched] = useState(false);
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginEmail || !loginPassword) {
            setLoginError("Пожалуйста, заполните все поля");
            return;
        }
        setLoginError("");
        onLogin(loginEmail);
    };
    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (!registerEmail || !registerPassword || !registerConfirmPassword) {
            setRegisterError("Пожалуйста, заполните все поля");
            return;
        }
        if (!isPasswordValid(registerPassword)) {
            setPasswordTouched(true);
            setRegisterError("Пароль не соответствует требованиям");
            return;
        }
        if (registerPassword !== registerConfirmPassword) {
            setRegisterError("Пароли не совпадают");
            return;
        }
        setRegisterError("");
        onLogin(registerEmail);
    };
    return (<div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Box className="w-10 h-10 text-blue-600"/>
          <h1 className="text-3xl">BoxKeeper</h1>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вход</TabsTrigger>
            <TabsTrigger value="register">Регистрация</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
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
                    <Input id="login-email" type="email" placeholder="your@email.com" value={loginEmail} onChange={(e) => {
            setLoginEmail(e.target.value);
            setLoginError("");
        }}/>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Пароль</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => {
            setLoginPassword(e.target.value);
            setLoginError("");
        }}/>
                  </div>
                  {loginError && (<p className="text-red-500 text-sm">{loginError}</p>)}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full mt-3">
                    Войти
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle>Регистрация</CardTitle>
                  <CardDescription>
                    Создайте новый аккаунт для начала работы
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input id="register-email" type="email" placeholder="your@email.com" value={registerEmail} onChange={(e) => {
            setRegisterEmail(e.target.value);
            setRegisterError("");
        }}/>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Пароль</Label>
                    <Input id="register-password" type="password" placeholder="••••••••" value={registerPassword} onChange={(e) => {
            setRegisterPassword(e.target.value);
            setRegisterError("");
        }} onFocus={() => setPasswordTouched(true)}/>
                    <PasswordChecklist password={registerPassword} visible={passwordTouched}/>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">
                      Подтверждение пароля
                    </Label>
                    <Input id="register-confirm-password" type="password" placeholder="••••••••" value={registerConfirmPassword} onChange={(e) => {
            setRegisterConfirmPassword(e.target.value);
            setRegisterError("");
        }}/>
                    {registerConfirmPassword &&
            registerPassword !== registerConfirmPassword && (<p className="text-xs text-red-500 mt-1">
                          Пароли не совпадают
                        </p>)}
                  </div>

                  {registerError && (<p className="text-red-500 text-sm">{registerError}</p>)}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full mt-3">
                    Зарегистрироваться
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>);
}
