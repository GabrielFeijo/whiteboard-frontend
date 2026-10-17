"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/features/auth/store/session-store";
import {
  createRegisterSchema,
  type RegisterFormData,
} from "@/features/auth/schemas/auth.schema";
import { AuthCardShell } from "./auth-card-shell";
import { PasswordField } from "./password-field";

export function RegisterForm() {
  const router = useRouter();
  const registerUser = useSessionStore((s) => s.register);
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);

  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser(data.email, data.password, data.name);
      router.push("/boards");
      router.refresh();
    } catch (err: unknown) {
      setServerError(
        getApiErrorMessage(err) || t("auth.errors.registerFailed"),
      );
    }
  };

  return (
    <AuthCardShell
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footerPrompt={t("auth.register.hasAccount")}
      footerLinkText={t("auth.register.signInLink")}
      footerLinkHref="/login"
    >
      {serverError && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="register-name"
          type="text"
          label={t("auth.fields.fullName")}
          placeholder="Alice Johnson"
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          id="register-email"
          type="email"
          label={t("auth.fields.email")}
          placeholder="alice@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          id="register-password"
          label={t("auth.fields.password")}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting
            ? t("auth.register.submitting")
            : t("auth.register.submit")}
        </Button>
      </form>
    </AuthCardShell>
  );
}
