"use client";

import type React from "react";
import { useRef, useState } from "react";
import * as Y from "yjs";

import { Upload, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { exportBoardAsPng } from "@/features/export/services/png-exporter";
import { exportBoardAsSvg } from "@/features/export/services/svg-exporter";
import {
  exportBoardAsJson,
  importBoardFromJson,
} from "@/features/export/services/json-exporter";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { useTheme } from "@/providers/theme-provider";

interface ExportModalProps {
  doc: Y.Doc;
  boardTitle: string;
  onClose: () => void;
}

type ExportFormatId = "png" | "svg" | "json";

const EXPORT_FORMATS: ReadonlyArray<{
  id: ExportFormatId;
  extension: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
}> = [
  {
    id: "png",
    extension: ".png",
    titleKey: "exportModal.formats.png.title",
    descriptionKey: "exportModal.formats.png.description",
  },
  {
    id: "svg",
    extension: ".svg",
    titleKey: "exportModal.formats.svg.title",
    descriptionKey: "exportModal.formats.svg.description",
  },
  {
    id: "json",
    extension: ".json",
    titleKey: "exportModal.formats.json.title",
    descriptionKey: "exportModal.formats.json.description",
  },
];

export function ExportModal({ doc, boardTitle, onClose }: ExportModalProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDarkTheme = theme === "dark";

  const handleExport = async (format: ExportFormatId) => {
    setIsExporting(true);
    try {
      if (format === "png") {
        await exportBoardAsPng(doc, boardTitle, isDarkTheme);
      } else if (format === "svg") {
        exportBoardAsSvg(doc, boardTitle, isDarkTheme);
      } else {
        exportBoardAsJson(doc, boardTitle);
      }
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        const result = importBoardFromJson(doc, content);
        if (result.success) {
          toast.success(
            t("exportModal.import.success", { count: result.count }),
          );
          onClose();
        } else {
          toast.error(result.error || t("exportModal.import.error"));
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl border border-border-strong">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("exportModal.header.title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("exportModal.header.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          {EXPORT_FORMATS.map(({ id, extension, titleKey, descriptionKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => void handleExport(id)}
              disabled={isExporting}
              className="flex items-center justify-between rounded-xl border border-border-subtle p-3.5 text-left transition-all hover:border-accent-primary hover:bg-surface-hover active:scale-[0.99] shadow-2xs"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {t(titleKey)}
                </p>
                <p className="text-xs text-text-muted">{t(descriptionKey)}</p>
              </div>
              <Badge variant="default">{extension}</Badge>
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileImport}
        />

        <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{t("exportModal.import.button")}</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.actions.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
