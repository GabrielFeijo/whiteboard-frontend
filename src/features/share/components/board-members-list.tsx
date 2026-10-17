"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import {
  useBoardMembers,
  useRemoveBoardMember,
  type BoardMember,
} from "@/features/boards/api/boards.queries";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/translator";

const ROLE_TRANSLATION_MAP: Record<BoardMember["role"], TranslationKey> = {
  OWNER: "shareModal.roles.OWNER",
  EDITOR: "shareModal.roles.EDITOR",
  VIEWER: "shareModal.roles.VIEWER",
};

interface BoardMembersListProps {
  boardId: string;
}

export function BoardMembersList({ boardId }: BoardMembersListProps) {
  const { t } = useI18n();
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useBoardMembers(boardId, true);
  const removeMemberMutation = useRemoveBoardMember(boardId);

  const handleConfirmRemove = () => {
    if (!removingMemberId) return;
    removeMemberMutation.mutate(removingMemberId, {
      onSuccess: () => {
        toast.success(t("shareModal.members.remove"));
      },
      onError: () => {
        toast.error(t("common.status.error"));
      },
      onSettled: () => setRemovingMemberId(null),
    });
  };

  return (
    <div className="pt-3 border-t border-border-subtle">
      <h3 className="text-xs font-semibold text-text-secondary">
        {t("shareModal.members.title")}
      </h3>
      <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-border-subtle">
        {isLoading ? (
          <p className="py-2 text-center text-xs text-text-muted">
            {t("shareModal.members.loading")}
          </p>
        ) : members.length === 0 ? (
          <p className="py-2 text-center text-xs text-text-muted">
            {t("shareModal.members.empty")}
          </p>
        ) : (
          members.map((member) => (
            <div key={member.userId} className="flex items-center justify-between py-2 text-xs">
              <div>
                <span className="font-medium text-text-primary">{member.user.name}</span>
                <span className="ml-1 text-[11px] text-text-muted">({member.user.email})</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    member.role === "OWNER"
                      ? "default"
                      : member.role === "EDITOR"
                        ? "success"
                        : "neutral"
                  }
                >
                  {t(ROLE_TRANSLATION_MAP[member.role])}
                </Badge>
                {member.role !== "OWNER" && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setRemovingMemberId(member.userId)}
                    disabled={removeMemberMutation.isPending}
                    className="text-red-500 hover:text-red-600"
                  >
                    {t("shareModal.members.remove")}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removingMemberId)}
        onOpenChange={(open) => {
          if (!open) setRemovingMemberId(null);
        }}
        title={t("shareModal.members.confirmRemove.title")}
        description={t("shareModal.members.confirmRemove.description")}
        cancelText={t("common.actions.cancel")}
        confirmText={t("shareModal.members.confirmRemove.confirm")}
        variant="destructive"
        isLoading={removeMemberMutation.isPending}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
