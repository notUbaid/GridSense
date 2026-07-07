import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResultsTable } from '@/components/results/ResultsTable';
import { motion, Variants, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { AlertCircle, FileCheck2, Info } from 'lucide-react';
import { ProcessMetrics, ProcessState } from '@/hooks/useProcessing';
import { CrmRecord } from '@/types/schema';
import Papa from 'papaparse';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

interface SummaryDashboardProps {
  state: ProcessState;
  metrics: ProcessMetrics;
  records: CrmRecord[];
  skippedRawRows: Record<string, string>[];
  failedRawRows: Record<string, string>[];
  onReset: () => void;
}

function AnimatedCounter({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function SummaryDashboard({ state, metrics, records, skippedRawRows, failedRawRows, onReset }: SummaryDashboardProps) {
  const isPartial = state === 'partial_success';

  const handleExportSkipped = () => {
    if (skippedRawRows.length === 0) return;
    const csv = Papa.unparse(skippedRawRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skipped_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFailed = () => {
    if (failedRawRows.length === 0) return;
    const csv = Papa.unparse(failedRawRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `failed_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn("border-border/50 bg-card shadow-sm")}>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-full", isPartial ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary')}>
                {isPartial ? <AlertCircle className="h-5 w-5" /> : <FileCheck2 className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-xl">{isPartial ? 'Partial Extraction' : 'Extraction Complete'}</CardTitle>
                <CardDescription className="text-sm">
                  {isPartial 
                    ? 'Some batches failed due to network limits. Successful data is preserved below.'
                    : 'All rows processed successfully.'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {metrics.skippedRows > 0 && skippedRawRows.length > 0 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleExportSkipped} variant="secondary">
                    Export Skipped
                  </Button>
                </motion.div>
              )}
              {metrics.failedRows > 0 && failedRawRows.length > 0 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={handleExportFailed} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20">
                    Export Failed
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={onReset} variant="outline">Upload Another File</Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4"
          >
            <motion.div variants={item} className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                Total Input
              </p>
              <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.totalRows} /></p>
            </motion.div>
            <motion.div variants={item} className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Extracted
              </p>
              <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.successfulRows} /></p>
            </motion.div>
            <motion.div variants={item} className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Skipped
                <Tooltip>
                  <TooltipTrigger className="inline-flex outline-none">
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[250px] text-xs space-y-1">
                      {Object.keys(metrics.skipReasons).length > 0 ? (
                        Object.entries(metrics.skipReasons).map(([reason, count]) => (
                          <div key={reason} className="flex justify-between gap-4">
                            <span>{reason}:</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))
                      ) : (
                        <p>No rows were skipped.</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </p>
              <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.skippedRows} /></p>
            </motion.div>
            <motion.div variants={item} className="space-y-1">
              <p className="text-muted-foreground mb-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive/80 mr-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                Failed Rows
                <Tooltip>
                  <TooltipTrigger className="inline-flex outline-none">
                    <Info className="h-3 w-3 text-muted-foreground/70 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-[250px] text-xs space-y-1">
                      {Object.keys(metrics.failReasons).length > 0 ? (
                        Object.entries(metrics.failReasons).map(([reason, count], idx) => (
                          <div key={idx} className="text-destructive font-medium border-b border-border/50 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                            {Object.keys(metrics.failReasons).length === 1 
                              ? `All failed due to: ${reason}` 
                              : `${count} rows: ${reason}`}
                          </div>
                        ))
                      ) : (
                        <p>No rows failed.</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </p>
              <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.failedRows} /></p>
            </motion.div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-4 text-xs text-muted-foreground text-right"
          >
            Processing time: {(metrics.processingTimeMs / 1000).toFixed(1)}s
          </motion.div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, type: "spring" }}
      >
        <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <ResultsTable data={records} />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
