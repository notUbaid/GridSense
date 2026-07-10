import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ResultsTable } from '@/components/results/ResultsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmRecord } from '@/types/schema';
import { ActivityLog } from '@/hooks/useProcessing';
import { Clock, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProgressCardProps {
  progress: number;
  processedRows: number;
  skippedRows: number;
  records: CrmRecord[];
  currentActivity: string;
  activityLogs: ActivityLog[];
  elapsedMs: number;
  etaMs: number | null;
  totalRows: number;
}

function formatTime(ms: number) {
  if (ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressCard({ progress, processedRows, skippedRows, records, currentActivity, activityLogs, elapsedMs, etaMs, totalRows }: ProgressCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityLogs]);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Processing Extraction</CardTitle>
              <CardDescription className="text-sm mt-1 max-w-[80%]">
                <span className="inline-block animate-pulse text-primary">{currentActivity}</span>
              </CardDescription>
            </div>
            
            <div className="flex space-x-4 text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border/50">
              <div className="flex flex-col items-end">
                <span className="text-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(elapsedMs)}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">Elapsed</span>
              </div>
              <div className="w-px h-6 bg-border mx-2" />
              <div className="flex flex-col items-start">
                <span className="text-foreground flex items-center gap-1"><Timer className="w-3 h-3" /> {etaMs !== null ? formatTime(etaMs) : '--:--'}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-70">Remaining</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-sm font-medium text-muted-foreground gap-1">
            <span>
              {processedRows} / {totalRows} records processed
              {skippedRows > 0 && <span className="opacity-70 ml-1">({skippedRows} instantly skipped)</span>}
            </span>
            <span className="text-foreground">{progress}% Complete</span>
          </div>

          <div className="mt-4 rounded-md bg-zinc-950 text-zinc-300 font-mono text-xs overflow-hidden border border-border/50 shadow-inner">
             <div className="flex items-center px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
               <span className="flex gap-1.5 mr-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
               </span>
               Background Extraction Process
             </div>
             <div ref={scrollRef} className="p-3 h-40 overflow-y-auto space-y-1.5 scroll-smooth">
               {activityLogs.map((log) => (
                 <div key={log.id} className="flex gap-2 leading-relaxed">
                   <span className="text-zinc-600 shrink-0">[{log.timestamp.toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                   <span className={
                     log.type === 'error' ? 'text-red-400' :
                     log.type === 'warning' ? 'text-amber-400' :
                     log.type === 'success' ? 'text-green-400' :
                     'text-zinc-300'
                   }>{log.message}</span>
                 </div>
               ))}
               {activityLogs.length === 0 && <span className="text-zinc-600 italic">Waiting for pipeline to start...</span>}
             </div>
          </div>
        </CardContent>
      </Card>
      
      {records.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extracted Records ({records.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResultsTable data={records} />
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        <Card className="border-border/50 bg-card shadow-sm overflow-hidden relative">
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-primary/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">Waiting for AI extraction...</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col">
              <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b bg-muted/5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-4 px-4 py-4 border-b last:border-0 opacity-60">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
