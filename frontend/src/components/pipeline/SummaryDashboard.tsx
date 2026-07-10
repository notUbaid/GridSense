import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { motion, Variants, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';

const ResultsTable = dynamic(() => import('@/components/results/ResultsTable').then(mod => mod.ResultsTable), { ssr: false });
import { useEffect, useState } from 'react';
import { AlertCircle, FileCheck2, Zap, Clock, Activity, Cpu, AlertTriangle, Database, Gauge, ServerCrash, Layers } from 'lucide-react';
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
  originalFilename: string | null;
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

export function SummaryDashboard({ state, metrics, originalFilename, records, skippedRawRows, failedRawRows, onReset, onRetry }: SummaryDashboardProps) {
  const isPartial = state === 'partial_success';

  const baseFilename = originalFilename ? originalFilename.replace(/\.[^/.]+$/, "") : "export";

  const handleExportSkipped = () => {
    if (skippedRawRows.length === 0) return;
    const csv = Papa.unparse(skippedRawRows);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${baseFilename} (skipped).csv`);
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
    link.setAttribute('download', `${baseFilename} (failed).csv`);
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
              <DialogContent className="max-w-2xl bg-card border-border/50 shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-6 py-4 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-blue-500/20 rounded-md">
                      <Cpu className="w-5 h-5 text-blue-500" />
                    </div>
                    <DialogTitle className="text-lg font-semibold tracking-tight">Extraction Details</DialogTitle>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-background/50 border border-border text-xs font-medium text-muted-foreground flex items-center space-x-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", metrics.isDeterministic ? "bg-green-400" : "bg-blue-400")}></span>
                      <span className={cn("relative inline-flex rounded-full h-2 w-2", metrics.isDeterministic ? "bg-green-500" : "bg-blue-500")}></span>
                    </span>
                    <span>{metrics.isDeterministic ? 'Deterministic Fast-Path' : 'AI Inference'}</span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Processing Time Breakdown */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Processing Timeline</h4>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">CSV Parsing</span>
                      <span className="font-mono font-medium">{metrics.parseTimeMs}ms</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Header Analysis</span>
                      <span className="font-mono font-medium">{metrics.mappingTimeMs}ms</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Core Extraction</span>
                      <span className="font-mono font-medium">{Math.max(0, (metrics.processingTimeMs - metrics.totalSleepMs - metrics.parseTimeMs - metrics.mappingTimeMs) / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Rate Limit Sleep</span>
                      <span className="font-mono font-medium text-amber-500">{(metrics.totalSleepMs / 1000).toFixed(2)}s</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-border/50 flex justify-between items-center">
                      <span className="font-medium text-sm">Total Time</span>
                      <span className="font-mono font-bold text-primary">{(metrics.processingTimeMs / 1000).toFixed(2)}s</span>
                    </div>
                  </div>

                  {/* Job Metrics */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Job Metrics</h4>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Total Input Rows</span>
                      <span className="font-mono font-medium truncate">{metrics.totalRows}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Processing Speed</span>
                      <span className="font-mono font-medium truncate">{metrics.processingTimeMs > 0 ? Math.round((metrics.totalRows / metrics.processingTimeMs) * 1000) : 0} rows/s</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Peak Concurrency</span>
                      <span className="font-mono font-medium truncate">{metrics.peakConcurrency} workers</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Batches Dispatched</span>
                      <span className="font-mono font-medium truncate">{metrics.batchesSent}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Avg API Latency</span>
                      <span className="font-mono font-medium truncate">{metrics.batchesSent > 0 ? Math.round((metrics.processingTimeMs - metrics.totalSleepMs) / Math.max(1, metrics.batchesSent)) : 0}ms</span>
                    </div>
                  </div>

                  {/* Errors & Retries */}
                  <div className="md:col-span-2 bg-muted/30 border border-border/50 rounded-xl p-4 flex items-center justify-between">
                     <div className="flex items-center space-x-6">
                        <div>
                          <div className="flex items-center space-x-1.5 mb-1">
                            <ServerCrash className="w-3.5 h-3.5 text-destructive" />
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Failed Rows</span>
                          </div>
                          <span className={cn("font-mono text-lg font-semibold", metrics.failedRows > 0 ? "text-destructive" : "text-foreground")}>{metrics.failedRows}</span>
                        </div>
                        <div className="h-8 w-px bg-border/50" />
                        <div>
                          <div className="flex items-center space-x-1.5 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">API Retries</span>
                          </div>
                          <span className={cn("font-mono text-lg font-semibold", metrics.totalRetries > 0 ? "text-amber-500" : "text-foreground")}>{metrics.totalRetries}</span>
                        </div>
                     </div>
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
            <div className="min-h-[400px]">
              <ResultsTable data={records} originalFilename={originalFilename} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
