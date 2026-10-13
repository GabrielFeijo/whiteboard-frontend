"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../../../store/auth-store";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../../components/language-switcher";
import { ThemeToggle } from "../../../components/ui/theme-toggle";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { t } = useI18n();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("auth.errors.emailRequired"))
          .email(t("auth.errors.emailInvalid")),
        password: z.string().min(8, t("auth.errors.passwordMin")),
      }),
    [t],
  );

  type LoginFormData = z.infer<typeof loginSchema>;

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
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : t("auth.errors.loginFailed"));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-canvas px-4 py-12 selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary text-white shadow-md mb-4 transition-transform hover:scale-105 active:scale-95">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h10M7 12h7M7 17h4" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t("auth.welcomeBack")}
          </h1>
          <p className="mt-1.5 text-xs text-text-muted">
            {t("auth.signInSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl border border-border-strong bg-surface p-7 shadow-xl">
          {serverError && (
            <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="login-email"
              type="email"
              label={t("auth.email")}
              placeholder="seu@email.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />

            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="block text-xs font-medium text-text-secondary">
                  {t("auth.password")}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-150 outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 shadow-2xs ${
                  errors.password
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    : "border-border-strong hover:border-text-secondary/50"
                }`}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              {isSubmitting ? t("auth.signingIn") : t("auth.signInButton")}
            </Button>
          </form>

          <div className="mt-6 border-t border-border-subtle pt-5 text-center text-xs text-text-muted">
            {t("auth.noAccount")}{" "}
            <Link
              href="/register"
              className="font-semibold text-accent-primary hover:underline"
            >
              {t("auth.createAccountLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
