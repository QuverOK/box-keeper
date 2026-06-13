import { useEffect, useState } from "react";
import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { QueryProvider } from "../providers/QueryProvider";
import { useUserStore } from "@/entities/user/model/store";
import { api } from "@/shared/api/client";
import type { User } from "@/shared/model";
import { AppHeader } from "@/components/AppHeader";
function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Outlet />
    </motion.div>
  );
}
function RootLayout() {
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
export const Route = createRootRoute({
  component: RootLayout,
});
