import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: true,
      toggle: () =>
        set(s => {
          const next = !s.isDark;
          if (next) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return { isDark: next };
        }),
      init: () => {
        const { isDark } = get();
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      },
    }),
    { name: 'maxhub-theme' }
  )
);
