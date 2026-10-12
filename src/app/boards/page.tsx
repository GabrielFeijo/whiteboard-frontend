'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth-store';
import { apiFetch } from '../../lib/api/client';
import { ShareModal } from '../../components/share-modal';
import { Role } from '../../shared';

interface BoardItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  memberCount: number;
}

export default function BoardsPage() {
  const router = useRouter();
  const { user, isInitialized, init, logout } = useAuthStore();
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sharingBoard, setSharingBoard] = useState<BoardItem | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const reloadBoards = async () => {
    try {
      const res = await apiFetch<{ items: BoardItem[] }>('/boards');
      setBoards(res.items);
    } catch {
      // Handled by client
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    let ignore = false;
    apiFetch<{ items: BoardItem[] }>('/boards')
      .then((res) => {
        if (!ignore) {
          setBoards(res.items);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [isInitialized, user, router]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await apiFetch<BoardItem>('/boards', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setNewTitle('');
      setIsCreating(false);
      router.push(`/board/${created.id}`);
    } catch {
      // Show error
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await apiFetch(`/boards/${id}/duplicate`, { method: 'POST' });
    reloadBoards();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this board?')) {
      await apiFetch(`/boards/${id}`, { method: 'DELETE' });
      setBoards(boards.filter((b) => b.id !== id));
    }
  };

  if (!isInitialized || (!user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Loading boards...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Navbar */}
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow">
            W
          </div>
          <span className="text-lg font-bold tracking-tight">Whiteboard Studio</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-zinc-500">{user?.email}</p>
          </div>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your Whiteboards</h1>
            <p className="text-sm text-zinc-500">Create, collaborate, and organize your ideas</p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            + New Board
          </button>
        </div>

        {/* Create Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Create New Board</h2>
              <form onSubmit={handleCreateBoard} className="mt-4 space-y-4">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Board Title (e.g. Sprint Roadmap)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Boards Grid */}
        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading your boards...</p>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-800">
              <p className="text-zinc-500">No boards yet.</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                Create your first whiteboard
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {board.role}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(board.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                      {board.title}
                    </h3>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingBoard(board);
                      }}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Share
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        title="Duplicate"
                        onClick={(e) => handleDuplicate(board.id, e)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      >
                        ❐
                      </button>
                      {board.role === 'OWNER' && (
                        <button
                          title="Delete"
                          onClick={(e) => handleDelete(board.id, e)}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {sharingBoard && (
        <ShareModal
          boardId={sharingBoard.id}
          boardTitle={sharingBoard.title}
          isOpen={true}
          onClose={() => setSharingBoard(null)}
        />
      )}
    </div>
  );
}
