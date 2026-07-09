'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Papa from 'papaparse';

const DIGIT_REGEX = /\d/g;

import { processBatchApi, apiClient } from '../services/api';
import { CrmRecord, ProcessBatchRequest } from '../types/schema';
import { toast } from 'sonner';
import axios from 'axios';

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
  totalSleepMs: number;
  skipReasons: Record<string, number>;
  failReasons: Record<string, number>;
  // Real telemetry — no fabricated numbers
  parseTimeMs: number;
  mappingTimeMs: number;
  batchesSent: number;
  totalRetries: number;
  peakConcurrency: number;
  isDeterministic: boolean;
}

/** Maximum file size in bytes (50 MB) */
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Batch size for AI-processed rows. Reduced to 35 to ensure
 * prompt_tokens + max_tokens stays below Groq's strict 6,000 TPM limit.
 */
const AI_BATCH_SIZE = 35;
const DETERMINISTIC_BATCH_SIZE = 5000;

export function useProcessing() {
  const [state, setState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [skippedRawRows, setSkippedRawRows] = useState<Record<string, string>[]>([]);
  const [failedRawRows, setFailedRawRows] = useState<Record<string, string>[]>([]);
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: Record<string, string>[] } | null>(null);
  const [schemaMapping, setSchemaMapping] = useState<SchemaMapping | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [totalParsedRows, setTotalParsedRows] = useState<number>(0);
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
    totalSleepMs: 0,
    skipReasons: {},
    failReasons: {},
    parseTimeMs: 0,
    mappingTimeMs: 0,
    batchesSent: 0,
    totalRetries: 0,
    peakConcurrency: 0,
    isDeterministic: false,
  });

  // Reference for full parsed data to prevent React state bloat
  const parsedDataRef = useRef<{ headers: string[], rows: Record<string, string>[] } | null>(null);

  // Ref to track and clean up the timer interval on unmount/reset
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref to store speculative header mapping promise
  const mapHeadersPromiseRef = useRef<Promise<unknown> | null>(null);

  // Ref to store AbortController for cancelation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref to track the queue-drain polling interval for cleanup
  const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard ref to prevent processFile from being called during processing
  const isProcessingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  }, []);

  // Fix #9: Clean up all intervals on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      clearTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearTimer]);

  const processFile = useCallback((file: File) => {
    // Fix #7/#11: Guard against calling processFile while already processing
    if (isProcessingRef.current) return;

    // Validate file size before parsing
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File too large (${sizeMB} MB). Maximum supported size is 50 MB.`);
      return;
    }

    setState('parsing');
    setError(null);
    setOriginalFilename(file.name);
    setProgress(0);
    setRecords([]);
    setSkippedRawRows([]);
    setPreviewData(null);
    setSchemaMapping(null);
    setCurrentActivity('Idle');
    setElapsedMs(0);
    setEtaMs(null);
    setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedRows: 0, failedBatches: 0, processingTimeMs: 0, totalSleepMs: 0, skipReasons: {}, failReasons: {}, parseTimeMs: 0, mappingTimeMs: 0, batchesSent: 0, totalRetries: 0, peakConcurrency: 0, isDeterministic: false });
    parsedDataRef.current = null;

    const parseStart = performance.now();
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
        setTotalParsedRows(sanitizedData.length);
        // Only keep the first 500 rows in React state to avoid memory bloat
        setPreviewData({ headers, rows: sanitizedData.slice(0, 500) });
        setState('preview');
        setMetrics(prev => ({ ...prev, parseTimeMs: Math.round(performance.now() - parseStart) }));
        toast.success(`Successfully parsed ${sanitizedData.length} rows.`);

        // --- SPECULATIVE PROCESSING ---
        // Cancel any previous speculative processing
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const ac = new AbortController();
        abortControllerRef.current = ac;
        
        // Start mapping headers in the background immediately
        mapHeadersPromiseRef.current = apiClient
          .post('/process/map-headers', { headers }, { signal: ac.signal })
          .catch(() => null); // Ignore errors from speculation
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
    isProcessingRef.current = true;
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

    setSkippedRawRows(localSkippedRaw);

    // Determine batch size based on whether we'll have a schema mapping
    // (will be refined after map-headers call)
    let effectiveBatchSize = AI_BATCH_SIZE;

    setMetrics(prev => ({ ...prev, totalRows: sanitizedData.length }));
    const startTime = Date.now();

    let fetchedMapping: ProcessBatchRequest['schemaMapping'] | null = null;
    let localIsDeterministic = false;
    const mappingStart = performance.now();
    try {
      setCurrentActivity('AI is analyzing your column headers...');
      
      // Await the speculative promise if it exists, otherwise fire a new request
      const mappingPromise = mapHeadersPromiseRef.current || apiClient.post('/process/map-headers', { headers }, { signal: abortControllerRef.current?.signal });
      const res = (await mappingPromise) as { data?: SchemaMapping };
      mapHeadersPromiseRef.current = null; // Clear out the ref

      if (res && res.data) {
        const data = res.data;
        if (data.mapping && data.mapping.length > 0) {
          setSchemaMapping(data);
          // With a high-confidence schema mapping, we can use deterministic processing
          // which doesn't hit the AI — so we can use much larger batches
          if (data.overallConfidence >= 70) {
            effectiveBatchSize = DETERMINISTIC_BATCH_SIZE;
            localIsDeterministic = true;
            fetchedMapping = data.mapping; // Only use mapping if highly confident
          }
        }
      }
    } catch (err: unknown) {
      if (axios.isCancel(err)) {
         throw err;
      }
      // Header mapping failure is non-fatal — fall back to AI extraction
      console.warn('Failed to map headers, falling back to AI extraction', err);
    }
    const mappingTimeMs = Math.round(performance.now() - mappingStart);
    setMetrics(prev => ({ ...prev, mappingTimeMs, isDeterministic: localIsDeterministic }));

    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < validRows.length; i += effectiveBatchSize) {
      chunks.push(validRows.slice(i, i + effectiveBatchSize));
    }

    setCurrentActivity(`Warming up AI models for ${validRows.length} valid records...`);

    // Fix #3: Use a single accumulator array instead of indexed slots
    // to avoid index collisions when batches are split on rate limit
    const allExtractedRecords: CrmRecord[] = [];
    let completedBatches = 0;
    let localProcessedRows = localSkippedRaw.length;
    
    // Initial progress based on heuristically skipped rows
    setProcessedRows(localProcessedRows);
    setProgress(Math.round((localProcessedRows / sanitizedData.length) * 100));
    let localFailedBatches = 0;
    let localFailedRows = 0;
    const localFailedRaw: Record<string, string>[] = [];
    const localFailReasons: Record<string, number> = {};
    let localSuccessfulRows = 0;
    let localSkippedRows = localSkippedRaw.length;
    let localTotalSleepMs = 0;
    let localBatchesSent = 0;
    let localTotalRetries = 0;
    let localPeakConcurrency = 0;
    let cachedFlatRecords: CrmRecord[] = [];
    let flatRecordsDirty = false;

    // Timer for elapsed/ETA — tracked via ref for proper cleanup
    clearTimer();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);
      
      // Sync records periodically — only update when data changed
      if (flatRecordsDirty) {
        cachedFlatRecords = [...allExtractedRecords].sort((a, b) => parseInt(a._row_id || '0') - parseInt(b._row_id || '0'));
        flatRecordsDirty = false;
      }
      setRecords(cachedFlatRecords);

      if (completedBatches > 0) {
        const msPerBatch = elapsed / completedBatches;
        const totalBatchesEstimate = Math.ceil(validRows.length / effectiveBatchSize);
        const remainingBatches = Math.max(0, totalBatchesEstimate - completedBatches);
        // Smooth ETA slightly
        setEtaMs(prev => prev === null ? msPerBatch * remainingBatches : (prev * 0.7 + msPerBatch * remainingBatches * 0.3));
      }
    }, 1000);

    // Provider assignment
    const PROVIDER_CASCADE = ['groq', 'gemini', 'openai', 'anthropic', 'openrouter'] as const;
    type ProviderType = typeof PROVIDER_CASCADE[number];
    const disabledProviders = new Set<ProviderType>();
    let currentProviderIndex = 0;

    const getNextProvider = (): ProviderType => {
      let attempts = 0;
      while (attempts < PROVIDER_CASCADE.length) {
        const p = PROVIDER_CASCADE[currentProviderIndex];
        if (!disabledProviders.has(p)) {
          return p;
        }
        currentProviderIndex = (currentProviderIndex + 1) % PROVIDER_CASCADE.length;
        attempts++;
      }
      return PROVIDER_CASCADE[0];
    };

    // Advanced Queue State
    interface QueueTask {
      batch: Record<string, string>[];
      index: number;
      attempts: number;
    }
    
    const queue: QueueTask[] = chunks.map((batch, index) => ({ batch, index, attempts: 0 }));
    let activeWorkers = 0;
    let maxConcurrency = 2; // Start low (Adaptive Concurrency)
    const MAX_ALLOWED_CONCURRENCY = 8;
    let isPipelineAborted = false;

    const dispatchWorkers = () => {
      while (activeWorkers < maxConcurrency && queue.length > 0 && !isPipelineAborted) {
        const task = queue.shift();
        if (task) {
          activeWorkers++;
          if (activeWorkers > localPeakConcurrency) localPeakConcurrency = activeWorkers;
          processTask(task).finally(() => {
            activeWorkers--;
            dispatchWorkers();
          });
        }
      }
    };

    const processTask = async (task: QueueTask) => {
      const taskProvider = getNextProvider();
      
      setCurrentActivity(`Mapping fields for rows ${task.index * effectiveBatchSize + 1} to ${Math.min((task.index + 1) * effectiveBatchSize, validRows.length)}...`);
      
      try {
        localBatchesSent++;
        const response = await processBatchApi({
          batchId: `batch_${task.index}_${task.attempts}`,
          headers,
          rows: task.batch,
          provider: taskProvider,
        }, fetchedMapping, abortControllerRef.current?.signal);

        if (response.status === 'success' || response.status === 'partial') {
          // Adaptive Concurrency: Scale up on success
          if (maxConcurrency < MAX_ALLOWED_CONCURRENCY) {
            maxConcurrency++;
          }
          
          if (response.records) {
            allExtractedRecords.push(...response.records);
            localSuccessfulRows += response.records.length;
            flatRecordsDirty = true;
          }
          if (response.skippedCount) {
            localSkippedRows += response.skippedCount;
          }
          if (response.skippedRecords) {
            for (const record of response.skippedRecords) {
              localSkippedRaw.push({ ...record.original, _skipReason: record.reason });
            }
            setSkippedRawRows([...localSkippedRaw].sort((a, b) => parseInt(a._row_id || '0') - parseInt(b._row_id || '0')));
          }
          if (response.skippedReasons) {
            for (const [reason, count] of Object.entries(response.skippedReasons)) {
              localSkipReasons[reason] = (localSkipReasons[reason] || 0) + count;
            }
          }
          
          completedBatches++;
          localProcessedRows += task.batch.length;
          setProcessedRows(localProcessedRows);
          setProgress(Math.round((localProcessedRows / sanitizedData.length) * 100));
        } else {
          throw new Error(response.error || 'Batch failed without specific error');
        }
      } catch (err: unknown) {
        if (axios.isCancel(err) || abortControllerRef.current?.signal.aborted) {
          isPipelineAborted = true;
          return;
        }
        
        const error = err as Error & { response?: { data?: { error?: string, exhaustedProvider?: string }, status?: number }, exhaustedProvider?: string };
        const backendError = error.response?.data?.error || error.message || 'Unknown error';
        const status = error.response?.status;
        const exhaustedProvider = error.response?.data?.exhaustedProvider || error.exhaustedProvider || 'groq';
        
        if (status === 429 || backendError.toLowerCase().includes('rate limit') || status === 403 || backendError.toLowerCase().includes('exhausted')) {
          // Adaptive Concurrency: Scale down aggressively on rate limit
          maxConcurrency = Math.max(1, Math.floor(maxConcurrency / 2));
          
          const isAuthError = backendError.toLowerCase().includes('api key') || backendError.toLowerCase().includes('restricted') || backendError.toLowerCase().includes('invalid');
          
          if (isAuthError) {
            toast.error(`${exhaustedProvider.toUpperCase()} API key is invalid/missing. Disabling provider.`);
            disabledProviders.add(exhaustedProvider as ProviderType);
          } else {
             // Rate limit
             toast.info(`${exhaustedProvider.toUpperCase()} limits reached. Cycling provider...`);
          }

          if (disabledProviders.size >= PROVIDER_CASCADE.length) {
            toast.error('All AI providers disabled due to invalid/missing API keys!');
            // Sleep so we don't spam 8 attempts instantly
            await new Promise(r => setTimeout(r, 5000));
          } else {
             currentProviderIndex = (currentProviderIndex + 1) % PROVIDER_CASCADE.length;
             // Ensure we skip disabled ones
             while (disabledProviders.has(PROVIDER_CASCADE[currentProviderIndex])) {
               currentProviderIndex = (currentProviderIndex + 1) % PROVIDER_CASCADE.length;
             }
             setCurrentActivity(`Switching AI engine to ${PROVIDER_CASCADE[currentProviderIndex].toUpperCase()}...`);
             localTotalSleepMs += 2000;
             await new Promise(r => setTimeout(r, 2000));
          }
          task.attempts++;
          localTotalRetries++;
          
          if (task.attempts > 8) {
             toast.error(`Batch ${task.index + 1} failed: All AI providers exhausted after 8 retries.`);
             localFailedBatches++;
             localFailedRows += task.batch.length;
             localFailedRaw.push(...task.batch);
             localFailReasons['All AI providers exhausted'] = (localFailReasons['All AI providers exhausted'] || 0) + task.batch.length;
             completedBatches++;
             localProcessedRows += task.batch.length;
             setProcessedRows(localProcessedRows);
             setProgress(Math.round((localProcessedRows / sanitizedData.length) * 100));
             return;
          }
          
          // Batch Splitting logic
          if (task.batch.length > 1 && task.attempts > 1) {
            const mid = Math.floor(task.batch.length / 2);
            queue.unshift({ batch: task.batch.slice(mid), index: task.index, attempts: 0 });
            queue.unshift({ batch: task.batch.slice(0, mid), index: task.index, attempts: 0 });
            toast.info(`Splitting batch ${task.index + 1} into smaller chunks to avoid rate limits...`);
          } else {
            // Jittered Exponential Backoff
            const baseDelay = 1000;
            const jitter = Math.random() * 500;
            const delay = (baseDelay * Math.pow(2, task.attempts)) + jitter;
            localTotalSleepMs += Math.min(delay, 8000);
            await new Promise(r => setTimeout(r, Math.min(delay, 8000)));
            queue.unshift(task);
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
          
          completedBatches++;
          localProcessedRows += task.batch.length;
          setProcessedRows(localProcessedRows);
          setProgress(Math.round((localProcessedRows / sanitizedData.length) * 100));
        }
      }
    };

    dispatchWorkers();

    // Wait for queue to drain (tracked via ref for cleanup on unmount)
    await new Promise<void>(resolve => {
      const checkInterval = setInterval(() => {
        if ((queue.length === 0 && activeWorkers === 0) || isPipelineAborted) {
          clearInterval(checkInterval);
          drainIntervalRef.current = null;
          resolve();
        }
      }, 250);
      drainIntervalRef.current = checkInterval;
    });

    clearTimer();
    
    // Final sync of records
    setRecords([...allExtractedRecords].sort((a, b) => parseInt(a._row_id || '0') - parseInt(b._row_id || '0')));
    isProcessingRef.current = false;
    
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

    setFailedRawRows(localFailedRaw.sort((a, b) => parseInt(a._row_id || '0') - parseInt(b._row_id || '0')));

    setMetrics(prev => ({
      ...prev,
      successfulRows: localSuccessfulRows,
      skippedRows: localSkippedRows,
      failedRows: localFailedRows,
      failedBatches: localFailedBatches,
      processingTimeMs: Date.now() - startTime,
      totalSleepMs: localTotalSleepMs,
      skipReasons: localSkipReasons,
      failReasons: localFailReasons,
      batchesSent: localBatchesSent,
      totalRetries: localTotalRetries,
      peakConcurrency: localPeakConcurrency,
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
    
    // Fix #1: Update parsedDataRef so startProcessing reads only the failed rows,
    // not the entire original dataset.
    const retryData = {
      headers: previewData.headers,
      rows: [...failedRawRows]
    };
    parsedDataRef.current = retryData;
    setPreviewData(retryData);
    
    setFailedRawRows([]);
    setState('preview');
    toast.info('Failed rows have been queued up for retry.');
  }, [failedRawRows, previewData]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    mapHeadersPromiseRef.current = null;
    isProcessingRef.current = false;
    clearTimer();
    setState('idle');
    setProgress(0);
    setProcessedRows(0);
    setRecords([]);
    setSkippedRawRows([]);
    setFailedRawRows([]);
    setTotalParsedRows(0);
    setPreviewData(null);
    parsedDataRef.current = null;
    setError(null);
    setCurrentActivity('Idle');
    setElapsedMs(0);
    setEtaMs(null);
    setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedRows: 0, failedBatches: 0, processingTimeMs: 0, totalSleepMs: 0, skipReasons: {}, failReasons: {}, parseTimeMs: 0, mappingTimeMs: 0, batchesSent: 0, totalRetries: 0, peakConcurrency: 0, isDeterministic: false });
  }, [clearTimer]);

  return {
    state,
    progress,
    processedRows,
    records,
    skippedRawRows,
    failedRawRows,
    previewData,
    schemaMapping,
    metrics,
    error,
    originalFilename,
    totalParsedRows,
    currentActivity,
    elapsedMs,
    etaMs,
    processFile,
    startProcessing,
    retryFailed,
    reset,
  };
}
