"use client";

import { useState } from "react";
import * as Y from "yjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportBoardAsPng } from "@/features/export/services/png-exporter";
import { exportBoardAsSvg } from "@/features/export/services/svg-exporter";
import { useI18n } from "@/i18n/context";
import { useTheme } from "@/providers/theme-provider";

interface ExportModalProps {
  doc: Y.Doc;
  boardTitle: string;
  onClose: () => void;
}

export function ExportModal({ doc, boardTitle, onClose }: ExportModalProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);

  const isDarkTheme = theme === "dark";

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await exportBoardAsPng(doc, boardTitle, isDarkTheme);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = () => {
    setIsExporting(true);
    try {
      exportBoardAsSvg(doc, boardTitle, isDarkTheme);
      onClose();
    } finally {
      setIsExporting(false);
    }
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
            <h2 className="text-base font-bold text-text-primary">{t("exportModal.header.title")}</h2>
            <p className="mt-0.5 text-xs text-text-muted">{t("exportModal.header.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleExportPNG}
            disabled={isExporting}
            className="flex items-center justify-between rounded-xl border border-border-subtle p-3.5 text-left transition-all hover:border-accent-primary hover:bg-surface-hover active:scale-[0.99] shadow-2xs"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {t("exportModal.formats.png.title")}
              </p>
              <p className="text-xs text-text-muted">{t("exportModal.formats.png.description")}</p>
            </div>
            <Badge variant="default">.png</Badge>
          </button>

          <button
            type="button"
            onClick={handleExportSVG}
            disabled={isExporting}
            className="flex items-center justify-between rounded-xl border border-border-subtle p-3.5 text-left transition-all hover:border-accent-primary hover:bg-surface-hover active:scale-[0.99] shadow-2xs"
          >
            <div>
              <p className="text-sm font-semibold text-text-primary">
                {t("exportModal.formats.svg.title")}
              </p>
              <p className="text-xs text-text-muted">{t("exportModal.formats.svg.description")}</p>
            </div>
            <Badge variant="default">.svg</Badge>
          </button>
        </div>

        <div className="mt-5 flex justify-end pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.actions.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
