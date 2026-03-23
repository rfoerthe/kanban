"use client";

import { create } from "zustand";
import type { SafeUser } from "@/lib/types";
import * as authActions from "@/lib/auth-actions";

interface AuthState {
  user: SafeUser | null;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: SafeUser | null) => void;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authActions.getCurrentUser();
      set({ user, isInitialized: true });
    } catch {
      set({ user: null, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const result = await authActions.login(username, password);
      if (result.success && result.user) {
        set({ user: result.user });
      }
      return result;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await authActions.logout();
    set({ user: null });
  },

  changePassword: async (currentPassword, newPassword) => {
    return authActions.changePassword(currentPassword, newPassword);
  },
}));
