'use client';

import React from 'react';
import { Dropzone } from '@/components/upload/Dropzone';
import { useProcessing } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreviewCard } from '@/components/pipeline/PreviewCard';
import { ProgressCard } from '@/components/pipeline/ProgressCard';
import { SummaryDashboard } from '@/components/pipeline/SummaryDashboard';

export default function Home() {
  const { state, progress, records, previewData, metrics, error, processFile, startProcessing, reset } = useProcessing();

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">GridSense</h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Semantic spreadsheet intelligence. Drop any CSV, and the AI will automatically map the raw data into a strictly typed CRM schema.
          </p>
        </div>

        {(state === 'idle' || state === 'parsing') && (
          <Card className="border-border/50 bg-card shadow-sm transition-all">
            <CardContent className="pt-6">
              <Dropzone onFileAccepted={processFile} disabled={state === 'parsing'} />
              {state === 'parsing' && (
                <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Parsing CSV locally...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {state === 'preview' && previewData && (
          <PreviewCard 
            previewData={previewData} 
            onCancel={reset} 
            onStart={startProcessing} 
          />
        )}

        {state === 'processing' && (
          <ProgressCard 
            progress={progress} 
            records={records} 
          />
        )}

        {state === 'error' && (
          <Card className="border-destructive/30 shadow-sm">
            <CardHeader>
              <div className="flex items-center space-x-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <CardTitle>Processing Failed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground bg-destructive/10 p-4 rounded-md border border-destructive/20">
                {error}
              </p>
              <Button onClick={reset} variant="default">Try Another File</Button>
            </CardContent>
          </Card>
        )}

        {(state === 'done' || state === 'partial_success') && (
          <SummaryDashboard 
            state={state} 
            metrics={metrics} 
            records={records} 
            onReset={reset} 
          />
        )}
      </div>
    </main>
  );
}
