"use client";

import { useI18n } from "@/i18n/context";

interface ColorSwatchPickerProps {
  label: string;
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
  customPickerTitle: string;
}

export function ColorSwatchPicker({
  label,
  colors,
  value,
  onChange,
  customPickerTitle,
}: ColorSwatchPickerProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="text-[11px] font-medium text-text-secondary">{label}</label>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {colors.map((color) => {
          const isTransparent = color === "transparent";
          const isSelected = value.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition-transform duration-100 ${
                isSelected
                  ? "scale-110 ring-2 ring-accent-primary ring-offset-1 ring-offset-surface"
                  : "border-border-strong hover:scale-105"
              }`}
              style={{ backgroundColor: isTransparent ? "transparent" : color }}
              title={isTransparent ? t("studio.inspector.fields.transparent") : color}
            >
              {isTransparent && (
                <div className="h-4 w-0.5 rotate-45 bg-red-500 rounded-full" />
              )}
            </button>
          );
        })}

        <label
          className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-conic-[from_0deg,red,yellow,lime,aqua,blue,magenta,red] hover:scale-105"
          title={customPickerTitle}
        >
          <input
            type="color"
            value={value === "transparent" ? "#ffffff" : value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
}
