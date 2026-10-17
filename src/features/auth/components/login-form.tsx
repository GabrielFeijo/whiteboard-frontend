"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
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
      const errorMsg = getApiErrorMessage(err) || t("auth.errors.loginFailed");
      setServerError(errorMsg);
      toast.error(errorMsg);
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
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in duration-150">
          <svg
            className="h-4 w-4 shrink-0 mt-0.5 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="leading-relaxed">{serverError}</span>
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
          leftIcon={
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
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
          className="w-full mt-2 h-11 text-sm font-semibold shadow-sm"
        >
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>
    </AuthCardShell>
  );
}
