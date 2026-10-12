'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api/client';
import { Role } from '../shared';

interface SnapshotItem {
  id: string;
  version: number;
  reason: string;
  createdAt: string;
  size?: number;
}

interface VersionHistoryModalProps {
  boardId: string;
  userRole: Role;
  onClose: () => void;
  onRestored?: () => void;
}

export function VersionHistoryModal({
  boardId,
  userRole,
  onClose,
  onRestored,
}: VersionHistoryModalProps) {
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRestore = userRole === 'OWNER' || userRole === 'EDITOR';

  useEffect(() => {
    let ignore = false;
    apiFetch<SnapshotItem[]>(`/boards/${boardId}/snapshots`)
      .then((items) => {
        if (!ignore) {
          setSnapshots(items || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to load snapshots');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [boardId]);

  const handleRestore = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to restore this version? Current unsaved changes will be archived.')) {
      return;
    }
    setRestoringId(snapshotId);
    setError(null);
    try {
      await apiFetch(`/boards/${boardId}/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });
      if (onRestored) {
        onRestored();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      setError(msg);
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Version History
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Revert the whiteboard canvas back to any previously captured snapshot state.
        </p>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <p className="py-6 text-center text-xs text-zinc-400">Loading versions...</p>
          ) : snapshots.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              No historical snapshots captured yet. Snapshots are auto-created every 5 minutes during activity.
            </p>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="flex items-center justify-between py-3 px-1"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Version #{snap.version}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {snap.reason}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {new Date(snap.createdAt).toLocaleString()}
                  </p>
                </div>

                {canRestore && (
                  <button
                    onClick={() => handleRestore(snap.id)}
                    disabled={restoringId !== null}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {restoringId === snap.id ? 'Restoring...' : 'Restore'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
