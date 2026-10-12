import React from "react";
import { IconProps } from "./types";

export function USFlagIcon({ className = "h-3.5 w-5 shrink-0 rounded-xs shadow-xs" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" rx="2" fill="#B22234" />
      <rect y="1.08" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="3.24" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="5.4" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="7.56" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="9.72" width="20" height="1.08" fill="#FFFFFF" />
      <rect y="11.88" width="20" height="1.08" fill="#FFFFFF" />
      <rect width="8" height="7" rx="1" fill="#3C3B6E" />
      <circle cx="2.5" cy="2" r="0.6" fill="#FFFFFF" />
      <circle cx="5.5" cy="2" r="0.6" fill="#FFFFFF" />
      <circle cx="4" cy="3.5" r="0.6" fill="#FFFFFF" />
      <circle cx="2.5" cy="5" r="0.6" fill="#FFFFFF" />
      <circle cx="5.5" cy="5" r="0.6" fill="#FFFFFF" />
    </svg>
  );
}
