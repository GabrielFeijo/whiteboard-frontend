'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../store/auth-store';
import { apiFetch } from '../../../lib/api/client';
import { Role } from '../../../shared';
import { SyncProvider } from '../../../collab/sync-provider';
import { CanvasEngine } from '../../../canvas/canvas-engine';
import { Toolbar } from '../../../components/toolbar';
import { PropertiesPalette } from '../../../components/properties-palette';
import { ZoomControls } from '../../../components/zoom-controls';
import { CollaboratorsList } from '../../../components/collaborators-list';
import { ConnectionBadge } from '../../../components/connection-status';
import { ShareModal } from '../../../components/share-modal';
import { ExportModal } from '../../../components/export-modal';
import { VersionHistoryModal } from '../../../components/version-history-modal';

interface BoardDetail {
  id: string;
  title: string;
  role: Role;
  ownerId: string;
}

const AVATAR_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
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
  const linkToken = searchParams.get('token') || undefined;

  const { user, isInitialized, init } = useAuthStore();

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  // Collab & Canvas references
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [provider, setProvider] = useState<SyncProvider | null>(null);
  const [engine, setEngine] = useState<CanvasEngine | null>(null);

  // Follow Presenter mode
  const [followingClientId, setFollowingClientId] = useState<number | null>(null);

  const localColor = getUserColor(user?.id);

  useEffect(() => {
    init();
  }, [init]);

  // Load Board details and initialize SyncProvider
  useEffect(() => {
    if (!isInitialized || !boardId) return;

    let ignore = false;

    async function setupBoardAndCollab() {
      try {
        // 1. Fetch board metadata
        const boardData = await apiFetch<BoardDetail>(`/boards/${boardId}`);
        if (ignore) return;
        setBoard(boardData);

        // 2. Initialize SyncProvider
        const sync = new SyncProvider(boardId, linkToken);

        sync.awareness.setLocalStateField('user', {
          id: user?.id || 'guest',
          name: user?.name || 'Guest User',
          email: user?.email,
          color: localColor,
          role: boardData.role,
        });

        if (ignore) {
          sync.destroy();
          return;
        }

        setProvider(sync);
        setLoading(false);
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to connect to board';
          setError(msg);
          setLoading(false);
        }
      }
    }

    setupBoardAndCollab();

    return () => {
      ignore = true;
    };
  }, [boardId, isInitialized, user, linkToken, localColor]);

  // Instantiate CanvasEngine once canvases and provider are ready
  useEffect(() => {
    if (
      !provider ||
      !board ||
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
      board.role,
      user?.id || 'guest',
    );

    // Initial broadcast of viewport
    canvasEngine.broadcastViewport();

    setEngine(canvasEngine);

    return () => {
      canvasEngine.destroy();
      setEngine(null);
    };
  }, [provider, board, user?.id]);

  // Follow Presenter awareness listener
  useEffect(() => {
    if (!provider || !engine || followingClientId === null) return;

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const targetState = states.get(followingClientId);
      if (targetState && targetState.viewport) {
        engine.setViewport(targetState.viewport.pan, targetState.viewport.zoom);
      }
    };

    provider.awareness.on('change', onAwarenessChange);
    // Apply immediate target viewport if available
    onAwarenessChange();

    return () => {
      provider.awareness.off('change', onAwarenessChange);
    };
  }, [provider, engine, followingClientId]);

  // Clean up provider on unmount
  useEffect(() => {
    return () => {
      if (provider) {
        provider.destroy();
      }
    };
  }, [provider]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-zinc-500">Connecting to whiteboard...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-lg dark:border-red-900/50 dark:bg-zinc-900">
          <h2 className="text-base font-bold text-red-600 dark:text-red-400">Connection Error</h2>
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
            {error || 'Could not join board workspace.'}
          </p>
          <button
            onClick={() => router.push('/boards')}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isReadOnly = board.role === 'VIEWER';

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none bg-slate-50 dark:bg-zinc-950">
      {/* 1. Canvas 3-Layer Container */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full">
        <canvas ref={bgCanvasRef} className="absolute inset-0 pointer-events-none" />
        <canvas ref={contentCanvasRef} className="absolute inset-0 pointer-events-none" />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
        />
      </div>

      {/* 2. Top Header Navigation Bar */}
      <header className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Back & Board Title */}
        <div className="flex items-center gap-3 pointer-events-auto rounded-2xl border border-zinc-200/80 bg-white/95 px-3.5 py-1.5 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
          <button
            onClick={() => router.push('/boards')}
            title="Back to boards"
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 max-w-48 truncate">
            {board.title}
          </h1>

          {isReadOnly && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Read-Only
            </span>
          )}
        </div>

        {/* Center: Top Toolbar */}
        <div className="pointer-events-auto">
          <Toolbar
            readOnly={isReadOnly}
            canUndo={!isReadOnly}
            canRedo={!isReadOnly}
            onUndo={() => engine?.undo()}
            onRedo={() => engine?.redo()}
          />
        </div>

        {/* Right: Status, Collaborators & Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {provider && <ConnectionBadge status={provider.status} />}

          <CollaboratorsList
            provider={provider}
            followingClientId={followingClientId}
            onFollowUser={(targetId) => setFollowingClientId(targetId)}
          />

          <div className="flex items-center gap-1 rounded-2xl border border-zinc-200/80 bg-white/95 p-1 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
            {/* Version History */}
            <button
              onClick={() => setShowHistoryModal(true)}
              title="Version History"
              className="rounded-xl p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            </button>

            {/* Export */}
            <button
              onClick={() => setShowExportModal(true)}
              title="Export Canvas (PNG / SVG)"
              className="rounded-xl p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>

            {/* Share */}
            {board.role === 'OWNER' && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                </svg>
                <span>Share</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Floating Properties Palette (Left Side) */}
      {!isReadOnly && (
        <div className="absolute left-4 top-18 z-20">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowProperties(!showProperties)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/95 text-zinc-600 shadow-md backdrop-blur-md hover:bg-zinc-100 dark:border-zinc-800/80 dark:bg-zinc-900/95 dark:text-zinc-300"
              title="Toggle Style Palette"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </button>
          </div>
          {showProperties && (
            <div className="mt-2">
              <PropertiesPalette />
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Right: Zoom Controls */}
      <div className="absolute right-4 bottom-4 z-20">
        <ZoomControls
          onZoomIn={() => engine?.zoomIn()}
          onZoomOut={() => engine?.zoomOut()}
          onResetZoom={() => engine?.resetViewport()}
        />
      </div>

      {/* 5. Modals */}
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
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium text-zinc-500">Loading whiteboard workspace...</p>
          </div>
        </div>
      }
    >
      <BoardStudioInner />
    </React.Suspense>
  );
}
