import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFileAccepted, disabled }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.type === 'application/vnd.ms-excel') {
        onFileAccepted(file);
      } else {
        alert('Please upload a valid CSV file.');
      }
    }
  }, [disabled, onFileAccepted]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    if (e.target.files && e.target.files.length > 0) {
      onFileAccepted(e.target.files[0]);
    }
  }, [disabled, onFileAccepted]);

  return (
    <div
      className={cn(
        "group relative grid h-64 w-full cursor-pointer place-items-center rounded-2xl border-2 border-dashed transition-all hover:bg-muted/50",
        isDragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25",
        disabled && "pointer-events-none opacity-60"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".csv, text/csv, application/vnd.ms-excel"
        className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 transition-transform group-hover:scale-105 group-active:scale-95">
          <UploadCloud className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Click or drag CSV to upload</p>
          <p className="text-xs text-muted-foreground">Any column format is supported. AI will map it automatically.</p>
        </div>
      </div>
    </div>
  );
}
