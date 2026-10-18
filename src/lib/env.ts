import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:3001"),
  INTERNAL_API_URL: z.url().optional(),
  NEXT_PUBLIC_WS_URL: z.string().min(1).default("ws://localhost:3002"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  INTERNAL_API_URL: process.env.INTERNAL_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NODE_ENV: process.env.NODE_ENV,
});

export const env = parsedEnv.success
  ? parsedEnv.data
  : {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      INTERNAL_API_URL: undefined,
      NEXT_PUBLIC_WS_URL: "ws://localhost:3002",
      NODE_ENV: "development" as const,
    };

const serverBackendBaseUrl = env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL;
export const BACKEND_API_V1_URL = `${serverBackendBaseUrl.replace(/\/$/, "")}/v1`;
export const WS_COLLAB_URL = env.NEXT_PUBLIC_WS_URL;
export const BFF_API_BASE_PATH = "/api/v1";
