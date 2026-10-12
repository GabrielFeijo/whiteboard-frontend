import React from "react";
import { IconProps } from "./types";

export function BrazilFlagIcon({ className = "h-3.5 w-5 shrink-0 rounded-xs shadow-xs" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="14" rx="2" fill="#009B3A" />
      <polygon points="10,2 18,7 10,12 2,7" fill="#FEDF00" />
      <circle cx="10" cy="7" r="3.2" fill="#002776" />
      <path d="M7.2 7.2C8 6.5 9.5 6.2 11.2 6.5" stroke="#FFFFFF" strokeWidth="0.6" strokeLinecap="round" />
    </svg>
  );
}
