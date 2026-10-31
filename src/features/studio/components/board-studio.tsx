"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { CanvasEngine } from "@/canvas/canvas-engine";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useSessionStore } from "@/features/auth/store/session-store";
import {
  useBoardQuery,
  useUpdateBoardMutation,
} from "@/features/boards/api/boards.queries";
import { ExportModal } from "@/features/export/components/export-modal";
import { ShareModal } from "@/features/share/components/share-modal";
import { CanvasContextMenu } from "@/features/studio/components/canvas-context-menu";
import { InlineTextEditor } from "@/features/studio/components/inline-text-editor";
import { Minimap } from "@/features/studio/components/minimap";
import { PropertiesPalette } from "@/features/studio/components/properties-palette/properties-palette";
import { ShortcutsModal } from "@/features/studio/components/shortcuts-modal";
import { StudioHeader } from "@/features/studio/components/studio-header";
import { StudioToolbar } from "@/features/studio/components/toolbar/studio-toolbar";
import { ZoomControls } from "@/features/studio/components/zoom-controls";
import { useBoardCollab } from "@/features/studio/hooks/use-board-collab";
import { useFollowCollaborator } from "@/features/studio/hooks/use-follow-collaborator";
import { VersionHistoryModal } from "@/features/version-history/components/version-history-modal";
import { useI18n } from "@/i18n/context";
import { queryKeys } from "@/lib/api/query-keys";
import type { SessionUser } from "@/features/auth/types";
import type { BoardDetail } from "@/features/boards/types";
import { Role } from "@/shared";
import { useCanvasStore } from "@/store/canvas-store";

interface BoardStudioProps {
  boardId: string;
  initialBoard: BoardDetail | null;
  user: SessionUser | null;
  linkToken?: string;
}

type StudioModalType = "share" | "export" | "history" | "shortcuts" | null;

