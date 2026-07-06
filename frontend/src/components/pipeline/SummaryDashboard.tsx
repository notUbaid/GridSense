import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResultsTable } from '@/components/results/ResultsTable';
import { AlertCircle, FileCheck2 } from 'lucide-react';
import { ProcessMetrics, ProcessState } from '@/hooks/useProcessing';
import { CrmRecord } from '@/types/schema';

interface SummaryDashboardProps {
  state: ProcessState;
  metrics: ProcessMetrics;
  records: CrmRecord[];
  onReset: () => void;
}

export function SummaryDashboard({ state, metrics, records, onReset }: SummaryDashboardProps) {
  const isPartial = state === 'partial_success';

  return (
      <Card className={cn("border-border/50 bg-card shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300")}>
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
            <Button onClick={onReset} variant="outline">Upload Another File</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50"></span>
                Total Input
              </p>
              <p className="text-2xl font-semibold tracking-tight">{metrics.totalRows}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                Extracted
              </p>
              <p className="text-2xl font-semibold tracking-tight">{metrics.successfulRows}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Skipped
              </p>
              <p className="text-2xl font-semibold tracking-tight">{metrics.skippedRows}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive"></span>
                Failed Batches
              </p>
              <p className="text-2xl font-semibold tracking-tight">{metrics.failedBatches}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-right">
            Processing time: {(metrics.processingTimeMs / 1000).toFixed(1)}s
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <ResultsTable data={records} />
        </CardContent>
      </Card>
    </div>
  );
}
