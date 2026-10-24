import { z } from "zod";
import type { TranslateFn } from "@/i18n/translator";

function createCredentialsFields(t: TranslateFn) {
  return {
    email: z
      .string()
      .min(1, t("auth.errors.emailRequired"))
      .pipe(z.email(t("auth.errors.emailInvalid"))),
    password: z.string().min(8, t("auth.errors.passwordMin")),
  };
}

export function createLoginSchema(t: TranslateFn) {
  return z.object(createCredentialsFields(t));
}

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(t: TranslateFn) {
  return z.object({
    name: z.string().trim().min(2, t("auth.errors.nameMin")),
    ...createCredentialsFields(t),
  });
}

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;
