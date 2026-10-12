'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api/client';
import { Role } from '../shared';

interface ShareLinkItem {
  id: string;
  role: Role;
  createdAt: string;
  expiresAt: string | null;
}

interface ShareModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ boardId, boardTitle, isOpen, onClose }: ShareModalProps) {
  const [links, setLinks] = useState<ShareLinkItem[]>([]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role>('VIEWER');
  const [expiresHours, setExpiresHours] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    apiFetch<ShareLinkItem[]>(`/boards/${boardId}/links`)
      .then((data) => {
        if (!ignore) {
          setLinks(data);
          setCreatedToken(null);
          setCopied(false);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/boards/${boardId}/links`, {
        method: 'POST',
        body: JSON.stringify({ role, expiresInHours: expiresHours }),
      });
      setCreatedToken(res.token);
      const updated = await apiFetch<ShareLinkItem[]>(`/boards/${boardId}/links`);
      setLinks(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (linkId: string) => {
    await apiFetch(`/boards/${boardId}/links/${linkId}`, { method: 'DELETE' });
    setLinks(links.filter((l) => l.id !== linkId));
  };

  const fullShareUrl = createdToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/board/${boardId}?token=${createdToken}`
    : '';

  const copyToClipboard = () => {
    if (fullShareUrl) {
      navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Share &quot;{boardTitle}&quot;</h2>
            <p className="text-xs text-zinc-500">Anyone with the link can access with selected role</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="VIEWER">Can View</option>
              <option value="EDITOR">Can Edit</option>
            </select>
            <select
              value={expiresHours ?? ''}
              onChange={(e) => setExpiresHours(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">Never Expires</option>
              <option value="24">Expires in 24 hours</option>
              <option value="168">Expires in 7 days</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Link'}
            </button>
          </div>

          {createdToken && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Link created! Copy and share:</p>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  readOnly
                  value={fullShareUrl}
                  className="flex-1 truncate rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-xs text-zinc-800 outline-none dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-200"
                />
                <button
                  onClick={copyToClipboard}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-emerald-500"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Links</h3>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {links.length === 0 ? (
                <p className="text-xs text-zinc-500">No active share links.</p>
              ) : (
                links.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-800/50"
                  >
                    <div>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">{link.role}</span>
                      <span className="ml-2 text-zinc-400">
                        {link.expiresAt ? `Expires: ${new Date(link.expiresAt).toLocaleDateString()}` : 'No expiry'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRevoke(link.id)}
                      className="text-red-500 hover:text-red-600 font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
