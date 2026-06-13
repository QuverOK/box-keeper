import { useEffect, useState } from "react";
import { QueryProvider } from "../providers/QueryProvider";
import { useUserStore } from "@/entities/user";
import { api } from "@/shared/api";
import type { User } from "@/shared/model";
import { AppHeader } from "@/components/AppHeader";
import { AnimatedOutlet } from "./animated-outlet";

export function RootLayout() {
  const { token, setUser, clearAuth } = useUserStore();
  const [authReady, setAuthReady] = useState(!token);
  useEffect(() => {
    if (!token) {
      setAuthReady(true);
      return;
    }
    api
      .get<User>("/auth/me")
      .then((u) => {
        setUser(u);
        setAuthReady(true);
      })
      .catch(() => {
        clearAuth();
        setAuthReady(true);
      });
  }, [token, setUser, clearAuth]);
  useEffect(() => {
    const dark = localStorage.getItem("darkMode") === "true";
    document.documentElement.classList.toggle("dark", dark);
  }, []);
  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }
  return (
    <QueryProvider>
      <AppHeader />
      <AnimatedOutlet />
    </QueryProvider>
  );
}
