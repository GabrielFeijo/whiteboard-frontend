import { z } from "zod";
import type { TranslateFn } from "@/i18n/translator";

export function createLoginSchema(t: TranslateFn) {
  return z.object({
    email: z
      .string()
      .min(1, t("auth.errors.emailRequired"))
      .email(t("auth.errors.emailInvalid")),
    password: z.string().min(8, t("auth.errors.passwordMin")),
  });
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(2, t("auth.errors.nameMin")),
    email: z
      .string()
      .min(1, t("auth.errors.emailRequired"))
      .email(t("auth.errors.emailInvalid")),
    password: z.string().min(8, t("auth.errors.passwordMin")),
  });
}

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;
