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
        "group relative flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-all duration-200 ease-out",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50"
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
      <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
        <div className={cn(
          "rounded-full p-4 transition-all duration-200",
          isDragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
        )}>
          <UploadCloud className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-none text-foreground">Click or drag CSV to upload</p>
          <p className="text-sm text-muted-foreground">Any column format is supported.</p>
        </div>
      </div>
    </div>
  );
}
