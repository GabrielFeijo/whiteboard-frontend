import type { Role } from "@/shared";
import type {
  InviteMemberEmailFormData,
  ShareLinkFormData,
} from "./schemas/share.schema";

export interface ShareLinkItem {
  id: string;
  role: Role;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreatedShareLink extends ShareLinkItem {
  boardId: string;
  token: string;
}

export type { InviteMemberEmailFormData, ShareLinkFormData };
