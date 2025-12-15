"use client";

import { AppContext, useAppProvider } from '@/lib/hooks';
import { ThemeProvider } from './theme-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const value = useAppProvider();
  const queryClient = new QueryClient();

  return (
      <QueryClientProvider client={queryClient}>
        <AppContext.Provider value={value}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
        </AppContext.Provider>
      </QueryClientProvider>
  );
}
