"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../../store/auth-store";
import {
  BoardItem,
  useBoardsQuery,
  useCreateBoardMutation,
  useDeleteBoardMutation,
  useDuplicateBoardMutation,
} from "../../hooks/use-boards";
import { ShareModal } from "../../components/share-modal";
import { useI18n } from "../../i18n";
import { LanguageSwitcher } from "../../components/language-switcher";

export default function BoardsPage() {
  const router = useRouter();
  const { user, isInitialized, init, logout } = useAuthStore();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [sharingBoard, setSharingBoard] = useState<BoardItem | null>(null);

  const { data, isLoading } = useBoardsQuery();
  const boards = data?.items || [];

  const createMutation = useCreateBoardMutation();
  const duplicateMutation = useDuplicateBoardMutation();
  const deleteMutation = useDeleteBoardMutation();

  const createBoardSchema = useMemo(
    () =>
      z.object({
        title: z
          .string()
          .trim()
          .min(1, t("dashboard.titleRequired"))
          .max(100, t("dashboard.titleTooLong")),
      }),
    [t],
  );

  type CreateBoardFormData = z.infer<typeof createBoardSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { title: "" },
  });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/login");
    }
  }, [isInitialized, user, router]);

  const onSubmitCreate = async (formData: CreateBoardFormData) => {
    const created = await createMutation.mutateAsync({ title: formData.title });
    reset();
    setIsCreating(false);
    router.push(`/board/${created.id}`);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await duplicateMutation.mutateAsync(id);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("dashboard.confirmDelete"))) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "OWNER":
        return t("dashboard.roles.owner");
      case "EDITOR":
        return t("dashboard.roles.editor");
      case "VIEWER":
      default:
        return t("dashboard.roles.viewer");
    }
  };

  if (!isInitialized || (!user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        {t("dashboard.loading")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t("dashboard.subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />

            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("nav.signedInAs")}{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{user?.name}</strong>
            </span>
            <button
              onClick={() => logout()}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {t("common.signOut")}
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-indigo-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("nav.newBoard")}
            </button>
          </div>
        </header>

        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t("dashboard.createNewBoard")}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {t("dashboard.createModalSubtitle")}
              </p>
              <form onSubmit={handleSubmit(onSubmitCreate)} className="mt-4 space-y-4">
                <div>
                  <input
                    type="text"
                    {...register("title")}
                    autoFocus
                    placeholder={t("dashboard.boardTitlePlaceholder")}
                    className="w-full rounded-xl border border-zinc-300 px-3.5 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.title.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setIsCreating(false);
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {createMutation.isPending ? t("dashboard.creatingButton") : t("dashboard.createButton")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-8">
          {isLoading ? (
            <p className="text-sm text-zinc-400">{t("dashboard.loading")}</p>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 dark:border-zinc-800">
              <p className="text-zinc-500">{t("dashboard.noBoards")}</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                {t("dashboard.createFirst")}
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => router.push(`/board/${board.id}`)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:border-indigo-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-500"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {getRoleLabel(board.role)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(board.updatedAt).toLocaleDateString(t("common.dateLocale"))}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-semibold text-zinc-900 group-hover:text-indigo-600 dark:text-zinc-100 dark:group-hover:text-indigo-400">
                      {board.title}
                    </h3>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharingBoard(board);
                      }}
                      className="rounded-md px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {t("dashboard.share")}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDuplicate(board.id, e)}
                        title={t("common.duplicate")}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </button>

                      {board.role === "OWNER" && (
                        <button
                          onClick={(e) => handleDelete(board.id, e)}
                          title={t("common.delete")}
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {sharingBoard && (
        <ShareModal
          isOpen={Boolean(sharingBoard)}
          boardId={sharingBoard.id}
          boardTitle={sharingBoard.title}
          onClose={() => setSharingBoard(null)}
        />
      )}
    </div>
  );
}
