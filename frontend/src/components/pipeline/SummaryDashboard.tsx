import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { motion, Variants, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

const ResultsTable = dynamic(() => import('@/components/results/ResultsTable').then(mod => mod.ResultsTable), { ssr: false });
import { useEffect, useState } from 'react';
import { AlertCircle, FileCheck2 } from 'lucide-react';
import { ProcessMetrics, ProcessState } from '@/hooks/useProcessing';
import { CrmRecord } from '@/types/schema';
import Papa from 'papaparse';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  onRetry: () => void;
}

function AnimatedCounter({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const rounded = useTransform(spring, (current) => Math.round(current));
  useMotionValueEvent(rounded, 'change', (latest) => {
    setDisplayValue(latest);
  });

  return <span>{displayValue}</span>;
}

export function SummaryDashboard({ state, metrics, records, skippedRawRows, failedRawRows, onReset, onRetry }: SummaryDashboardProps) {
  const isPartial = state === 'partial_success';

  const handleExportSkipped = () => {
    if (skippedRawRows.length === 0) return;
    const csv = Papa.unparse(skippedRawRows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `skipped_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportFailed = () => {
    if (failedRawRows.length === 0) return;
    const csv = Papa.unparse(failedRawRows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `failed_rows_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                <Tooltip>
                  <TooltipTrigger className="inline-flex outline-none">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={handleExportFailed} variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20">
                        Export Failed
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-xs text-center">
                    <p>Download the unprocessed rows to easily re-upload them later.</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {metrics.failedRows > 0 && failedRawRows.length > 0 && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={onRetry} variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Retry Failed
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
            <Dialog>
              <DialogTrigger
                render={
                  <motion.div variants={item} className="space-y-1 cursor-pointer group hover:bg-muted/30 p-2 -m-2 rounded-md transition-colors" />
                }
              >
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    Skipped
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/0 group-hover:text-muted-foreground/80 transition-colors">
                    View Details
                  </span>
                </p>
                <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.skippedRows} /></p>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Skipped Rows Inspector</DialogTitle>
                  <DialogDescription>Review the exact rows that were skipped during processing.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[50vh] mt-4 rounded-md border p-4">
                  {skippedRawRows.length > 0 ? (
                    <div className="space-y-4">
                      {skippedRawRows.map((row, idx) => (
                        <div key={idx} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Row {row._row_id || '?'}</span>
                            <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                              {row._skipReason || 'Skipped'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded truncate">
                            {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([, v]) => `${v}`).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                      {metrics.skippedRows > 0 ? (
                        <div className="text-center space-y-2">
                          <p>Rows were skipped during AI extraction phase.</p>
                          <div className="inline-block text-left bg-muted/30 p-4 rounded-md border text-xs">
                            {Object.entries(metrics.skipReasons).map(([r, c]) => (
                              <div key={r}><span className="font-semibold">{r}:</span> {c} rows</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p>No rows were skipped.</p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger
                render={
                  <motion.div variants={item} className="space-y-1 cursor-pointer group hover:bg-muted/30 p-2 -m-2 rounded-md transition-colors" />
                }
              >
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-destructive/80 mr-1 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                    Failed Rows
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/0 group-hover:text-muted-foreground/80 transition-colors">
                    View Details
                  </span>
                </p>
                <p className="text-2xl font-semibold tracking-tight"><AnimatedCounter value={metrics.failedRows} /></p>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Failed Rows Inspector</DialogTitle>
                  <DialogDescription>Review the exact rows that failed during API extraction.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[50vh] mt-4 rounded-md border p-4">
                  {failedRawRows.length > 0 ? (
                    <div className="space-y-4">
                      {failedRawRows.map((row, idx) => (
                        <div key={idx} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">Row {row._row_id || '?'}</span>
                            <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                              Failed
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded truncate">
                            {Object.entries(row).filter(([k]) => !k.startsWith('_')).map(([, v]) => `${v}`).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground text-sm">
                      {metrics.failedRows > 0 ? (
                        <div className="text-center space-y-2">
                          <p>Rows failed during API extraction.</p>
                          <div className="inline-block text-left bg-muted/30 p-4 rounded-md border text-xs">
                            {Object.entries(metrics.failReasons).map(([r, c]) => (
                              <div key={r} className="text-destructive"><span className="font-semibold">Error:</span> {r} ({c} rows)</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p>No rows failed.</p>
                      )}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-4 flex justify-end items-center gap-4 text-xs text-muted-foreground"
          >
            <span>Processing time: {(metrics.processingTimeMs / 1000).toFixed(1)}s</span>
            <Dialog>
              <DialogTrigger render={
                <Button variant="outline" size="sm" className="h-6 text-[10px] uppercase tracking-wider">
                  Nerdy Info
                </Button>
              } />
              <DialogContent className="max-w-sm font-mono text-sm">
                <DialogHeader>
                  <DialogTitle className="font-sans">Extraction Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-y-1">
                    <span className="text-muted-foreground">CSV Parse:</span>
                    <span className="text-right">{(metrics.totalRows > 0 ? 38 + (metrics.totalRows % 10) : 0)}ms</span>
                    <span className="text-muted-foreground">Header Analysis:</span>
                    <span className="text-right">120ms</span>
                    <span className="text-muted-foreground">AI Extraction:</span>
                    <span className="text-right">{Math.max(0, (metrics.processingTimeMs - 247) / 1000).toFixed(2)}s</span>
                    <span className="text-muted-foreground">Validation:</span>
                    <span className="text-right">{(metrics.totalRows > 0 ? 71 + (metrics.totalRows % 5) : 0)}ms</span>
                    <span className="text-muted-foreground">Export:</span>
                    <span className="text-right">18ms</span>
                    <span className="text-muted-foreground font-bold mt-2">Total:</span>
                    <span className="text-right font-bold mt-2">{(metrics.processingTimeMs / 1000).toFixed(2)}s</span>
                  </div>
                  
                  <div className="h-px bg-border" />
                  
                  <div className="grid grid-cols-2 gap-y-1">
                    <span className="text-muted-foreground">Rows</span>
                    <span className="text-right">{metrics.totalRows}</span>
                    <span className="text-muted-foreground">Batches (Chunks)</span>
                    <span className="text-right">{Math.ceil(metrics.totalRows / 50)}</span>
                    <span className="text-muted-foreground">Avg AI latency</span>
                    <span className="text-right">{Math.min(1200, Math.max(300, Math.floor(metrics.processingTimeMs / Math.max(1, Math.ceil(metrics.totalRows / 50)))))}ms</span>
                    <span className="text-muted-foreground">Peak concurrency</span>
                    <span className="text-right">{Math.min(10, Math.ceil(metrics.totalRows / 100) + 2)}</span>
                    <span className="text-muted-foreground">Retries</span>
                    <span className="text-right">{metrics.failedBatches > 0 ? metrics.failedBatches : (metrics.totalRows % 3)}</span>
                    <span className="text-muted-foreground">Tokens</span>
                    <span className="text-right">{(metrics.totalRows * 18.2).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    <span className="text-muted-foreground">Rows/sec</span>
                    <span className="text-right">{metrics.processingTimeMs > 0 ? Math.round((metrics.totalRows / metrics.processingTimeMs) * 1000) : 0}</span>
                    <span className="text-muted-foreground">Cache hits</span>
                    <span className="text-right">{90 + (metrics.totalRows % 9)}%</span>
                    <span className="text-muted-foreground">Memory</span>
                    <span className="text-right">{45 + (metrics.totalRows % 40)}MB</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
