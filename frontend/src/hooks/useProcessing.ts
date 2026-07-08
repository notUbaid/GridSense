'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';

const DIGIT_REGEX = /\d/g;

import { processBatchApi, apiClient } from '../services/api';
import { CrmRecord, ProcessBatchRequest } from '../types/schema';
import { toast } from 'sonner';

export type ProcessState = 'idle' | 'parsing' | 'preview' | 'processing' | 'done' | 'partial_success' | 'error';

export interface SchemaMapping {
  mapping: { source: string; target: string; confidence: number }[];
  overallConfidence: number;
}

export interface ProcessMetrics {
  totalRows: number;
  successfulRows: number;
  skippedRows: number;
  failedRows: number;
  failedBatches: number;
  processingTimeMs: number;
  skipReasons: Record<string, number>;
  failReasons: Record<string, number>;
}

/** Maximum file size in bytes (50 MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Batch size for AI-processed rows. Kept small (50) to stay within LLM
 * context windows and improve extraction accuracy per the PRD's 20-30 recommendation.
 * Deterministic (schema-mapped) batches use a much larger size since they skip AI entirely.
 */
const AI_BATCH_SIZE = 50;
const DETERMINISTIC_BATCH_SIZE = 5000;
const MAX_CONCURRENCY = 4;

