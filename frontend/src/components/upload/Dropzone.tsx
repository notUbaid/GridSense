import React, { useCallback, useState } from 'react';
import { UploadCloud, Megaphone, Building2, AlertTriangle, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

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
  { filename: 'facebook_lead_ads_export.csv', label: 'Facebook Leads', icon: Megaphone, color: 'text-blue-500' },
  { filename: 'google_ads_lead_export.csv', label: 'Google Ads', icon: Megaphone, color: 'text-amber-500' },
  { filename: 'real_estate_crm_export.csv', label: 'Real Estate CRM', icon: Building2, color: 'text-emerald-500' },
  { filename: 'absolute_nightmare_dataset.csv', label: 'Nightmare Dataset', icon: AlertTriangle, color: 'text-destructive' },

  { filename: 'sales_team_excel.csv', label: 'Sales Excel', icon: FileSpreadsheet, color: 'text-green-500' },
  { filename: 'marketing_agency_lead_sheet.csv', label: 'Marketing Agency', icon: FileText, color: 'text-pink-500' },
  { filename: 'hospital_inquiry_leads.csv', label: 'Hospital Leads', icon: Building2, color: 'text-rose-500' },
  { filename: 'university_admission_enquiries.csv', label: 'University Enquiries', icon: Building2, color: 'text-orange-500' },
  { filename: 'startup_internal_spreadsheet.csv', label: 'Startup Leads', icon: FileSpreadsheet, color: 'text-indigo-500' },
];

export function SampleCsvButton({ onFileAccepted }: { onFileAccepted: (file: File) => void }) {
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const handleLoadSample = async (filename: string) => {
    try {
      setLoadingFile(filename);
      const res = await fetch(`/test_files/${filename}`);
      if (!res.ok) throw new Error('Failed to fetch test file');
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'text/csv' });
      onFileAccepted(file);
    } catch (e) {
      console.error(e);
      alert('Failed to load sample file.');
    } finally {
      setLoadingFile(null);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3 pt-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Or try a sample dataset</p>
      <div className="w-full overflow-x-auto pb-4 pt-1 hide-scrollbar">
        <div className="flex w-max items-center space-x-2 px-1">
          {TEST_FILES.map(({ filename, label, icon: Icon, color }) => {
            const isLoading = loadingFile === filename;
            return (
              <motion.div key={filename} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loadingFile !== null}
                  onClick={() => handleLoadSample(filename)}
                  className="rounded-full h-8 px-3 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 bg-card/50 backdrop-blur-sm transition-all text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Icon className={cn("mr-2 h-3.5 w-3.5", color)} />
                  )}
                  {label}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
