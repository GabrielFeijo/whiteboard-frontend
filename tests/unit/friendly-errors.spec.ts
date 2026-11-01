import { describe, expect, it, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getApiErrorMessage, ApiProblem } from "@/lib/api/client";
import { COOKIE_NAMES, setClientCookie } from "@/lib/cookies/cookie-storage";

describe("Friendly & Localized Error Messages Audit", () => {
  function createAxiosError(params: {
    status?: number;
    message?: string;
    data?: ApiProblem;
    code?: string;
  }): AxiosError<ApiProblem> {
    const error = new AxiosError<ApiProblem>(
      params.message ?? (params.status ? `Request failed with status code ${params.status}` : "AxiosError"),
      params.code,
      undefined,
      undefined,
      params.status
        ? {
            status: params.status,
            statusText: `Status ${params.status}`,
            headers: {},
            config: { headers: new AxiosHeaders() },
            data: params.data ?? {},
          }
        : undefined,
    );
    return error;
  }

  beforeEach(() => {
    // Default to Portuguese
    if (typeof document !== "undefined") {
      document.documentElement.lang = "pt-BR";
    }
    setClientCookie(COOKIE_NAMES.LOCALE, "pt");
  });

  describe("Sanitization of Raw Technical Leakage", () => {
    it("never returns raw 'Request failed with status code 403'", () => {
      const error = createAxiosError({ status: 403 });
      const msg = getApiErrorMessage(error);

      expect(msg).not.toContain("Request failed with status code");
      expect(msg).not.toContain("403");
      expect(msg).toBe("Você não possui permissão para acessar este recurso ou realizar esta ação.");
    });

    it("never returns raw 'Request failed with status code 404'", () => {
      const error = createAxiosError({ status: 404 });
      const msg = getApiErrorMessage(error);

      expect(msg).not.toContain("Request failed with status code");
      expect(msg).not.toContain("404");
      expect(msg).toBe("O recurso solicitado não foi encontrado ou não está mais disponível.");
    });

    it("masks internal 500 server errors and returns friendly guidance", () => {
      const error = createAxiosError({
        status: 500,
        message: "Internal server error",
        data: { message: "Internal server error" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).not.toContain("Internal server error");
      expect(msg).toBe("O servidor encontrou uma instabilidade temporária. Tente novamente em instantes.");
    });

    it("handles offline or network errors with clear connectivity advice", () => {
      const error = createAxiosError({
        message: "Network Error",
        code: "ERR_NETWORK",
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.");
    });

    it("strips technical exception names from plain Error instances", () => {
      const rawError = new Error("Request failed with status code 500");
      const msg = getApiErrorMessage(rawError);

      expect(msg).not.toContain("Request failed");
      expect(msg).toBe("Ocorreu um erro inesperado ao processar sua solicitação.");
    });
  });

  describe("Backend Domain Message Localization", () => {
    it("translates 'Access denied to board' to friendly Portuguese", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Access denied to board" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Você não possui permissão para acessar este quadro.");
    });

    it("translates 'Insufficient permissions: requires one of [owner]' to human owner message", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Insufficient permissions: requires one of [owner]" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Apenas o proprietário deste quadro pode realizar esta ação.");
    });

    it("translates 'Viewers cannot rename board' to friendly role notice", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Viewers cannot rename board" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Visualizadores não possuem permissão para renomear o quadro.");
    });

    it("translates 'Invalid or revoked share link'", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Invalid or revoked share link" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Este link de compartilhamento é inválido ou foi revogado.");
    });

    it("translates 'Share link has expired'", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Share link has expired" },
      });
      const msg = getApiErrorMessage(error);

      expect(msg).toBe("Este link de compartilhamento expirou.");
    });
  });

  describe("English Locale Support", () => {
    it("translates 'Access denied to board' to English", () => {
      const error = createAxiosError({
        status: 403,
        data: { message: "Access denied to board" },
      });
      const msg = getApiErrorMessage(error, undefined, "en");

      expect(msg).toBe("You do not have permission to access this whiteboard.");
    });

    it("translates status 403 without body to friendly English", () => {
      const error = createAxiosError({ status: 403 });
      const msg = getApiErrorMessage(error, undefined, "en");

      expect(msg).toBe("You do not have permission to access this resource or perform this action.");
    });

    it("translates status 404 without body to friendly English", () => {
      const error = createAxiosError({ status: 404 });
      const msg = getApiErrorMessage(error, undefined, "en");

      expect(msg).toBe("The requested resource was not found or is no longer available.");
    });
  });

  describe("Custom Human-Friendly Fallback", () => {
    it("preserves friendly caller fallback when error is unknown or uninformative", () => {
      const customFallback = "Não foi possível renomear o quadro.";
      const error = createAxiosError({ status: 400, message: "AxiosError" });

      const msg = getApiErrorMessage(error, customFallback);
      expect(msg).toBe(customFallback);
    });
  });
});
