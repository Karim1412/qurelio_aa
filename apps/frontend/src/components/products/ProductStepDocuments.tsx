'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2 } from '@/components/icons';
import { Info } from '@/components/icons';
import { cn } from '@/utils/cn';

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ProductDocumentsData {
  files: UploadedFile[];
}

interface Props {
  data: ProductDocumentsData;
  onChange: (d: Partial<ProductDocumentsData>) => void;
}

export function ProductStepDocuments({ data, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      file: f,
      name: f.name,
      size: formatSize(f.size),
      status: 'pending' as const,
    }));
    onChange({ files: [...data.files, ...newFiles] });
  }, [data.files, onChange]);

  const removeFile = (i: number) => {
    onChange({ files: data.files.filter((_, idx) => idx !== i) });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Documents</h2>
      </div>

      <div className="callout-info flex items-start gap-3 rounded-xl border border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-primary)]" />
        <p className="text-[13px] leading-relaxed text-[var(--callout-info-text)]">
          These documents build this product&apos;s <strong>private Compliance Memory</strong> — the AI reads them to evaluate compliance. Upload the technical file, test reports, safety data sheets, SOPs, and any other evidence relevant to this product. <strong>All files pass the Legal Guardrail before ingestion.</strong>
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200',
          isDragOver
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
            : 'border-[var(--input-border)] bg-[var(--surface-muted)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--brand-primary)]/3'
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-[var(--muted)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Drop files here or click to browse</p>
        <p className="mt-1 text-[11px] text-[var(--muted)]">PDF, DOCX, XLSX, JPG, PNG, TIFF · Max 50 MB per file</p>
        <Button type="button" variant="outline" size="sm" className="mt-4 gap-2">
          <Upload className="h-4 w-4" />Browse files
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.tiff,.tif"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        className="hidden"
      />

      {/* File list */}
      {data.files.length > 0 && (
        <div className="space-y-2">
          {data.files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--surface)] px-4 py-3">
              <FileText className="h-8 w-8 shrink-0 text-[var(--brand-primary)]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{f.name}</p>
                <p className="text-[11px] text-[var(--muted)]">{f.size}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Pending</span>
              <button type="button" onClick={() => removeFile(i)} className="shrink-0 text-[var(--muted)] transition-hover hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
