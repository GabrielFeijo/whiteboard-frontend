import { z } from "zod";
import { Role } from "@/shared";
import type { TranslationKey } from "@/i18n/translator";

export const shareLinkFormSchema = z.object({
  role: z.enum(["VIEWER", "EDITOR"]),
  expiresHours: z.string().optional(),
});

export type ShareLinkFormData = z.infer<typeof shareLinkFormSchema>;

export const inviteMemberEmailSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["VIEWER", "EDITOR"]),
});

export type InviteMemberEmailFormData = z.infer<typeof inviteMemberEmailSchema>;

export const inviteEmailSchema = inviteMemberEmailSchema;
export type InviteEmailFormValues = InviteMemberEmailFormData;

export function getShareRoleTranslationKey(role: Role): TranslationKey {
  switch (role) {
    case "OWNER":
      return "shareModal.roles.OWNER";
    case "EDITOR":
      return "shareModal.roles.EDITOR";
    case "VIEWER":
    default:
      return "shareModal.roles.VIEWER";
  }
}
