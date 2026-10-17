"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global critical error:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 font-sans p-4">
        <div className="max-w-md w-full text-center rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-red-400">Application Error</h2>
          <p className="mt-2 text-xs text-zinc-400">
            A critical error occurred while initializing the application.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
