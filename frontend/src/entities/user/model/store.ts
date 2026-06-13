import { create } from "zustand";
import type { User } from "./types";

interface UserStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: localStorage.getItem("access_token"),
  setAuth: (user, token) => {
    localStorage.setItem("access_token", token);
    set({ user, token });
  },
  setUser: (user) => set({ user }),
  clearAuth: () => {
    localStorage.removeItem("access_token");
    set({ user: null, token: null });
  },
}));