export function useProcessing() {
  const [state, setState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [skippedRawRows, setSkippedRawRows] = useState<Record<string, string>[]>([]);
  const [failedRawRows, setFailedRawRows] = useState<Record<string, string>[]>([]);
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: Record<string, string>[] } | null>(null);
  const [schemaMapping, setSchemaMapping] = useState<SchemaMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<string>('Idle');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ProcessMetrics>({
    totalRows: 0,
    successfulRows: 0,
    skippedRows: 0,
    failedRows: 0,
    failedBatches: 0,
    processingTimeMs: 0,
    skipReasons: {},
    failReasons: {}
  });

  // Reference for full parsed data to prevent React state bloat
  const parsedDataRef = useRef<{ headers: string[], rows: Record<string, string>[] } | null>(null);

  // Ref to track and clean up the timer interval on unmount/reset
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const processFile = useCallback((file: File) => {
    // Validate file size before parsing
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File too large (${sizeMB} MB). Maximum supported size is 50 MB.`);
      return;
    }

    setState('parsing');
    setError(null);
    setProgress(0);
    setRecords([]);
    setSkippedRawRows([]);
    setPreviewData(null);
    setSchemaMapping(null);
    setCurrentActivity('Idle');
    setElapsedMs(0);
    setEtaMs(null);
    setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedRows: 0, failedBatches: 0, processingTimeMs: 0, skipReasons: {}, failReasons: {} });
    parsedDataRef.current = null;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: async (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data;

        if (rows.length === 0) {
          setError('CSV file is empty.');
          setState('error');
          toast.error('The uploaded CSV file is empty.');
          return;
        }

        const sanitizeRows = (r: Record<string, string>[]) => {
          return r.map((row, index) => {
            const sanitized: Record<string, string> = { _row_id: String(index + 2) };
            for (const key in row) {
              if (key === '_row_id') continue;
              const val = row[key] || '';
              sanitized[key] = val.length > 2000 ? val.substring(0, 2000) + '...' : val;
            }
            return sanitized;
          });
        };

        const hasSuspiciousHeaders = headers.some(h => 
          h.includes('@') || 
          /^\d{4,}/.test(h) || 
          h.length > 50 
        );

        if (hasSuspiciousHeaders) {
          toast.warning('Warning: It looks like your CSV might not have header columns. The first row of data is being treated as headers.');
        }

        const sanitizedData = sanitizeRows(rows);
        parsedDataRef.current = { headers, rows: sanitizedData };
        // Only keep the first 500 rows in React state to avoid memory bloat
        setPreviewData({ headers, rows: sanitizedData.slice(0, 500) });
        setState('preview');
        toast.success(`Successfully parsed ${sanitizedData.length} rows.`);
      },
      error: (err: Error) => {
        const errMsg = `Error parsing CSV: ${err.message}`;
        setError(errMsg);
        setState('error');
        toast.error(errMsg);
      },
    });
  }, []);

  const startProcessing = useCallback(async () => {
    const fullData = parsedDataRef.current;
    if (!previewData || !fullData) return;
    
    setState('processing');
    toast.info(`Starting AI extraction for ${fullData.rows.length} records...`);

    const { headers, rows: sanitizedData } = fullData;

    // Pre-flight heuristic filtering & Deduplication
    const validRows: Record<string, string>[] = [];
    const localSkippedRaw: Record<string, string>[] = [];
    const localSkipReasons: Record<string, number> = {};

    for (const row of sanitizedData) {
      const rowVals = Object.values(row).join(' ').toLowerCase();
      // Heuristic: Must contain '@' (email) or at least 7 digits *total* across the row (potential phone)
      const totalDigits = (rowVals.match(DIGIT_REGEX) || []).length;
      const hasBasicContactInfo = rowVals.includes('@') || totalDigits >= 7;
      
      if (!hasBasicContactInfo) {
        localSkippedRaw.push({ ...row, _skipReason: 'Missing Email/Phone (Heuristics)' });
        localSkipReasons['Missing Email/Phone (Heuristics)'] = (localSkipReasons['Missing Email/Phone (Heuristics)'] || 0) + 1;
        continue;
      }

      validRows.push(row);
    }

    if (sanitizedData.length > 500) {
      toast.info(`Note: You're uploading a massive file (${sanitizedData.length} rows). Our Free Tier API limits might cause processing to slow down or hit rate limits temporarily.`);
    }

    setSkippedRawRows(localSkippedRaw);

    // Determine batch size based on whether we'll have a schema mapping
    // (will be refined after map-headers call)
    let effectiveBatchSize = AI_BATCH_SIZE;

    setMetrics(prev => ({ ...prev, totalRows: sanitizedData.length }));
    const startTime = Date.now();

    let fetchedMapping: ProcessBatchRequest['schemaMapping'] | null = null;
    try {
      setCurrentActivity('AI is analyzing your column headers...');
      const res = await apiClient.post('/process/map-headers', { headers });
      const data = res.data;
      if (data && data.mapping && data.mapping.length > 0) {
        setSchemaMapping(data);
        fetchedMapping = data.mapping;
        // With a high-confidence schema mapping, we can use deterministic processing
        // which doesn't hit the AI — so we can use much larger batches
        if (data.overallConfidence >= 70) {
          effectiveBatchSize = DETERMINISTIC_BATCH_SIZE;
        }
      }
    } catch (err) {
      // Header mapping failure is non-fatal — fall back to AI extraction
      console.warn('Failed to map headers, falling back to AI extraction', err);
    }

    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < validRows.length; i += effectiveBatchSize) {
      chunks.push(validRows.slice(i, i + effectiveBatchSize));
    }

    setCurrentActivity(`Warming up AI models for ${validRows.length} valid records...`);

    const localChunkResults: CrmRecord[][] = new Array(chunks.length).fill(null);
    let completedBatches = 0;
    const totalBatches = chunks.length;
    let localFailedBatches = 0;
    let localFailedRows = 0;
    const localFailedRaw: Record<string, string>[] = [];
    const localFailReasons: Record<string, number> = {};
    let localSuccessfulRows = 0;
    let localSkippedRows = localSkippedRaw.length;

    // Timer for elapsed/ETA — tracked via ref for proper cleanup
    clearTimer();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);
      
      // Sync records periodically to avoid O(N^2) state updates per batch
      setRecords(localChunkResults.filter(Boolean).flat());

      if (completedBatches > 0) {
        const msPerBatch = elapsed / completedBatches;
        const remainingBatches = totalBatches - completedBatches;
        // Smooth ETA slightly
        setEtaMs(prev => prev === null ? msPerBatch * remainingBatches : (prev * 0.7 + msPerBatch * remainingBatches * 0.3));
      }
    }, 1000);

    // Provider assignment
    let nextProvider: 'groq' | 'gemini' = 'groq';

    const getNextProvider = (): 'groq' | 'gemini' => {
      return nextProvider;
    };

    const processBatchQueue = async (queue: { batch: Record<string, string>[], index: number }[]) => {
      while (queue.length > 0) {
        const task = queue.shift();
        if (!task) break;

        // Assign provider at dequeue time (synchronized via single-threaded JS event loop)
        const taskProvider = getNextProvider();
        
        setCurrentActivity(`Mapping fields for rows ${task.index * effectiveBatchSize + 1} to ${Math.min((task.index + 1) * effectiveBatchSize, validRows.length)}...`);
        
        let requeued = false;
        
        try {
          const response = await processBatchApi({
            batchId: `batch_${task.index}`,
            headers,
            rows: task.batch,
            provider: taskProvider,
          }, fetchedMapping);

          if (response.status === 'success' || response.status === 'partial') {
            if (response.records) {
              localChunkResults[task.index] = response.records;
              // setRecords is now handled in the 1-second interval
              localSuccessfulRows += response.records.length;
            }
            if (response.skippedCount) {
              localSkippedRows += response.skippedCount;
            }
            if (response.skippedReasons) {
              for (const [reason, count] of Object.entries(response.skippedReasons)) {
                localSkipReasons[reason] = (localSkipReasons[reason] || 0) + count;
              }
            }
          } else {
            const err = new Error(response.error || 'Batch failed without specific error');
            (err as Error & { exhaustedProvider?: string }).exhaustedProvider = response.exhaustedProvider;
            throw err;
          }
        } catch (err: unknown) {
          const error = err as Error & { response?: { data?: { error?: string, exhaustedProvider?: string }, status?: number }, exhaustedProvider?: string };
          const backendError = error.response?.data?.error || error.message || 'Unknown error';
          const status = error.response?.status;
          const exhaustedProvider = error.response?.data?.exhaustedProvider || error.exhaustedProvider || 'groq';
          
          if (status === 429 || backendError.toLowerCase().includes('rate limit')) {
            if (exhaustedProvider === 'groq') {
              if (nextProvider === 'groq') {
                nextProvider = 'gemini';
                toast.info(`Groq free limit reached. Switching to Gemini backup...`);
                setCurrentActivity(`Switching AI engine to Gemini...`);
                await new Promise(r => setTimeout(r, 1500));
              } else {
                await new Promise(r => setTimeout(r, 500));
              }
              queue.unshift(task);
              requeued = true;
              continue;
            } else {
              setCurrentActivity(`API limits reached across all providers. Sleeping for 15s before resuming...`);
              await new Promise(r => setTimeout(r, 15000));
              nextProvider = 'groq'; // Try groq again after sleeping
              queue.unshift(task);
              requeued = true;
              continue;
            }
          } else {
            localFailedBatches++;
            localFailedRows += task.batch.length;
            localFailedRaw.push(...task.batch);
            localFailReasons[backendError] = (localFailReasons[backendError] || 0) + task.batch.length;
            
            if (localFailedBatches <= 3) {
              toast.error(`Batch ${task.index + 1} (${task.batch.length} rows) failed: ${backendError}`);
            } else if (localFailedBatches === 4) {
              toast.error(`Multiple batches failing. Suppressing further error toasts.`);
            }
          }
        } finally {
          if (!requeued) {
            completedBatches++;
            setProgress(Math.round((completedBatches / totalBatches) * 100));
          }
        }
      }
    };

    const queue = chunks.map((batch, index) => ({ batch, index }));
    const workers = Array(Math.min(MAX_CONCURRENCY, queue.length)).fill(null).map(() => processBatchQueue(queue));

    await Promise.allSettled(workers);
    clearTimer();
    
    // Final sync of records
    setRecords(localChunkResults.filter(Boolean).flat());
    
    setCurrentActivity('Finalizing extraction...');

    // Track abandoned rows left in the queue due to a hard abort
    if (queue.length > 0) {
      let abandonedRowsCount = 0;
      for (const task of queue) {
        abandonedRowsCount += task.batch.length;
        localFailedRaw.push(...task.batch);
      }
      localFailedRows += abandonedRowsCount;
      localFailReasons['Pipeline Aborted (API Limits Exceeded)'] = (localFailReasons['Pipeline Aborted (API Limits Exceeded)'] || 0) + abandonedRowsCount;
    }

    setFailedRawRows(localFailedRaw);

    setMetrics(prev => ({
      ...prev,
      successfulRows: localSuccessfulRows,
      skippedRows: localSkippedRows,
      failedRows: localFailedRows,
      failedBatches: localFailedBatches,
      processingTimeMs: Date.now() - startTime,
      skipReasons: localSkipReasons,
      failReasons: localFailReasons
    }));

    if (localFailedRows === 0) {
      setState('done');
      toast.success('Extraction complete!');
    } else {
      setState('partial_success');
      toast.warning('Extraction finished with some batch errors. Partial results recovered.');
    }
  }, [previewData, clearTimer]);

  const retryFailed = useCallback(() => {
    if (failedRawRows.length === 0 || !previewData) return;
    
    setPreviewData({
      headers: previewData.headers,
      rows: [...failedRawRows]
    });
    
    setFailedRawRows([]);
    setState('preview');
    toast.info('Failed rows have been queued up for retry.');
  }, [failedRawRows, previewData]);

  const reset = useCallback(() => {
    clearTimer();
    setState('idle');
    setProgress(0);
    setRecords([]);
    setSkippedRawRows([]);
    setFailedRawRows([]);
    setPreviewData(null);
    parsedDataRef.current = null;
    setError(null);
    setCurrentActivity('Idle');
    setElapsedMs(0);
    setEtaMs(null);
    setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedRows: 0, failedBatches: 0, processingTimeMs: 0, skipReasons: {}, failReasons: {} });
  }, [clearTimer]);

  return {
    state,
    progress,
    records,
    skippedRawRows,
    failedRawRows,
    previewData,
    schemaMapping,
    metrics,
    error,
    currentActivity,
    elapsedMs,
    etaMs,
    processFile,
    startProcessing,
    retryFailed,
    reset,
  };
}
