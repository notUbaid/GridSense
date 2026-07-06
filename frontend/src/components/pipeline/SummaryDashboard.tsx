import React from 'react';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className={`shadow-lg border ${isPartial ? 'border-amber-500/50' : 'border-emerald-500/50'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isPartial ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {isPartial ? <AlertCircle className="h-6 w-6" /> : <FileCheck2 className="h-6 w-6" />}
              </div>
              <div>
                <CardTitle className="text-2xl">{isPartial ? 'Partial Extraction Complete' : 'Extraction Complete'}</CardTitle>
                <CardDescription>
                  {isPartial 
                    ? 'Some batches failed due to network or rate limits, but your successful data is preserved below.'
                    : 'All rows were processed successfully.'}
                </CardDescription>
              </div>
            </div>
            <Button onClick={onReset} variant="outline">Upload Another File</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground font-medium">Total Input Rows</p>
              <p className="text-3xl font-bold">{metrics.totalRows}</p>
            </div>
            <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Extracted</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.successfulRows}</p>
            </div>
            <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Skipped</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{metrics.skippedRows}</p>
            </div>
            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm text-destructive font-medium">Failed Batches</p>
              <p className="text-3xl font-bold text-destructive">{metrics.failedBatches}</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground text-right">
            Processing time: {(metrics.processingTimeMs / 1000).toFixed(1)}s
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg overflow-hidden border-muted">
        <CardContent className="p-0">
          <ResultsTable data={records} />
        </CardContent>
      </Card>
    </div>
  );
}
