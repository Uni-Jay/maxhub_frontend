import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useThemeStore } from './store/themeStore';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

// Apply persisted theme before first render
useThemeStore.getState().init();

// This app deploys constantly, and Vite content-hashes every route's lazy
// chunk — so a tab left open across a deploy is still holding an index.html
// that references chunk filenames the server no longer has (the new deploy
// fully replaced dist/assets, not appended to it). Navigating to a
// not-yet-loaded route then fails ("Failed to fetch dynamically imported
// module", server returns index.html's text/html instead of JS) and the
// page hangs until the user manually refreshes — which is exactly the
// "slow login, have to refresh before the dashboard shows" symptom. Vite
// fires this exact event for that failure; reloading once picks up the
// current index.html and its correct chunk hashes. The sessionStorage
// guard stops a genuinely broken deploy from reload-looping forever.
const RELOAD_GUARD_KEY = 'vite-reload-on-preload-error';
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
});
// Clear the guard once this load has run stably for a bit, so a *later*
// deploy (this app ships several a day) can still trigger one more
// auto-reload instead of being silenced for the rest of the tab's life.
setTimeout(() => sessionStorage.removeItem(RELOAD_GUARD_KEY), 15000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
