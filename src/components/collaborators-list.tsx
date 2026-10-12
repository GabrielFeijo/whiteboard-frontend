"use client";

import React, { useEffect, useState } from "react";
import { SyncProvider } from "../collab/sync-provider";
import { Role } from "../shared";
import { useI18n } from "../i18n";
import { EyeIcon } from "./icons";

interface CollaboratorInfo {
  clientId: number;
  name: string;
  color: string;
  role: Role;
  viewport?: { pan: { x: number; y: number }; zoom: number };
}

interface CollaboratorsListProps {
  provider: SyncProvider | null;
  onFollowUser?: (targetClientId: number | null) => void;
  followingClientId?: number | null;
}

export function CollaboratorsList({
  provider,
  onFollowUser,
  followingClientId,
}: CollaboratorsListProps) {
  const { t } = useI18n();
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  useEffect(() => {
    if (!provider) return;

    const updateCollaborators = () => {
      const states = provider.awareness.getStates();
      const list: CollaboratorInfo[] = [];

      states.forEach((state, clientId) => {
        if (!state.user) return;
        list.push({
          clientId,
          name: state.user.name || t("collaborators.anonymous"),
          color: state.user.color || "#6366f1",
          role: state.user.role || "VIEWER",
          viewport: state.viewport,
        });
      });

      setCollaborators(list);
    };

    updateCollaborators();
    provider.awareness.on("change", updateCollaborators);

    return () => {
      provider.awareness.off("change", updateCollaborators);
    };
  }, [provider, t]);

  if (!provider || collaborators.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/95 px-2.5 py-1 shadow-xs backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
      <div className="flex -space-x-2 overflow-hidden">
        {collaborators.map((c) => {
          const isMe = c.clientId === provider.doc.clientID;
          const isFollowing = followingClientId === c.clientId;
          const initials = c.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          const actionHint = isMe
            ? ` - ${t("collaborators.you")}`
            : isFollowing
              ? ` - ${t("collaborators.clickToUnfollow")}`
              : ` - ${t("collaborators.clickToFollow")}`;

          return (
            <button
              key={c.clientId}
              type="button"
              disabled={isMe}
              onClick={() => {
                if (isMe) return;
                if (onFollowUser) {
                  onFollowUser(isFollowing ? null : c.clientId);
                }
              }}
              title={`${c.name} (${c.role})${actionHint}`}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white transition ring-2 ring-white dark:ring-zinc-900 ${
                isFollowing ? "scale-110 ring-indigo-500 z-10" : ""
              } ${isMe ? "cursor-default" : "cursor-pointer hover:scale-105"}`}
              style={{ backgroundColor: c.color }}
            >
              {initials}
              {isFollowing && (
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xs">
                  <EyeIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {followingClientId && (
        <button
          onClick={() => onFollowUser?.(null)}
          className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
        >
          {t("collaborators.stopFollowing")}
        </button>
      )}
    </div>
  );
}
