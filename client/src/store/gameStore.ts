import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  gold: number;
  gems: number;
  stamina: number;
  staminaMax: number;
  level: number;
}

interface GameState {
  user: User | null;
  token: string | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  updateGold: (amount: number) => void;
  updateGems: (amount: number) => void;
  updateStamina: (amount: number) => void;
  logout: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  token: null,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  updateGold: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, gold: state.user.gold + amount } : null,
    })),
  updateGems: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, gems: state.user.gems + amount } : null,
    })),
  updateStamina: (amount) =>
    set((state) => ({
      user: state.user ? { ...state.user, stamina: Math.max(0, state.user.stamina + amount) } : null,
    })),
  logout: () => set({ user: null, token: null }),
}));
