"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/auth-store";
import { useCanvasStore } from "../../../store/canvas-store";
import { useBoardQuery } from "../../../hooks/use-boards";
import { SyncProvider } from "../../../collab/sync-provider";
import { CanvasEngine } from "../../../canvas/canvas-engine";
import { Toolbar } from "../../../components/toolbar";
import { PropertiesPalette } from "../../../components/properties-palette";
import { ZoomControls } from "../../../components/zoom-controls";
import { CollaboratorsList } from "../../../components/collaborators-list";
import { ShareModal } from "../../../components/share-modal";
import { ExportModal } from "../../../components/export-modal";
import { VersionHistoryModal } from "../../../components/version-history-modal";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeToggle } from "../../../components/ui/theme-toggle";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

function getUserColor(id?: string) {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function BoardStudioInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const boardId = params.id as string;
  const linkToken = searchParams.get("token") || undefined;
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { user, isInitialized, init } = useAuthStore();
  const { data: board, isLoading: isBoardLoading, error: boardError } = useBoardQuery(
    boardId,
    linkToken,
  );

  useEffect(() => {
    if (board && linkToken && user?.id) {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    }
  }, [board, linkToken, user?.id, queryClient]);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const isPropertiesOpen = showProperties || selectedIds.length > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [provider, setProvider] = useState<SyncProvider | null>(null);
  const [engine, setEngine] = useState<CanvasEngine | null>(null);
  const [followingClientId, setFollowingClientId] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("connecting");

  const localColor = getUserColor(user?.id);

  const boardRole = board?.role;
  const userName =
    user?.name || (user?.email ? user.email.split("@")[0] : t("collaborators.guestUser"));
  const userId = user?.id || "guest";
  const userEmail = user?.email;

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isInitialized || !boardId) return;

    const sync = new SyncProvider(boardId, linkToken);

    const unsubStatus = sync.onStatusChange((status) => {
      setSyncStatus(status);
    });

    queueMicrotask(() => {
      setProvider(sync);
    });

    return () => {
      unsubStatus();
      sync.destroy();
      setProvider(null);
    };
  }, [boardId, isInitialized, linkToken]);

  useEffect(() => {
    if (!provider || !boardRole) return;

    provider.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      email: userEmail,
      color: localColor,
      role: boardRole,
    });
  }, [provider, boardRole, userId, userName, userEmail, localColor]);

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
      userId,
    );

    canvasEngine.broadcastViewport();
    setEngine(canvasEngine);

    return () => {
      canvasEngine.destroy();
      setEngine(null);
    };
  }, [provider, boardRole, userId]);

  useEffect(() => {
    if (!provider || !engine || followingClientId === null) return;

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const targetState = states.get(followingClientId);
      if (targetState && targetState.viewport) {
        engine.setViewport(targetState.viewport.pan, targetState.viewport.zoom);
      }
    };

    provider.awareness.on("change", onAwarenessChange);
    onAwarenessChange();

    return () => {
      provider.awareness.off("change", onAwarenessChange);
    };
  }, [provider, engine, followingClientId]);

  if (isBoardLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="text-xs font-medium text-text-muted">{t("boardStudio.loading")}</p>
        </div>
      </div>
    );
  }

  if (boardError || !board) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas p-4">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-surface p-6 text-center shadow-xl">
          <h2 className="text-base font-bold text-red-500">{t("common.error")}</h2>
          <p className="mt-2 text-xs text-text-muted">
            {boardError ? (boardError as Error).message : t("boardStudio.loading")}
          </p>
          <Button
            onClick={() => router.push("/boards")}
            variant="primary"
            size="sm"
            className="mt-4"
          >
            {t("boardStudio.backToBoards")}
          </Button>
        </div>
      </div>
    );
  }

  const isReadOnly = board.role === "VIEWER";

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none bg-canvas text-text-primary">
      <div ref={containerRef} className="absolute inset-0 h-full w-full">
        <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" />
        <canvas ref={contentCanvasRef} className="absolute inset-0 pointer-events-none" />
        <canvas ref={overlayCanvasRef} className="absolute inset-0 touch-none" />
      </div>

      <header className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto rounded-xl border border-border-strong bg-surface-raised/95 px-2.5 py-1.5 shadow-md backdrop-blur-md">
          <button
            onClick={() => router.push("/boards")}
            title={t("boardStudio.backToBoards")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="h-3.5 w-px bg-border-subtle" />

          <h1 className="text-xs font-semibold text-text-primary max-w-40 sm:max-w-64 truncate">
            {board.title}
          </h1>

          {isReadOnly ? (
            <Badge variant="warning" className="text-[10px] py-0">
              {t("boardStudio.readOnly")}
            </Badge>
          ) : (
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                syncStatus === "synced"
                  ? "bg-emerald-500"
                  : syncStatus === "syncing"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-zinc-400"
              }`}
              title={`Status: ${syncStatus}`}
            />
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <CollaboratorsList
            provider={provider}
            followingClientId={followingClientId}
            onFollowUser={(targetId) => setFollowingClientId(targetId)}
          />

          <div className="hidden sm:flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised/95 p-1 shadow-md backdrop-blur-md">
            <button
              onClick={() => setShowHistoryModal(true)}
              title={t("boardStudio.versionHistory")}
              className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              title={t("boardStudio.exportCanvas")}
              className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>

            {board.role === "OWNER" && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowShareModal(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                <span>{t("boardStudio.share")}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <Toolbar
          readOnly={isReadOnly}
          canUndo={!isReadOnly}
          canRedo={!isReadOnly}
          onUndo={() => engine?.undo()}
          onRedo={() => engine?.redo()}
        />
      </div>

      {!isReadOnly && (
        <div className="absolute left-3 top-16 z-20 pointer-events-auto">
          {!isPropertiesOpen && (
            <button
              onClick={() => setShowProperties(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-surface-raised/95 text-text-secondary shadow-md backdrop-blur-md hover:bg-surface-hover hover:text-text-primary transition-all active:scale-95"
              title={t("boardStudio.toggleProperties")}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
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

      <div className="absolute right-3 bottom-4 z-20 pointer-events-auto">
        <ZoomControls
          onZoomIn={() => engine?.zoomIn()}
          onZoomOut={() => engine?.zoomOut()}
          onResetZoom={() => engine?.resetViewport()}
        />
      </div>

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          boardId={board.id}
          boardTitle={board.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showExportModal && provider && (
        <ExportModal
          doc={provider.doc}
          boardTitle={board.title}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showHistoryModal && (
        <VersionHistoryModal
          boardId={board.id}
          userRole={board.role}
          onClose={() => setShowHistoryModal(false)}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  );
}

export default function BoardStudioPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-canvas">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            <p className="text-xs font-medium text-text-muted">Loading whiteboard workspace...</p>
          </div>
        </div>
      }
    >
      <BoardStudioInner />
    </React.Suspense>
  );
}