export function BoardStudio({
  boardId,
  initialBoard,
  user,
  linkToken,
}: BoardStudioProps) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrateUser = useSessionStore((s) => s.hydrateUser);

  const {
    data: board,
    isLoading: isBoardLoading,
    error: boardError,
  } = useBoardQuery(boardId, linkToken, initialBoard);

  const updateBoardMutation = useUpdateBoardMutation(boardId);

  useEffect(() => {
    hydrateUser(user);
  }, [hydrateUser, user]);

  useEffect(() => {
    if (board && linkToken && user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
    }
  }, [board, linkToken, user?.id, queryClient]);

  const [activeModal, setActiveModal] = useState<StudioModalType>(null);
  const [showProperties, setShowProperties] = useState(false);

  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const isPropertiesOpen = showProperties || selectedIds.length > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  const boardRole = board?.role;
  const { provider, syncStatus, userId } = useBoardCollab({
    boardId,
    boardRole,
    user,
    linkToken,
  });

  const { followingClientId, setFollowingClientId } = useFollowCollaborator(
    provider,
    engine
  );

  const [undoStatus, setUndoStatus] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    if (!engine) return;
    const unsubUndo = engine.onUndoStackChange((status) => {
      setUndoStatus(status);
    });
    const unsubShortcuts = engine.events.on("openShortcutsHelp", () => {
      setActiveModal((prev) => (prev === "shortcuts" ? null : "shortcuts"));
    });
    return () => {
      unsubUndo();
      unsubShortcuts();
    };
  }, [engine]);

  useEffect(() => {
    if (
      !provider ||
      !boardRole ||
      !containerRef.current ||
      !bgCanvasRef.current ||
      !contentCanvasRef.current ||
      !overlayCanvasRef.current
    ) {
      return;
    }

    const canvasEngine = new CanvasEngine(
      containerRef.current,
      bgCanvasRef.current,
      contentCanvasRef.current,
      overlayCanvasRef.current,
      provider.doc,
      provider,
      boardRole,
      userId
    );

    canvasEngine.broadcastViewport();
    setEngine(canvasEngine);

    return () => {
      canvasEngine.destroy();
      setEngine(null);
    };
  }, [provider, boardRole, userId]);

  if (isBoardLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="text-xs font-medium text-text-muted">
            {t("studio.header.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (boardError || !board) {
    const errorMessage =
      boardError instanceof Error ? boardError.message : t("studio.header.loading");
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas p-4">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-surface p-6 text-center shadow-xl">
          <h2 className="text-base font-bold text-red-500">{t("common.status.error")}</h2>
          <p className="mt-2 text-xs text-text-muted">{errorMessage}</p>
          <Button
            onClick={() => router.push("/boards")}
            variant="primary"
            size="sm"
            className="mt-4"
          >
            {t("studio.header.backToBoards")}
          </Button>
        </div>
      </div>
    );
  }

  const isReadOnly = board.role === Role.VIEWER;

  const handleRenameBoard = async (newTitle: string) => {
    try {
      await updateBoardMutation.mutateAsync({ title: newTitle });
      toast.success(t("common.toasts.boardRenamed"));
    } catch {
      toast.error(t("common.toasts.boardRenameError"));
      throw new Error("Rename failed");
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none bg-canvas text-text-primary">
      <div ref={containerRef} className="absolute inset-0 h-full w-full">
        <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" />
        <canvas
          ref={contentCanvasRef}
          className="absolute inset-0 pointer-events-none"
        />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 touch-none" />
        <InlineTextEditor engine={engine} />
      </div>

      <CanvasContextMenu engine={engine} />

      <StudioHeader
        boardId={board.id}
        boardTitle={board.title}
        boardRole={board.role}
        syncStatus={syncStatus}
        provider={provider}
        followingClientId={followingClientId}
        onFollowUser={setFollowingClientId}
        onOpenHistory={() => setActiveModal("history")}
        onOpenExport={() => setActiveModal("export")}
        onOpenShare={() => setActiveModal("share")}
        onRenameBoard={handleRenameBoard}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <StudioToolbar
          readOnly={isReadOnly}
          canUndo={!isReadOnly && undoStatus.canUndo}
          canRedo={!isReadOnly && undoStatus.canRedo}
          onUndo={() => engine?.undo()}
          onRedo={() => engine?.redo()}
          onInsertImage={(file) => void engine?.insertImage(file)}
        />
      </div>

      {!isReadOnly && (
        <div className="absolute left-3 top-16 z-20 pointer-events-auto">
          {!isPropertiesOpen && (
            <button
              type="button"
              onClick={() => setShowProperties(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/95 text-text-secondary shadow-md backdrop-blur-md hover:bg-surface-hover hover:text-text-primary transition-all active:scale-95"
              title={t("studio.inspector.toggleButton")}
              aria-label={t("studio.inspector.toggleButton")}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}

          {isPropertiesOpen && (
            <PropertiesPalette
              engine={engine}
              onClose={() => setShowProperties(false)}
            />
          )}
        </div>
      )}

      <div className="absolute right-3 bottom-16 lg:bottom-4 z-20 pointer-events-auto flex flex-col items-end gap-2">
        <Minimap engine={engine} />
        <ZoomControls
          onZoomIn={() => engine?.zoomIn()}
          onZoomOut={() => engine?.zoomOut()}
          onResetZoom={() => engine?.resetViewport()}
          onFitToContent={() => engine?.fitToContent()}
          onOpenShortcuts={() => setActiveModal("shortcuts")}
        />
      </div>

      <ShortcutsModal
        isOpen={activeModal === "shortcuts"}
        onClose={() => setActiveModal(null)}
      />

      {activeModal === "share" && (
        <ShareModal
          isOpen
          boardId={board.id}
          boardTitle={board.title}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "export" && provider && (
        <ExportModal
          doc={provider.doc}
          boardTitle={board.title}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "history" && (
        <VersionHistoryModal
          boardId={board.id}
          userRole={board.role}
          onClose={() => setActiveModal(null)}
          onRestored={() => {
            engine?.reindexElements();
            useCanvasStore.getState().setSelectedIds([]);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}
