"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Role } from "../shared";
import {
  useShareLinksQuery,
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
} from "../hooks/use-share-links";
import { useI18n } from "../i18n";

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

type ShareFormData = z.infer<typeof shareFormSchema>;

export function ShareModal({ boardId, boardTitle, isOpen, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: links = [], isLoading } = useShareLinksQuery(boardId, isOpen);
  const createMutation = useCreateShareLinkMutation(boardId);
  const revokeMutation = useRevokeShareLinkMutation(boardId);

  const { register, handleSubmit } = useForm<ShareFormData>({
    resolver: zodResolver(shareFormSchema),
    defaultValues: {
      role: "VIEWER",
      expiresHours: "",
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ShareFormData) => {
    const hours = data.expiresHours ? parseInt(data.expiresHours, 10) : undefined;
    const res = await createMutation.mutateAsync({
      role: data.role as Role,
      expiresInHours: hours,
    });
    setCreatedToken(res.token);
  };

  const handleRevoke = async (linkId: string) => {
    await revokeMutation.mutateAsync(linkId);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {t("shareModal.title", { title: boardTitle })}
            </h2>
            <p className="text-xs text-zinc-500">
              {t("shareModal.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              {...register("role")}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none transition focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="VIEWER">{t("shareModal.canView")}</option>
              <option value="EDITOR">{t("shareModal.canEdit")}</option>
            </select>

            <select
              {...register("expiresHours")}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none transition focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <option value="">{t("shareModal.neverExpires")}</option>
              <option value="1">{t("shareModal.oneHour")}</option>
              <option value="24">{t("shareModal.twentyFourHours")}</option>
              <option value="168">{t("shareModal.sevenDays")}</option>
            </select>

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {createMutation.isPending ? t("shareModal.generating") : t("shareModal.createLink")}
            </button>
          </div>
        </form>

        {createdToken && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <p className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
              {t("shareModal.linkCreated")}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullShareUrl}
                className="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              />
              <button
                onClick={copyToClipboard}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                {copied ? t("shareModal.copied") : t("shareModal.copy")}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {t("shareModal.activeLinks")}
          </h3>
          <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              <p className="py-4 text-center text-xs text-zinc-400">{t("shareModal.loadingLinks")}</p>
            ) : links.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">{t("shareModal.noActiveLinks")}</p>
            ) : (
              links.map((link) => (
                <div key={link.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {t(`shareModal.roles.${link.role}` as "shareModal.roles.VIEWER" | "shareModal.roles.EDITOR")}
                    </span>
                    <span className="ml-2 text-zinc-400">
                      {link.expiresAt
                        ? t("shareModal.expiresIn", {
                            time: new Date(link.expiresAt).toLocaleDateString(t("common.dateLocale")),
                          })
                        : t("shareModal.neverExpires")}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevoke(link.id)}
                    disabled={revokeMutation.isPending}
                    className="text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    {t("shareModal.revoke")}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
