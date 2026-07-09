'use client';

import React from 'react';
import { Dropzone, SampleCsvButton } from '@/components/upload/Dropzone';
import { useProcessing } from '@/hooks/useProcessing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PreviewCard } from '@/components/pipeline/PreviewCard';
import { ProgressCard } from '@/components/pipeline/ProgressCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SummaryDashboard } from '@/components/pipeline/SummaryDashboard';
import { SchemaMappingPanel } from '@/components/upload/SchemaMappingPanel';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { state, progress, processedRows, records, skippedRawRows, failedRawRows, previewData, schemaMapping, metrics, error, originalFilename, currentActivity, elapsedMs, etaMs, processFile, startProcessing, retryFailed, reset } = useProcessing();

  return (
    <main className="relative min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-12 overflow-hidden selection:bg-primary/20">
      {/* Subtle ambient top glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10"></div>
      
      {/* Technical grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[32px_32px] pointer-events-none -z-10"></div>
      
      <div className="relative mx-auto max-w-6xl space-y-8 z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-primary/80 to-primary/40">GridSense</h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Semantic spreadsheet intelligence. Drop any CSV, and the AI will automatically map the raw data into a strictly typed CRM schema.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {(state === 'idle' || state === 'parsing') && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
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
                <div className="flex justify-center pt-3">
                  <SampleCsvButton onFileAccepted={processFile} />
                </div>
              </motion.div>
            )}

            {state === 'preview' && previewData && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <PreviewCard 
                  previewData={previewData} 
                  onCancel={reset} 
                  onStart={startProcessing} 
                />
              </motion.div>
            )}

            {state === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <ProgressCard 
                  progress={progress} 
                  processedRows={processedRows}
                  skippedRows={metrics.skippedRows}
                  records={records} 
                  currentActivity={currentActivity}
                  elapsedMs={elapsedMs}
                  etaMs={etaMs}
                  totalRows={metrics.totalRows}
                />
                <SchemaMappingPanel mapping={schemaMapping} />
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-destructive/50 bg-destructive/5 shadow-lg backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-destructive/40 via-destructive to-destructive/40" />
                  <CardHeader>
                    <div className="flex items-center space-x-3 text-destructive">
                      <div className="p-2 bg-destructive/10 rounded-full">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl">Processing Disrupted</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-sm text-foreground bg-destructive/10 p-4 rounded-md border border-destructive/20 leading-relaxed font-medium">
                      {error}
                    </p>
                    <div className="flex justify-end">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button onClick={reset} variant="default" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Try Again
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {(state === 'done' || state === 'partial_success') && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <SummaryDashboard 
                  state={state} 
                  metrics={metrics} 
                  originalFilename={originalFilename} 
                  records={records} 
                  skippedRawRows={skippedRawRows}
                  failedRawRows={failedRawRows}
                  onReset={reset}
                  onRetry={retryFailed}
                />
                <SchemaMappingPanel mapping={schemaMapping} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
