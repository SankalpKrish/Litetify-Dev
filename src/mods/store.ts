import { create } from 'zustand';
import type { ModEntry } from './manifest';

export interface ModsStore {
  registry: ModEntry[];
  activeTheme: string | null;
  customViews: Map<string, { label: string; render: () => React.ReactNode }>;
  setRegistry: (registry: ModEntry[]) => void;
  toggleEnabled: (path: string) => void;
  setActiveTheme: (name: string | null) => void;
  setCustomViews: (views: Map<string, { label: string; render: () => React.ReactNode }>) => void;
  registerCustomView: (id: string, label: string, render: () => React.ReactNode) => void;
  unregisterCustomView: (id: string) => void;
}

export const useModsStore = create<ModsStore>((set) => ({
  registry: [],
  activeTheme: null,
  customViews: new Map(),

  setRegistry: (registry) => set({ registry }),

  toggleEnabled: (path) =>
    set((state) => ({
      registry: state.registry.map((m) =>
        m.path === path ? { ...m, enabled: !m.enabled } : m,
      ),
    })),

  setActiveTheme: (name) => set({ activeTheme: name }),

  setCustomViews: (views) => set({ customViews: views }),

  registerCustomView: (id, label, render) =>
    set((state) => {
      const next = new Map(state.customViews);
      next.set(id, { label, render });
      return { customViews: next };
    }),

  unregisterCustomView: (id) =>
    set((state) => {
      const next = new Map(state.customViews);
      next.delete(id);
      return { customViews: next };
    }),
}));
