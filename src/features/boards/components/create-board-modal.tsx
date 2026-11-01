"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { toast } from "@/components/ui/toast";
import { useCreateBoardMutation } from "@/features/boards/api/boards.queries";
import {
  buildCreateBoardSchema,
  type CreateBoardFormValues,
} from "@/features/boards/schemas/board.schema";
import { useI18n } from "@/i18n/context";
import { getApiErrorMessage } from "@/lib/api/client";

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBoardModal({ isOpen, onClose }: CreateBoardModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const createMutation = useCreateBoardMutation();

  const schema = useMemo(() => buildCreateBoardSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  });

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (formData: CreateBoardFormValues) => {
    try {
      const created = await createMutation.mutateAsync({ title: formData.title });
      toast.success(t("common.toasts.boardCreated"));
      reset();
      onClose();
      router.push(`/board/${created.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.toasts.boardCreateError")));
    }
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel={t("dashboard.createModal.title")}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary leading-tight">
            {t("dashboard.createModal.title")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted truncate">
            {t("dashboard.createModal.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("common.actions.close")}
          className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <Input
          id="board-title-input"
          autoFocus
          placeholder={t("dashboard.createModal.placeholder")}
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={createMutation.isPending}
          >
            {createMutation.isPending
              ? t("dashboard.createModal.submitting")
              : t("dashboard.createModal.submit")}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
