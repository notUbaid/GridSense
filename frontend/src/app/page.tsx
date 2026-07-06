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
  const { state, progress, records, previewData, metrics, error, currentActivity, elapsedMs, etaMs, processFile, startProcessing, reset } = useProcessing();

  return (
    <main className="relative min-h-screen bg-background text-foreground p-6 md:p-12 overflow-hidden selection:bg-primary/20">
      {/* Subtle ambient top glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Technical grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[length:32px_32px] pointer-events-none -z-10"></div>
      
      <div className="relative mx-auto max-w-6xl space-y-8 z-10">
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
            currentActivity={currentActivity}
            elapsedMs={elapsedMs}
            etaMs={etaMs}
            totalRows={metrics.totalRows}
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
