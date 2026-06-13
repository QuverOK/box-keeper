import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Box, User, QrCode, Moon, Sun, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { useUserStore } from "@/entities/user/model/store";

const navBtnVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.93 },
};

export function AppHeader() {
  const { token, clearAuth } = useUserStore();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState<boolean>(
    () => localStorage.getItem("darkMode") === "true",
  );

  if (!token) return null;

  const toggleTheme = () => {
    setIsDark((v) => {
      const next = !v;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    clearAuth();
    navigate({ to: "/login" });
  };

  return (
    <motion.header
      className="bg-card border-b sticky top-0 z-10"
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="page-container py-4 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate({ to: "/dashboard" })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Box className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl">BoxKeeper</h1>
        </motion.div>
        <nav className="flex items-center gap-1">
          <motion.div variants={navBtnVariants} initial="rest" whileHover="hover" whileTap="tap" transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/profile" })}
            >
              <User className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div variants={navBtnVariants} initial="rest" whileHover="hover" whileTap="tap" transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/qr" })}
            >
              <QrCode className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div variants={navBtnVariants} initial="rest" whileHover="hover" whileTap="tap" transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </motion.div>
          <motion.div variants={navBtnVariants} initial="rest" whileHover="hover" whileTap="tap" transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </motion.div>
        </nav>
      </div>
    </motion.header>
  );
}
