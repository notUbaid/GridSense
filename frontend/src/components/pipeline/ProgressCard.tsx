import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ResultsTable } from '@/components/results/ResultsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmRecord } from '@/types/schema';
import { Clock, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProgressCardProps {
  progress: number;
  records: CrmRecord[];
  currentActivity: string;
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

export function ProgressCard({ progress, records, currentActivity, elapsedMs, etaMs, totalRows }: ProgressCardProps) {
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
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span>{records.length} / {totalRows} records mapped</span>
            <span className="text-foreground">{progress}% Complete</span>
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
