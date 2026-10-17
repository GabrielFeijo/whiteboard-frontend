"use client";

import React, { useState } from "react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (!mutation.options.onError) {
              toast.error(getApiErrorMessage(error));
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
