"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppLogo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSessionStore } from "@/features/auth/store/session-store";
import { useI18n } from "@/i18n/context";
import type { SessionUser } from "@/features/auth/types";

interface BoardsHeaderProps {
  user: SessionUser;
}

export function BoardsHeader({ user }: BoardsHeaderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useSessionStore((s) => s.logout);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center transition-opacity hover:opacity-90">
          <AppLogo size="md" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          <div className="h-4 w-px bg-border-strong mx-0.5" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle border border-accent-primary/30 text-[11px] font-bold text-accent-primary">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-text-secondary">
              {user.name}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            {t("common.actions.signOut")}
          </Button>
        </div>
      </div>
    </header>
  );
}
