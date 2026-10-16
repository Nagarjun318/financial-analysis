import React from 'react';
const { useState, useRef, useEffect } = React;
import { Download, FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import type { ExportFormat } from '../utils/exportTable';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}

const OPTIONS: { format: ExportFormat; label: string; hint: string; Icon: typeof FileText }[] = [
  { format: 'csv', label: 'CSV', hint: 'Spreadsheet, comma-separated', Icon: FileText },
  { format: 'excel', label: 'Excel', hint: '.xlsx workbook', Icon: FileSpreadsheet },
  { format: 'pdf', label: 'PDF', hint: 'Via print → Save as PDF', Icon: FileDown },
];

/**
 * Reusable "Download" dropdown for inventory / shopping-list exports.
 */
const ExportMenu: React.FC<ExportMenuProps> = ({
  onExport,
  disabled = false,
  label = 'Download',
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open ]);

  const handlePick = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await onExport(format);
    } finally {
      setBusy(null);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? 'Nothing to download' : 'Download as CSV, Excel or PDF'}
        className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium shadow-sm transition-all hover:shadow-md hover:border-brand-primary/40 disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5 text-sm'
        } text-gray-700 dark:text-gray-200`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {label}
        <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-40 overflow-hidden animate-fadeIn">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Download as
          </div>
          {OPTIONS.map(({ format, label: optLabel, hint, Icon }) => (
            <button
              key={format}
              type="button"
              onClick={() => handlePick(format)}
              disabled={busy !== null}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-60"
            >
              <Icon className="h-4 w-4 text-brand-primary shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">
                  {busy === format ? 'Preparing…' : optLabel}
                </span>
                <span className="block text-xs text-gray-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
