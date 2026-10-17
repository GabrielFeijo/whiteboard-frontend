import type React from "react";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { CollaborativePins } from "@/features/auth/components/collaborative-pins";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary relative overflow-x-hidden">
      <div
        className="fixed inset-0 opacity-40 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          color: "var(--color-text-muted)",
        }}
        aria-hidden="true"
      />

      <div
        className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-accent-primary)_0%,transparent_65%)] opacity-[0.06] dark:opacity-[0.12] pointer-events-none"
        aria-hidden="true"
      />

      <AuthHeader />
      <CollaborativePins />

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative z-10 w-full">
        {children}
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-text-muted border-t border-border-subtle/40 bg-surface/30 backdrop-blur-xs select-none">
        <p>Whiteboard — Real-Time CRDT Canvas Engine</p>
      </footer>
    </div>
  );
}
