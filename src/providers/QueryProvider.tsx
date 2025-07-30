import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create a client with optimized settings for banknote fetching performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 5 minutes for filter metadata, 1 minute for banknote data
      staleTime: 60 * 1000, // 1 minute default
      // Keep data in cache for 10 minutes after component unmounts
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to avoid unnecessary requests
      refetchOnReconnect: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Export query client for direct use in services
export { queryClient };
