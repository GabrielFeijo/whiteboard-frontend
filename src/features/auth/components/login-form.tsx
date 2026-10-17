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
  createLoginSchema,
  type LoginFormData,
} from "@/features/auth/schemas/auth.schema";
import { AuthCardShell } from "./auth-card-shell";
import { PasswordField } from "./password-field";

export function LoginForm() {
  const router = useRouter();
  const login = useSessionStore((s) => s.login);
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      router.push("/boards");
      router.refresh();
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err) || t("auth.errors.loginFailed"));
    }
  };

  return (
    <AuthCardShell
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footerPrompt={t("auth.login.noAccount")}
      footerLinkText={t("auth.login.createAccountLink")}
      footerLinkHref="/register"
    >
      {serverError && (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          id="login-email"
          type="email"
          label={t("auth.fields.email")}
          placeholder="seu@email.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordField
          id="login-password"
          label={t("auth.fields.password")}
          autoComplete="current-password"
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
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>
    </AuthCardShell>
  );
}
