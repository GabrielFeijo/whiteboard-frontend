import { z } from "zod";
import type { TranslateFn } from "@/i18n/translator";

export function buildCreateBoardSchema(t: TranslateFn) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(1, t("dashboard.createModal.validation.titleRequired"))
      .max(100, t("dashboard.createModal.validation.titleTooLong")),
  });
}

export type CreateBoardFormValues = z.infer<ReturnType<typeof buildCreateBoardSchema>>;
