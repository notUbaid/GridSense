import React, { useCallback, useState } from 'react';
import { UploadCloud, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <motion.div
      className={cn(
        "group relative flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed transition-colors duration-200 ease-out overflow-hidden",
        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-50"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      animate={{
        scale: isDragActive ? 1.02 : 1,
        borderColor: isDragActive ? "var(--color-primary)" : "var(--color-border)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {isDragActive && (
        <motion.div 
          layoutId="dropzone-glow"
          className="absolute inset-0 bg-linear-to-tr from-primary/10 via-transparent to-primary/5 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      <input
        type="file"
        accept=".csv, text/csv, application/vnd.ms-excel"
        className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center justify-center space-y-4 text-center p-6">
        <motion.div 
          className={cn(
            "rounded-full p-4 transition-colors duration-200",
            isDragActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}
          animate={{
            y: isDragActive ? [0, -8, 0] : 0,
            scale: isDragActive ? 1.1 : 1,
          }}
          transition={{
            y: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
            scale: { type: "spring", stiffness: 400, damping: 10 }
          }}
        >
          <UploadCloud className="h-6 w-6" />
        </motion.div>
        <div className="space-y-1.5 relative z-10">
          <p className="text-sm font-medium leading-none text-foreground">Click or drag CSV to upload</p>
          <p className="text-sm text-muted-foreground">Any column format is supported.</p>
        </div>
      </div>
    </motion.div>
  );
}

const TEST_FILES = [
  'facebook_lead_ads_export.csv',
  'google_ads_lead_export.csv',
  'real_estate_crm_export.csv',
  'marketing_agency_lead_sheet.csv',
  'sales_team_excel.csv',
  'hospital_inquiry_leads.csv',
  'university_admission_enquiries.csv',
  'manufacturing_company_contacts.csv',
  'startup_internal_spreadsheet.csv',
  'international_dataset.csv',
  'customers-1000.csv',
  'large_dataset.csv',
  'absolute_nightmare_dataset.csv',
];

export function SampleCsvButton({ onFileAccepted }: { onFileAccepted: (file: File) => void }) {
  const [loading, setLoading] = useState(false);

  const handleLoadSample = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/test_files/${filename}`);
      if (!res.ok) throw new Error('Failed to fetch test file');
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'text/csv' });
      onFileAccepted(file);
    } catch (e) {
      console.error(e);
      alert('Failed to load sample file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-dashed disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'No CSV? Try a sample dataset'}
        <ChevronDown className="ml-1 h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64 max-h-[300px] overflow-y-auto">
        {TEST_FILES.map((file) => (
          <DropdownMenuItem 
            key={file} 
            onClick={() => handleLoadSample(file)}
            className="cursor-pointer text-xs"
          >
            {file.replace('.csv', '').replace(/_/g, ' ')}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
