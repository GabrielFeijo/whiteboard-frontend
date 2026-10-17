"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/shared";
import { EyeIcon } from "@/components/icons";
import type { SyncProvider } from "@/collab/sync-provider";
import { useI18n } from "@/i18n/context";

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
          name: state.user.name || t("studio.collaborators.anonymous"),
          color: state.user.color || "#3b82f6",
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
    <div className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-surface-raised/95 px-2 py-1 shadow-xs backdrop-blur-md">
      <div className="flex -space-x-1.5 overflow-hidden">
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
            ? ` - ${t("studio.collaborators.you")}`
            : isFollowing
              ? ` - ${t("studio.collaborators.clickToUnfollow")}`
              : ` - ${t("studio.collaborators.clickToFollow")}`;

          return (
            <button
              key={c.clientId}
              type="button"
              disabled={isMe}
              onClick={() => {
                if (isMe) return;
                onFollowUser?.(isFollowing ? null : c.clientId);
              }}
              title={`${c.name} (${c.role})${actionHint}`}
              className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white transition-all ring-1 ring-surface-raised ${
                isFollowing ? "scale-110 ring-2 ring-accent-primary z-10" : ""
              } ${isMe ? "cursor-default" : "cursor-pointer hover:scale-105"}`}
              style={{ backgroundColor: c.color }}
            >
              {initials}
              {isFollowing && (
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent-primary text-white shadow-2xs">
                  <EyeIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {followingClientId && (
        <button
          type="button"
          onClick={() => onFollowUser?.(null)}
          className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-accent-subtle text-accent-primary hover:opacity-80 transition-opacity"
        >
          {t("studio.collaborators.stopFollowing")}
        </button>
      )}
    </div>
  );
}
