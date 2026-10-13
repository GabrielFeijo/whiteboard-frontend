"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../../store/auth-store";
import {
  BoardItem,
  useBoardsQuery,
  useCreateBoardMutation,
  useDeleteBoardMutation,
  useDuplicateBoardMutation,
} from "../../hooks/use-boards";
import { ShareModal } from "../../components/share-modal";
import { ConfirmDialog } from "../../components/ui/alert-dialog";
import { useI18n } from "../../i18n";
import { LanguageSwitcher } from "../../components/language-switcher";
import { ThemeToggle } from "../../components/ui/theme-toggle";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

export default function BoardsPage() {
  const router = useRouter();
  const { user, isInitialized, init, logout } = useAuthStore();
  const { t } = useI18n();

  const [isCreating, setIsCreating] = useState(false);
  const [sharingBoard, setSharingBoard] = useState<BoardItem | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"ALL" | "OWNER" | "MEMBER">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data, isLoading } = useBoardsQuery();

  const createMutation = useCreateBoardMutation();
  const duplicateMutation = useDuplicateBoardMutation();
  const deleteMutation = useDeleteBoardMutation();

  const createBoardSchema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .trim()
          .min(1, t("dashboard.titleRequired"))
          .max(100, t("dashboard.titleTooLong")),
      }),
    [t],
  );

  type CreateBoardFormData = z.infer<typeof createBoardSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/login");
    }
  }, [isInitialized, user, router]);

  const filteredBoards = useMemo(() => {
    const allBoards = data?.items || [];
    return allBoards.filter((board) => {
      const matchesSearch = board.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (filterRole === "OWNER") return board.role === "OWNER";
      if (filterRole === "MEMBER") return board.role !== "OWNER";
      return true;
    });
  }, [data?.items, searchQuery, filterRole]);

  const onSubmitCreate = async (formData: CreateBoardFormData) => {
    const created = await createMutation.mutateAsync({ title: formData.title });
    reset();
    setIsCreating(false);
    router.push(`/board/${created.id}`);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateMutation.mutateAsync(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBoardId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBoardId) return;
    await deleteMutation.mutateAsync(deletingBoardId);
    setDeletingBoardId(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default";
      case "EDITOR":
        return "success";
      case "VIEWER":
      default:
        return "neutral";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "OWNER":
        return t("dashboard.roles.owner");
      case "EDITOR":
        return t("dashboard.roles.editor");
      case "VIEWER":
      default:
        return t("dashboard.roles.viewer");
    }
  };

  if (!isInitialized || (!user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-text-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="text-xs font-medium">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary text-white shadow-xs">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M7 7h10M7 12h7M7 17h4" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Whiteboard</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />

            <div className="h-4 w-px bg-border-strong mx-0.5" />

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle border border-accent-primary/30 text-[11px] font-bold text-accent-primary">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-text-secondary">
                {user?.name}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              {t("common.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              {t("dashboard.subtitle")}
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreating(true)}
            className="self-start sm:self-auto gap-2 shadow-sm font-medium"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("nav.newBoard")}</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome..."
                className="w-full rounded-lg border border-border-strong bg-surface pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
              />
            </div>

            <div className="hidden md:flex items-center rounded-lg border border-border-subtle bg-surface p-0.5 shadow-2xs">
              <button
                onClick={() => setFilterRole("ALL")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterRole === "ALL"
                    ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterRole("OWNER")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterRole === "OWNER"
                    ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Meus
              </button>
              <button
                onClick={() => setFilterRole("MEMBER")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterRole === "MEMBER"
                    ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Compartilhados
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-text-muted">
              {filteredBoards.length} {filteredBoards.length === 1 ? "quadro" : "quadros"}
            </span>

            <div className="flex items-center rounded-lg border border-border-subtle bg-surface p-0.5 shadow-2xs">
              <button
                onClick={() => setViewMode("grid")}
                title="Visualização em Grade"
                className={`p-1 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-surface-raised text-text-primary shadow-2xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="Visualização em Lista"
                className={`p-1 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-surface-raised text-text-primary shadow-2xs"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-xs text-text-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent mx-auto mb-2" />
            {t("dashboard.loading")}
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/50 py-16 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-surface text-text-muted shadow-xs mb-3">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              {searchQuery ? "Nenhum quadro encontrado para esta busca" : t("dashboard.noBoards")}
            </h3>
            <p className="mt-1 text-xs text-text-muted max-w-sm">
              {searchQuery
                ? "Tente buscar com outro termo ou limpe os filtros."
                : "Crie um novo quadro branco para iniciar seu projeto ou convide sua equipe para colaborar."}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreating(true)}
                className="mt-4"
              >
                {t("dashboard.createFirst")}
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => router.push(`/board/${board.id}`)}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-xs transition-all duration-150 hover:border-accent-primary/60 hover:shadow-md active:scale-[0.99]"
              >
                <div>
                  <div className="relative mb-3 h-28 w-full overflow-hidden rounded-lg border border-border-subtle bg-canvas flex items-center justify-center">
                    <div
                      className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                        backgroundSize: "16px 16px",
                        color: "var(--color-text-muted)",
                      }}
                    />
                    <div className="flex items-center gap-2 opacity-50 transition-transform group-hover:scale-105">
                      <div className="h-8 w-12 rounded border border-border-strong bg-surface" />
                      <span className="text-[10px] text-text-muted">➔</span>
                      <div className="h-8 w-8 rounded-full border border-border-strong bg-accent-subtle" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                      {board.title}
                    </h3>
                    <Badge variant={getRoleBadgeVariant(board.role)}>
                      {getRoleLabel(board.role)}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-text-muted">
                  <span>
                    {new Date(board.updatedAt).toLocaleDateString(t("common.dateLocale"))}
                  </span>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSharingBoard(board)}
                      title={t("dashboard.share")}
                      className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                      </svg>
                    </button>

                    <button
                      onClick={(e) => handleDuplicate(board.id, e)}
                      title={t("common.duplicate")}
                      className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    {board.role === "OWNER" && (
                      <button
                        onClick={(e) => handleDelete(board.id, e)}
                        title={t("common.delete")}
                        className="rounded-md p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xs">
            <div className="divide-y divide-border-subtle">
              {filteredBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group flex cursor-pointer items-center justify-between p-3.5 hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-canvas text-text-muted">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
                        {board.title}
                      </h3>
                      <p className="text-[11px] text-text-muted">
                        Atualizado em {new Date(board.updatedAt).toLocaleDateString(t("common.dateLocale"))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={getRoleBadgeVariant(board.role)}>
                      {getRoleLabel(board.role)}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSharingBoard(board)}
                      className="text-xs"
                    >
                      {t("dashboard.share")}
                    </Button>

                    <button
                      onClick={(e) => handleDuplicate(board.id, e)}
                      title={t("common.duplicate")}
                      className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    {board.role === "OWNER" && (
                      <button
                        onClick={(e) => handleDelete(board.id, e)}
                        title={t("common.delete")}
                        className="rounded-md p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    {t("dashboard.createNewBoard")}
                  </h2>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {t("dashboard.createModalSubtitle")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setIsCreating(false);
                  }}
                  className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmitCreate)} className="mt-4 space-y-4">
                <Input
                  id="board-title-input"
                  autoFocus
                  placeholder={t("dashboard.boardTitlePlaceholder")}
                  error={errors.title?.message}
                  {...register("title")}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      reset();
                      setIsCreating(false);
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createMutation.isPending}
                  >
                    {createMutation.isPending ? t("dashboard.creatingButton") : t("dashboard.createButton")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {sharingBoard && (
          <ShareModal
            isOpen={!!sharingBoard}
            boardId={sharingBoard.id}
            boardTitle={sharingBoard.title}
            onClose={() => setSharingBoard(null)}
          />
        )}

        <ConfirmDialog
          isOpen={!!deletingBoardId}
          title={t("dashboard.confirmDeleteTitle")}
          description={t("dashboard.confirmDeleteDescription")}
          confirmLabel={t("dashboard.confirmDeleteAction")}
          variant="destructive"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingBoardId(null)}
        />
      </main>
    </div>
  );
}
