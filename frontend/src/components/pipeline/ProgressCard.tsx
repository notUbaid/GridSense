import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResultsTable } from '@/components/results/ResultsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmRecord } from '@/types/schema';
import { Clock, Timer } from 'lucide-react';

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
          <div className="relative">
            <Progress value={progress} className="h-2 w-full transition-all duration-300" />
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          </div>
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span>{records.length} / {totalRows} records mapped</span>
            <span className="text-foreground">{progress}% Complete</span>
          </div>
        </CardContent>
      </Card>
      
      {records.length > 0 ? (
        <Card className="border-border/50 bg-card shadow-sm overflow-hidden animate-in fade-in duration-500">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Extracted Records ({records.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResultsTable data={records} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
