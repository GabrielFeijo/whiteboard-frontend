"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { useCreateBoardMutation } from "@/features/boards/api/boards.queries";
import {
  buildCreateBoardSchema,
  type CreateBoardFormValues,
} from "@/features/boards/schemas/board.schema";
import { useI18n } from "@/i18n/context";

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
    } catch {
      toast.error(t("common.toasts.boardCreateError"));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("dashboard.createModal.title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("dashboard.createModal.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
      </div>
    </div>
  );
}
