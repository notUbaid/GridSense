import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResultsTable } from '@/components/results/ResultsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { CrmRecord } from '@/types/schema';

interface ProgressCardProps {
  progress: number;
  records: CrmRecord[];
}

export function ProgressCard({ progress, records }: ProgressCardProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Processing Extraction</CardTitle>
          <CardDescription className="text-sm">Analyzing spreadsheet structure and extracting standard CRM fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2 w-full transition-all duration-300" />
          <p className="text-right text-sm font-medium text-muted-foreground">{progress}% Complete</p>
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
