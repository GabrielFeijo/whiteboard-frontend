import { z } from "zod";
import { Role } from "@/shared";
import type { TranslationKey } from "@/i18n/translator";

export const shareLinkFormSchema = z.object({
  role: z.enum([Role.VIEWER, Role.EDITOR]),
  expiresHours: z.string().optional(),
});

export type ShareLinkFormData = z.infer<typeof shareLinkFormSchema>;

export const inviteMemberEmailSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum([Role.VIEWER, Role.EDITOR]),
});

export type InviteMemberEmailFormData = z.infer<typeof inviteMemberEmailSchema>;

export const inviteEmailSchema = inviteMemberEmailSchema;
export type InviteEmailFormValues = InviteMemberEmailFormData;

const SHARE_ROLE_TRANSLATION_KEYS: Record<Role, TranslationKey> = {
  [Role.OWNER]: "shareModal.roles.OWNER",
  [Role.EDITOR]: "shareModal.roles.EDITOR",
  [Role.VIEWER]: "shareModal.roles.VIEWER",
};

export function getShareRoleTranslationKey(role: Role): TranslationKey {
  return SHARE_ROLE_TRANSLATION_KEYS[role] ?? "shareModal.roles.VIEWER";
}
