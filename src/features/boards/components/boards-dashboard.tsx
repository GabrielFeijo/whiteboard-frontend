"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";
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
import { RenameBoardModal } from "@/features/boards/components/rename-board-modal";
import {
  useDashboardPrefsStore,
  DashboardRoleFilter,
  DashboardSortBy,
} from "@/features/boards/store/dashboard-prefs-store";
import { ShareModal } from "@/features/share/components/share-modal";
import { useI18n } from "@/i18n/context";
import { getApiErrorMessage } from "@/lib/api/client";
import { Role } from "@/shared";
import type { SessionUser } from "@/features/auth/types";
import type { BoardItem, BoardsListResponse } from "../types";

interface BoardsDashboardProps {
  user: SessionUser;
  initialBoards: BoardsListResponse | null;
}

type DashboardDialogState =
  | { type: "create" }
  | { type: "share"; board: BoardItem }
  | { type: "rename"; board: BoardItem }
  | { type: "delete"; boardId: string }
  | null;

export function BoardsDashboard({ user, initialBoards }: BoardsDashboardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const hydrateUser = useSessionStore((s) => s.hydrateUser);

  const { viewMode, filterRole, sortBy } = useDashboardPrefsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [activeDialog, setActiveDialog] = useState<DashboardDialogState>(null);

  const { data, isLoading } = useBoardsQuery(
    cursor ? undefined : initialBoards,
    cursor,
  );
  const duplicateMutation = useDuplicateBoardMutation();
  const deleteMutation = useDeleteBoardMutation();

  useEffect(() => {
    hydrateUser(user);
  }, [hydrateUser, user]);

  const filteredBoards = useMemo(() => {
    const allBoards = data?.items ?? [];
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const filtered = allBoards.filter((board) => {
      if (normalizedQuery && !board.title.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      if (filterRole === DashboardRoleFilter.OWNER) {
        return board.role === Role.OWNER;
      }
      if (filterRole === DashboardRoleFilter.MEMBER) {
        return board.role !== Role.OWNER;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === DashboardSortBy.TITLE) {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [data?.items, searchQuery, filterRole, sortBy]);

  const handleOpenBoard = (boardId: string) => {
    router.push(`/board/${boardId}`);
  };

  const handleDuplicate = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await duplicateMutation.mutateAsync(boardId);
      toast.success(t("common.toasts.boardDuplicated"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.toasts.boardDuplicateError")));
    }
  };

  const handleDeleteRequest = (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDialog({ type: "delete", boardId });
  };

  const handleRenameRequest = (board: BoardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDialog({ type: "rename", board });
  };

  const handleConfirmDelete = async () => {
    if (activeDialog?.type !== "delete") return;
    try {
      await deleteMutation.mutateAsync(activeDialog.boardId);
      toast.success(t("common.toasts.boardDeleted"));
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.toasts.boardDeleteError")));
    } finally {
      setActiveDialog(null);
    }
  };

  const CardComponent = viewMode === "grid" ? BoardGridCard : BoardListRow;

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
            onClick={() => setActiveDialog({ type: "create" })}
            className="self-start sm:self-auto gap-2 shadow-sm font-medium"
          >
            <Plus className="h-4 w-4" />
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
            onCreateClick={() => setActiveDialog({ type: "create" })}
          />
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBoards.map((board) => (
              <CardComponent
                key={board.id}
                board={board}
                onOpen={handleOpenBoard}
                onShare={(b) => setActiveDialog({ type: "share", board: b })}
                onDuplicate={handleDuplicate}
                onDelete={handleDeleteRequest}
                onRename={handleRenameRequest}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xs">
            <div className="divide-y divide-border-subtle">
              {filteredBoards.map((board) => (
                <CardComponent
                  key={board.id}
                  board={board}
                  onOpen={handleOpenBoard}
                  onShare={(b) => setActiveDialog({ type: "share", board: b })}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDeleteRequest}
                  onRename={handleRenameRequest}
                />
              ))}
            </div>
          </div>
        )}

        {(cursor || data?.nextCursor) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {cursor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(undefined)}
              >
                ← First Page
              </Button>
            )}
            {data?.nextCursor && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCursor(data.nextCursor ?? undefined)}
              >
                Next Page →
              </Button>
            )}
          </div>
        )}

        <CreateBoardModal
          isOpen={activeDialog?.type === "create"}
          onClose={() => setActiveDialog(null)}
        />

        {activeDialog?.type === "rename" && (
          <RenameBoardModal
            key={activeDialog.board.id}
            isOpen
            board={activeDialog.board}
            onClose={() => setActiveDialog(null)}
          />
        )}

        {activeDialog?.type === "share" && (
          <ShareModal
            isOpen
            boardId={activeDialog.board.id}
            boardTitle={activeDialog.board.title}
            onClose={() => setActiveDialog(null)}
          />
        )}

        <ConfirmDialog
          open={activeDialog?.type === "delete"}
          onOpenChange={(open) => {
            if (!open) setActiveDialog(null);
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
