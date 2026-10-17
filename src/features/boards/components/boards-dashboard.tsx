"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/features/auth/store/session-store";
import {
  useBoardsQuery,
  useDeleteBoardMutation,
  useDuplicateBoardMutation,
} from "@/features/boards/api/boards.queries";
import { BoardGridCard } from "@/features/boards/components/board-grid-card";
import { BoardListRow } from "@/features/boards/components/board-list-row";
import { BoardsEmptyState } from "@/features/boards/components/boards-empty-state";
import { BoardsFilterBar } from "@/features/boards/components/boards-filter-bar";
import { BoardsHeader } from "@/features/boards/components/boards-header";
import { CreateBoardModal } from "@/features/boards/components/create-board-modal";
import { useDashboardPrefsStore } from "@/features/boards/store/dashboard-prefs-store";
import { ShareModal } from "@/features/share/components/share-modal";
import { useI18n } from "@/i18n/context";
import type { SessionUser } from "@/server/auth/session";
import type { BoardItem, BoardsListResponse } from "@/server/dal/boards.dal";

interface BoardsDashboardProps {
  user: SessionUser;
  initialBoards: BoardsListResponse | null;
}

export function BoardsDashboard({ user, initialBoards }: BoardsDashboardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const hydrateUser = useSessionStore((s) => s.hydrateUser);

  const { viewMode, filterRole } = useDashboardPrefsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [sharingBoard, setSharingBoard] = useState<BoardItem | null>(null);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);

  const { data, isLoading } = useBoardsQuery(initialBoards);
  const duplicateMutation = useDuplicateBoardMutation();
  const deleteMutation = useDeleteBoardMutation();

  useEffect(() => {
    hydrateUser(user);
  }, [hydrateUser, user]);

  const filteredBoards = useMemo(() => {
    const allBoards = data?.items ?? [];
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return allBoards.filter((board) => {
      if (normalizedQuery && !board.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      if (filterRole === "OWNER") return board.role === "OWNER";
      if (filterRole === "MEMBER") return board.role !== "OWNER";
      return true;
    });
  }, [data?.items, searchQuery, filterRole]);

  const handleOpenBoard = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  const handleDuplicate = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await duplicateMutation.mutateAsync(boardId);
      toast.success(t("common.toasts.boardDuplicated"));
    } catch {
      toast.error(t("common.toasts.boardDuplicateError"));
    }
  };

  const handleDeleteRequest = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingBoardId(boardId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBoardId) return;
    try {
      await deleteMutation.mutateAsync(deletingBoardId);
      toast.success(t("common.toasts.boardDeleted"));
    } catch {
      toast.error(t("common.toasts.boardDeleteError"));
    } finally {
      setDeletingBoardId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
      <BoardsHeader user={user} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {t("dashboard.header.title")}
            </h1>
            <p className="mt-1 text-xs text-text-muted">{t("dashboard.header.subtitle")}</p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreating(true)}
            className="self-start sm:self-auto gap-2 shadow-sm font-medium"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t("navigation.links.newBoard")}</span>
          </Button>
        </div>

        <BoardsFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalCount={filteredBoards.length}
        />

        {isLoading ? (
          <div className="py-20 text-center text-xs text-text-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-primary border-t-transparent mx-auto mb-2" />
            {t("dashboard.header.loading")}
          </div>
        ) : filteredBoards.length === 0 ? (
          <BoardsEmptyState
            hasSearchQuery={Boolean(searchQuery.trim())}
            onCreateClick={() => setIsCreating(true)}
          />
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBoards.map((board) => (
              <BoardGridCard
                key={board.id}
                board={board}
                onOpen={handleOpenBoard}
                onShare={setSharingBoard}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteRequest}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xs">
            <div className="divide-y divide-border-subtle">
              {filteredBoards.map((board) => (
                <BoardListRow
                  key={board.id}
                  board={board}
                  onOpen={handleOpenBoard}
                  onShare={setSharingBoard}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteRequest}
                />
              ))}
            </div>
          </div>
        )}

        <CreateBoardModal isOpen={isCreating} onClose={() => setIsCreating(false)} />

        {sharingBoard && (
          <ShareModal
            isOpen={Boolean(sharingBoard)}
            boardId={sharingBoard.id}
            boardTitle={sharingBoard.title}
            onClose={() => setSharingBoard(null)}
          />
        )}

        <ConfirmDialog
          open={Boolean(deletingBoardId)}
          onOpenChange={(open) => {
            if (!open) setDeletingBoardId(null);
          }}
          title={t("dashboard.deleteDialog.title")}
          description={t("dashboard.deleteDialog.description")}
          cancelText={t("common.actions.cancel")}
          confirmText={t("dashboard.deleteDialog.confirm")}
          variant="destructive"
          isLoading={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
        />
      </main>
    </div>
  );
}
