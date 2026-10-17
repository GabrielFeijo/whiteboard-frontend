"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import {
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
  useShareLinksQuery,
} from "@/features/share/api/share-links.queries";
import {
  getShareRoleTranslationKey,
  shareLinkFormSchema,
  type ShareLinkFormData,
} from "@/features/share/schemas/share.schema";

export interface ShareLinkTabProps {
  boardId: string;
}

export function ShareLinkTab({ boardId }: ShareLinkTabProps) {
  const { t } = useI18n();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: links = [], isLoading: isLinksLoading } =
    useShareLinksQuery(boardId);
  const createMutation = useCreateShareLinkMutation(boardId);
  const revokeMutation = useRevokeShareLinkMutation(boardId);

  const { register, handleSubmit } = useForm<ShareLinkFormData>({
    resolver: zodResolver(shareLinkFormSchema),
    defaultValues: {
      role: "VIEWER",
      expiresHours: "",
    },
  });

  const onSubmitLink = async (data: ShareLinkFormData) => {
    try {
      const hours = data.expiresHours ? parseInt(data.expiresHours, 10) : undefined;
      const res = await createMutation.mutateAsync({
        role: data.role,
        expiresInHours: hours,
      });
      setCreatedToken(res.token);
    } catch {
      toast.error(t("common.status.error"));
    }
  };

  const fullShareUrl = createdToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/board/${boardId}?token=${createdToken}`
    : "";

  const copyToClipboard = () => {
    if (!fullShareUrl) return;
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    toast.success(t("common.toasts.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmitLink)}
        className="flex flex-col gap-2"
      >
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            {...register("role")}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
          >
            <option value="VIEWER">{t("shareModal.permissions.canView")}</option>
            <option value="EDITOR">{t("shareModal.permissions.canEdit")}</option>
          </select>

          <select
            {...register("expiresHours")}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
          >
            <option value="">{t("shareModal.linkTab.expiration.never")}</option>
            <option value="1">{t("shareModal.linkTab.expiration.oneHour")}</option>
            <option value="24">{t("shareModal.linkTab.expiration.twentyFourHours")}</option>
            <option value="168">{t("shareModal.linkTab.expiration.sevenDays")}</option>
          </select>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={createMutation.isPending}
            className="flex-1"
          >
            {createMutation.isPending
              ? t("shareModal.linkTab.actions.generating")
              : t("shareModal.linkTab.actions.create")}
          </Button>
        </div>
      </form>

      {createdToken && (
        <div className="mt-3 rounded-xl border border-accent-primary/30 bg-accent-subtle/50 p-3">
          <p className="text-[11px] font-semibold text-accent-primary">
            {t("shareModal.linkTab.status.createdNotice")}
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
              {copied
                ? t("shareModal.linkTab.actions.copied")
                : t("shareModal.linkTab.actions.copy")}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-text-secondary">
          {t("shareModal.linkTab.status.activeLinksTitle")}
        </h3>
        <div className="mt-2 max-h-36 overflow-y-auto divide-y divide-border-subtle">
          {isLinksLoading ? (
            <p className="py-2 text-center text-xs text-text-muted">
              {t("shareModal.linkTab.status.loading")}
            </p>
          ) : links.length === 0 ? (
            <p className="py-2 text-center text-xs text-text-muted">
              {t("shareModal.linkTab.status.empty")}
            </p>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div>
                  <Badge
                    variant={link.role === "EDITOR" ? "success" : "neutral"}
                  >
                    {t(getShareRoleTranslationKey(link.role))}
                  </Badge>
                  <span className="ml-2 text-text-muted">
                    {link.expiresAt
                      ? t("shareModal.linkTab.expiration.expiresIn", {
                          time: new Date(link.expiresAt).toLocaleDateString(
                            t("common.app.dateLocale"),
                          ),
                        })
                      : t("shareModal.linkTab.expiration.never")}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => revokeMutation.mutate(link.id)}
                  disabled={revokeMutation.isPending}
                  className="text-red-500 hover:text-red-600"
                >
                  {t("shareModal.linkTab.actions.revoke")}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
