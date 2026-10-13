"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "../shared";
import {
  useShareLinksQuery,
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
} from "../hooks/use-share-links";
import {
  useBoardMembersQuery,
  useAddBoardMemberMutation,
  useRemoveBoardMemberMutation,
} from "../hooks/use-boards";
import { useI18n } from "../i18n";
import { ConfirmDialog } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface ShareModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const shareFormSchema = z.object({
  role: z.enum(["VIEWER", "EDITOR"]),
  expiresHours: z.string().optional(),
});

const inviteEmailSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

type ShareFormData = z.infer<typeof shareFormSchema>;
type InviteEmailFormData = z.infer<typeof inviteEmailSchema>;

export function ShareModal({ boardId, boardTitle, isOpen, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"link" | "email">("link");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const { data: links = [], isLoading: isLinksLoading } = useShareLinksQuery(boardId, isOpen);
  const { data: members = [], isLoading: isMembersLoading } = useBoardMembersQuery(boardId, isOpen);

  const createMutation = useCreateShareLinkMutation(boardId);
  const revokeMutation = useRevokeShareLinkMutation(boardId);
  const addMemberMutation = useAddBoardMemberMutation(boardId);
  const removeMemberMutation = useRemoveBoardMemberMutation(boardId);

  const { register: registerLink, handleSubmit: handleSubmitLink } = useForm<ShareFormData>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      role: "VIEWER",
      expiresHours: "",
    },
  });

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    reset: resetEmailForm,
  } = useForm<InviteEmailFormData>({
    resolver: zodResolver(inviteEmailSchema),
    defaultValues: {
      email: "",
      role: "EDITOR",
    },
  });

  if (!isOpen) return null;

  const onSubmitLink = async (data: ShareFormData) => {
    const hours = data.expiresHours ? parseInt(data.expiresHours, 10) : undefined;
    const res = await createMutation.mutateAsync({
      role: data.role as Role,
      expiresInHours: hours,
    });
    setCreatedToken(res.token);
  };

  const onSubmitEmail = async (data: InviteEmailFormData) => {
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await addMemberMutation.mutateAsync({
        email: data.email,
        role: data.role as Role,
      });
      setInviteSuccess(t("shareModal.memberAdded"));
      resetEmailForm();
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch {
      setInviteError(t("shareModal.userNotFound"));
    }
  };

  const handleRevoke = async (linkId: string) => {
    await revokeMutation.mutateAsync(linkId);
  };

  const handleRemoveMember = (memberUserId: string) => {
    setRemovingMemberId(memberUserId);
  };

  const handleConfirmRemoveMember = async () => {
    if (!removingMemberId) return;
    await removeMemberMutation.mutateAsync(removingMemberId);
    setRemovingMemberId(null);
  };

  const fullShareUrl = createdToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/board/${boardId}?token=${createdToken}`
    : "";

  const copyToClipboard = () => {
    if (fullShareUrl) {
      navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("shareModal.title", { title: boardTitle })}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("shareModal.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex gap-1 rounded-lg border border-border-subtle bg-surface-raised p-1">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "link"
                ? "bg-surface text-text-primary shadow-2xs border border-border-subtle/80"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("shareModal.shareByLink")}
          </button>
          <button
            onClick={() => setActiveTab("email")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "email"
                ? "bg-surface text-text-primary shadow-2xs border border-border-subtle/80"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("shareModal.shareByEmail")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {activeTab === "link" ? (
            <div>
              <form onSubmit={handleSubmitLink(onSubmitLink)} className="flex flex-col gap-2">
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <select
                    {...registerLink("role")}
                    className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
                  >
                    <option value="VIEWER">{t("shareModal.canView")}</option>
                    <option value="EDITOR">{t("shareModal.canEdit")}</option>
                  </select>

                  <select
                    {...registerLink("expiresHours")}
                    className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
                  >
                    <option value="">{t("shareModal.neverExpires")}</option>
                    <option value="1">{t("shareModal.oneHour")}</option>
                    <option value="24">{t("shareModal.twentyFourHours")}</option>
                    <option value="168">{t("shareModal.sevenDays")}</option>
                  </select>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={createMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending ? t("shareModal.generating") : t("shareModal.createLink")}
                  </Button>
                </div>
              </form>

              {createdToken && (
                <div className="mt-3 rounded-xl border border-accent-primary/30 bg-accent-subtle/50 p-3">
                  <p className="text-[11px] font-semibold text-accent-primary">
                    {t("shareModal.linkCreated")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={fullShareUrl}
                      className="flex-1 rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-xs text-text-primary outline-none"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      {copied ? t("shareModal.copied") : t("shareModal.copy")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-xs font-semibold text-text-secondary">
                  {t("shareModal.activeLinks")}
                </h3>
                <div className="mt-2 max-h-36 overflow-y-auto divide-y divide-border-subtle">
                  {isLinksLoading ? (
                    <p className="py-2 text-center text-xs text-text-muted">{t("shareModal.loadingLinks")}</p>
                  ) : links.length === 0 ? (
                    <p className="py-2 text-center text-xs text-text-muted">{t("shareModal.noActiveLinks")}</p>
                  ) : (
                    links.map((link) => (
                      <div key={link.id} className="flex items-center justify-between py-2 text-xs">
                        <div>
                          <Badge variant={link.role === "EDITOR" ? "success" : "neutral"}>
                            {t(`shareModal.roles.${link.role}` as "shareModal.roles.VIEWER" | "shareModal.roles.EDITOR")}
                          </Badge>
                          <span className="ml-2 text-text-muted">
                            {link.expiresAt
                              ? t("shareModal.expiresIn", {
                                  time: new Date(link.expiresAt).toLocaleDateString(t("common.dateLocale")),
                                })
                              : t("shareModal.neverExpires")}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRevoke(link.id)}
                          disabled={revokeMutation.isPending}
                          className="text-red-500 hover:text-red-600"
                        >
                          {t("shareModal.revoke")}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <form onSubmit={handleSubmitEmail(onSubmitEmail)} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    {...registerEmail("email")}
                    placeholder={t("shareModal.emailPlaceholder")}
                    className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
                  />
                  <select
                    {...registerEmail("role")}
                    className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
                  >
                    <option value="EDITOR">{t("shareModal.canEdit")}</option>
                    <option value="VIEWER">{t("shareModal.canView")}</option>
                  </select>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending ? t("shareModal.invitingButton") : t("shareModal.inviteButton")}
                  </Button>
                </div>
              </form>

              {inviteError && (
                <p className="mt-2 text-xs font-medium text-red-500">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="mt-2 text-xs font-medium text-emerald-500">{inviteSuccess}</p>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-border-subtle">
            <h3 className="text-xs font-semibold text-text-secondary">
              {t("shareModal.membersTitle")}
            </h3>
            <div className="mt-2 max-h-40 overflow-y-auto divide-y divide-border-subtle">
              {isMembersLoading ? (
                <p className="py-2 text-center text-xs text-text-muted">{t("shareModal.loadingMembers")}</p>
              ) : members.length === 0 ? (
                <p className="py-2 text-center text-xs text-text-muted">{t("shareModal.noMembers")}</p>
              ) : (
                members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <span className="font-medium text-text-primary">
                        {m.user.name}
                      </span>
                      <span className="ml-1 text-[11px] text-text-muted">
                        ({m.user.email})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.role === "OWNER" ? "default" : m.role === "EDITOR" ? "success" : "neutral"}>
                        {t(`shareModal.roles.${m.role}` as "shareModal.roles.VIEWER" | "shareModal.roles.EDITOR" | "shareModal.roles.OWNER")}
                      </Badge>
                      {m.role !== "OWNER" && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removeMemberMutation.isPending}
                          className="text-red-500 hover:text-red-600"
                        >
                          {t("shareModal.removeMember")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(removingMemberId)}
        onOpenChange={(open) => {
          if (!open) setRemovingMemberId(null);
        }}
        title={t("shareModal.confirmRemoveMemberTitle")}
        description={t("shareModal.confirmRemoveMemberDescription")}
        cancelText={t("common.cancel")}
        confirmText={t("shareModal.confirmRemoveMemberAction")}
        variant="destructive"
        isLoading={removeMemberMutation.isPending}
        onConfirm={handleConfirmRemoveMember}
      />
    </div>
  );
}
