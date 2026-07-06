import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResultsTable } from '@/components/results/ResultsTable';
import { CrmRecord } from '@/types/schema';

interface ProgressCardProps {
  progress: number;
  records: CrmRecord[];
}

export function ProgressCard({ progress, records }: ProgressCardProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-lg border-primary/20">
        <CardHeader>
          <CardTitle>Processing with AI...</CardTitle>
          <CardDescription>We are analyzing your spreadsheet structure and extracting standard CRM fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-3 w-full" />
          <p className="text-right text-sm font-medium text-muted-foreground">{progress}% Complete</p>
        </CardContent>
      </Card>
      
      {records.length > 0 && (
        <Card className="shadow-lg overflow-hidden border-muted opacity-80">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Live Results Preview ({records.length} extracted)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ResultsTable data={records} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
