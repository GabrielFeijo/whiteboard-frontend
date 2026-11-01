import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { BACKEND_API_V1_URL, BFF_API_BASE_PATH, WS_COLLAB_URL } from "@/lib/env";
import { COOKIE_NAMES, getClientCookie } from "@/lib/cookies/cookie-storage";

export const API_URL = BACKEND_API_V1_URL;
export const WS_URL = WS_COLLAB_URL;

export const api = axios.create({
  baseURL: BFF_API_BASE_PATH,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const apiClient = api;

export interface ApiProblem {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ApiProblem | null,
  ) {
    const detail = Array.isArray(problem?.message)
      ? problem.message.join(", ")
      : problem?.message || problem?.error || `HTTP ${status}`;
    super(detail);
  }
}

const RAW_TECHNICAL_PATTERNS = [
  /Request failed with status code \d+/i,
  /Network Error/i,
  /AxiosError/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
  /timeout of \d+ms exceeded/i,
  /Internal server error/i,
  /Prisma/i,
  /P20\d\d/i,
  /\[object Object\]/i,
  /TypeError/i,
  /UnhandledPromise/i,
];

const KNOWN_ERROR_MAPPINGS: Record<string, { pt: string; en: string }> = {
  "Access denied to board": {
    pt: "Você não possui permissão para acessar este quadro.",
    en: "You do not have permission to access this whiteboard.",
  },
  "Invalid or revoked share link": {
    pt: "Este link de compartilhamento é inválido ou foi revogado.",
    en: "This share link is invalid or has been revoked.",
  },
  "Share link has expired": {
    pt: "Este link de compartilhamento expirou.",
    en: "This share link has expired.",
  },
  "Authentication or share link required": {
    pt: "É necessário entrar na sua conta ou utilizar um link de acesso válido.",
    en: "Sign in or a valid share link is required.",
  },
  "Board not found": {
    pt: "Quadro não encontrado ou não está mais disponível.",
    en: "Whiteboard not found or is no longer available.",
  },
  "User not found": {
    pt: "Usuário não encontrado.",
    en: "User not found.",
  },
  "User with this email already exists": {
    pt: "Já existe uma conta cadastrada com este e-mail.",
    en: "An account with this email already exists.",
  },
  "Invalid credentials": {
    pt: "E-mail ou senha incorretos. Verifique suas credenciais.",
    en: "Invalid email or password. Please check your credentials.",
  },
  "Invalid email or password": {
    pt: "E-mail ou senha incorretos. Verifique suas credenciais.",
    en: "Invalid email or password. Please check your credentials.",
  },
  "Resource already exists with conflicting unique constraint": {
    pt: "Este item já está cadastrado no sistema.",
    en: "This item is already registered in the system.",
  },
  "This resource already exists": {
    pt: "Este item já está cadastrado no sistema.",
    en: "This resource already exists.",
  },
  "Requested record was not found": {
    pt: "O registro solicitado não foi encontrado.",
    en: "The requested record was not found.",
  },
  "Invalid relation reference": {
    pt: "Referência inválida para esta operação.",
    en: "Invalid reference for this operation.",
  },
  "Viewers cannot rename board": {
    pt: "Visualizadores não possuem permissão para renomear o quadro.",
    en: "Viewers do not have permission to rename the whiteboard.",
  },
  "Only the board owner can delete it": {
    pt: "Apenas o proprietário do quadro pode excluí-lo.",
    en: "Only the whiteboard owner can delete it.",
  },
  "Only owner can add members directly": {
    pt: "Apenas o proprietário pode convidar ou adicionar membros diretamente.",
    en: "Only the owner can add members directly.",
  },
  "Only owner can remove members": {
    pt: "Apenas o proprietário pode remover membros do quadro.",
    en: "Only the owner can remove members from the whiteboard.",
  },
  "Only editors or owners can create share links": {
    pt: "Apenas editores ou o proprietário podem gerar links de compartilhamento.",
    en: "Only editors or the owner can create share links.",
  },
  "Only owner can revoke links": {
    pt: "Apenas o proprietário pode revogar links de compartilhamento.",
    en: "Only the owner can revoke share links.",
  },
  "Only owners and editors can create snapshots": {
    pt: "Apenas editores ou o proprietário podem salvar versões do quadro.",
    en: "Only editors or the owner can create version snapshots.",
  },
  "Only owners and editors can restore snapshots": {
    pt: "Apenas editores ou o proprietário podem restaurar versões anteriores.",
    en: "Only editors or the owner can restore previous versions.",
  },
  "Viewers cannot upload assets": {
    pt: "Visualizadores não possuem permissão para enviar imagens.",
    en: "Viewers do not have permission to upload images.",
  },
  "Stored asset MIME type is not allowed": {
    pt: "O formato do arquivo enviado não é suportado.",
    en: "The uploaded file format is not supported.",
  },
  "Unsupported asset MIME type": {
    pt: "Formato de imagem não suportado. Use PNG, JPEG, SVG ou WebP.",
    en: "Unsupported image format. Please use PNG, JPEG, SVG, or WebP.",
  },
};

const STATUS_FALLBACKS: Record<number, { pt: string; en: string }> = {
  400: {
    pt: "A solicitação contém dados inválidos. Verifique as informações e tente novamente.",
    en: "The request contains invalid data. Please verify and try again.",
  },
  401: {
    pt: "Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.",
    en: "Your session has expired or you are not signed in. Please sign in again.",
  },
  403: {
    pt: "Você não possui permissão para acessar este recurso ou realizar esta ação.",
    en: "You do not have permission to access this resource or perform this action.",
  },
  404: {
    pt: "O recurso solicitado não foi encontrado ou não está mais disponível.",
    en: "The requested resource was not found or is no longer available.",
  },
  409: {
    pt: "Já existe um registro com essas informações ou há um conflito de dados.",
    en: "A record with this information already exists or there is a data conflict.",
  },
  429: {
    pt: "Muitas tentativas em pouco tempo. Aguarde alguns instantes antes de tentar novamente.",
    en: "Too many requests. Please wait a moment before trying again.",
  },
  500: {
    pt: "O servidor encontrou uma instabilidade temporária. Tente novamente em instantes.",
    en: "The server encountered a temporary issue. Please try again shortly.",
  },
  502: {
    pt: "O serviço está temporariamente indisponível. Tente novamente em instantes.",
    en: "The service is temporarily unavailable. Please try again shortly.",
  },
  503: {
    pt: "O serviço está em manutenção ou sobrecarregado. Tente novamente em instantes.",
    en: "The service is under maintenance or overloaded. Please try again shortly.",
  },
};

const NETWORK_ERROR_MESSAGES = {
  pt: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
  en: "Unable to connect to the server. Please check your internet connection.",
};

const DEFAULT_GENERIC_FALLBACKS = {
  pt: "Ocorreu um erro inesperado ao processar sua solicitação.",
  en: "An unexpected error occurred while processing your request.",
};

export function resolveActiveLocale(): "pt" | "en" {
  if (typeof document !== "undefined") {
    const docLang = document.documentElement?.lang;
    if (docLang && docLang.toLowerCase().startsWith("en")) {
      return "en";
    }
    const cookie = getClientCookie(COOKIE_NAMES.LOCALE);
    if (cookie === "en") {
      return "en";
    }
  }
  return "pt";
}

function isRawTechnicalMessage(msg: string): boolean {
  return RAW_TECHNICAL_PATTERNS.some((pattern) => pattern.test(msg));
}

function translateDomainMessage(msg: string, locale: "pt" | "en"): string | null {
  if (KNOWN_ERROR_MAPPINGS[msg]) {
    return KNOWN_ERROR_MAPPINGS[msg][locale];
  }

  if (msg.includes("Insufficient permissions")) {
    if (msg.includes("[owner]")) {
      return locale === "pt"
        ? "Apenas o proprietário deste quadro pode realizar esta ação."
        : "Only the whiteboard owner can perform this action.";
    }
    return locale === "pt"
      ? "Apenas editores ou o proprietário deste quadro podem realizar esta ação."
      : "Only editors or the whiteboard owner can perform this action.";
  }

  return null;
}

function extractAxiosErrorMessage(
  error: AxiosError<ApiProblem>,
  fallback: string,
  targetLocale?: "pt" | "en",
): string {
  const locale = targetLocale ?? resolveActiveLocale();
  const isNetworkFailure =
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error" ||
    error.message?.toLowerCase().includes("timeout");

  if (isNetworkFailure) {
    return NETWORK_ERROR_MESSAGES[locale];
  }

  const data = error.response?.data;
  const rawMsg = data?.message
    ? Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message
    : data?.error;

  if (rawMsg) {
    const translated = translateDomainMessage(rawMsg, locale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(rawMsg)) {
      return rawMsg;
    }
  }

  if (fallback && !isRawTechnicalMessage(fallback) && fallback !== "An unexpected error occurred") {
    return fallback;
  }

  const status = error.response?.status;
  if (status && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status][locale];
  }

  return DEFAULT_GENERIC_FALLBACKS[locale];
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred",
  locale?: "pt" | "en",
): string {
  const activeLocale = locale ?? resolveActiveLocale();

  if (axios.isAxiosError<ApiProblem>(error)) {
    return extractAxiosErrorMessage(error, fallback, activeLocale);
  }

  if (error instanceof Error) {
    const translated = translateDomainMessage(error.message, activeLocale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(error.message)) {
      return error.message;
    }
  }

  if (typeof error === "string") {
    const translated = translateDomainMessage(error, activeLocale);
    if (translated) {
      return translated;
    }
    if (!isRawTechnicalMessage(error)) {
      return error;
    }
  }

  if (fallback && !isRawTechnicalMessage(fallback) && fallback !== "An unexpected error occurred") {
    return fallback;
  }

  return DEFAULT_GENERIC_FALLBACKS[activeLocale];
}

function parseRequestBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export interface ApiFetchOptions extends AxiosRequestConfig {
  body?: unknown;
}

export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
  const { body, ...config } = init || {};
  const data = config.data !== undefined ? config.data : parseRequestBody(body);

  const response = await api.request<T>({
    url: path.startsWith("/") ? path : `/${path}`,
    ...config,
    data,
  });
  return response.data;
}
