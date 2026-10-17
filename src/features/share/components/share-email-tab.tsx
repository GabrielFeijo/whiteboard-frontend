"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAddBoardMember } from "@/features/boards/api/boards.queries";
import {
  inviteEmailSchema,
  type InviteEmailFormValues,
} from "@/features/share/schemas/share.schema";
import { useI18n } from "@/i18n/context";
import { Role } from "@/shared";

interface ShareEmailTabProps {
  boardId: string;
}

export function ShareEmailTab({ boardId }: ShareEmailTabProps) {
  const { t } = useI18n();

  const addMemberMutation = useAddBoardMember(boardId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteEmailFormValues>({
    resolver: zodResolver(inviteEmailSchema),
    defaultValues: {
      email: "",
      role: Role.EDITOR,
    },
  });

  const onSubmit = (values: InviteEmailFormValues) => {
    addMemberMutation.mutate(
      { email: values.email.trim(), role: values.role },
      {
        onSuccess: () => {
          const successMessage = t("shareModal.emailTab.feedback.inviteSent", {
            email: values.email.trim(),
          });
          toast.success(successMessage);
          reset({ email: "", role: values.role });
        },
        onError: (err: unknown) => {
          let errorMessage = t("shareModal.emailTab.feedback.inviteFailed");
          if (axios.isAxiosError(err)) {
            const msg = err.response?.data?.message as string | undefined;
            if (err.response?.status === 404) {
              errorMessage = t("shareModal.emailTab.feedback.userNotFound");
            } else if (msg) {
              errorMessage = msg;
            }
          }
          toast.error(errorMessage);
        },
      }
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="email"
            {...register("email")}
            placeholder={t("shareModal.emailTab.placeholder")}
            className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
          />
          <select
            {...register("role")}
            className="rounded-lg border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
          >
            <option value={Role.EDITOR}>{t("shareModal.permissions.canEdit")}</option>
            <option value={Role.VIEWER}>{t("shareModal.permissions.canView")}</option>
          </select>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={addMemberMutation.isPending}
          >
            {addMemberMutation.isPending
              ? t("shareModal.emailTab.actions.inviting")
              : t("shareModal.emailTab.actions.invite")}
          </Button>
        </div>
        {errors.email && (
          <p className="text-xs font-medium text-red-500">{t("common.validation.invalidEmail")}</p>
        )}
      </form>
    </div>
  );
}
