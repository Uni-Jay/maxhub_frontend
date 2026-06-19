import { QueryClient } from '@tanstack/react-query';

// Single shared instance — imported by main.tsx (for the Provider) and by
// authStore.ts (to wipe cached data on logout, so a role switched to in the
// same browser tab can never see the previous user's cached query results).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
