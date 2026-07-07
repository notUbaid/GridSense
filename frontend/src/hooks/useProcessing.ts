import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { processBatchApi } from '../services/api';
import { CrmRecord } from '../types/schema';
import { toast } from 'sonner';

export type ProcessState = 'idle' | 'parsing' | 'preview' | 'processing' | 'done' | 'partial_success' | 'error';

export interface ProcessMetrics {
  totalRows: number;
  successfulRows: number;
  skippedRows: number;
  failedBatches: number;
  processingTimeMs: number;
  skipReasons: Record<string, number>;
  failReasons: string[];
}

export function useProcessing() {
  const [state, setState] = useState<ProcessState>('idle');
  const [progress, setProgress] = useState(0);
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [skippedRawRows, setSkippedRawRows] = useState<Record<string, string>[]>([]);
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: Record<string, string>[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<string>('Idle');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [etaMs, setEtaMs] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<ProcessMetrics>({
    totalRows: 0,
    successfulRows: 0,
    skippedRows: 0,
    failedBatches: 0,
    processingTimeMs: 0,
    skipReasons: {},
    failReasons: []
  });

  const batchSize = Number(process.env.NEXT_PUBLIC_AI_BATCH_SIZE) || 20;
  const maxConcurrency = Number(process.env.NEXT_PUBLIC_AI_CONCURRENCY) || 2;

  const processFile = useCallback((file: File) => {
    setState('parsing');
    setError(null);
    setProgress(0);
    setRecords([]);
    setSkippedRawRows([]);
    setPreviewData(null);
    setCurrentActivity('Idle');
    setElapsedMs(0);
    setEtaMs(null);
    setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedBatches: 0, processingTimeMs: 0, skipReasons: {}, failReasons: [] });

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
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
          return r.map(row => {
            const sanitized: Record<string, string> = {};
            for (const key in row) {
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
        setPreviewData({ headers, rows: sanitizedData });
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
    if (!previewData) return;
    
    setState('processing');
    toast.info(`Starting AI extraction for ${previewData.rows.length} records...`);

    const { headers, rows: sanitizedData } = previewData;

    // Pre-flight heuristic filtering & Deduplication
    const validRows: Record<string, string>[] = [];
    const localSkippedRaw: Record<string, string>[] = [];
    const localSkipReasons: Record<string, number> = {};
    const seenContacts = new Set<string>();

    for (const row of sanitizedData) {
      const rowStr = JSON.stringify(row).toLowerCase();
      // Heuristic: Must contain '@' (email) or a sequence of 7+ digits (phone)
      const hasBasicContactInfo = rowStr.includes('@') || /\d{7,}/.test(rowStr);
      
      if (!hasBasicContactInfo) {
        localSkippedRaw.push(row);
        localSkipReasons['Missing Email/Phone (Heuristics)'] = (localSkipReasons['Missing Email/Phone (Heuristics)'] || 0) + 1;
        continue;
      }

      // Quick dedup extraction: Find first email or phone-like string to use as dedup key
      const emailMatch = rowStr.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
      const phoneMatch = rowStr.match(/\d{7,}/);
      const dedupKey = emailMatch?.[0] || phoneMatch?.[0];

      if (dedupKey) {
        if (seenContacts.has(dedupKey)) {
          localSkippedRaw.push(row);
          localSkipReasons['Duplicate Contact Info'] = (localSkipReasons['Duplicate Contact Info'] || 0) + 1;
          continue;
        }
        seenContacts.add(dedupKey);
      }
      
      validRows.push(row);
    }

    setSkippedRawRows(localSkippedRaw);

    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < validRows.length; i += batchSize) {
      batches.push(validRows.slice(i, i + batchSize));
    }

    setMetrics(prev => ({ ...prev, totalRows: sanitizedData.length }));
    const startTime = Date.now();

    setCurrentActivity(`Warming up AI models for ${validRows.length} valid records...`);

    let completedBatches = 0;
    const totalBatches = batches.length;
    let localFailedBatches = 0;
    let localFailReasons: string[] = [];
    let localSuccessfulRows = 0;
    let localSkippedRows = localSkippedRaw.length;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setElapsedMs(elapsed);
      
      if (completedBatches > 0) {
        const msPerBatch = elapsed / completedBatches;
        const remainingBatches = totalBatches - completedBatches;
        setEtaMs(msPerBatch * remainingBatches);
      }
    }, 1000);

    let currentProvider: 'groq' | 'gemini' = 'groq';
    let limitReached = false;

    const processBatchQueue = async (queue: { batch: Record<string, string>[], index: number }[]) => {
      while (queue.length > 0) {
        if (limitReached) break;

        const task = queue.shift();
        if (!task) break;
        
        setCurrentActivity(`Mapping standard fields for rows ${task.index * batchSize} to ${Math.min((task.index + 1) * batchSize, validRows.length)}...`);
        
        try {
          const response = await processBatchApi({
            batchId: `batch_${task.index}`,
            headers,
            rows: task.batch,
            provider: currentProvider,
          });

          if (response.status === 'success' || response.status === 'partial') {
            if (response.records) {
              setRecords(prev => [...prev, ...response.records!]);
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
            (err as any).exhaustedProvider = response.exhaustedProvider;
            throw err;
          }
        } catch (err: unknown) {
          const error = err as any;
          const backendError = error.response?.data?.error || error.message || 'Unknown error';
          const status = error.response?.status;
          const exhaustedProvider = error.response?.data?.exhaustedProvider || error.exhaustedProvider || 'groq';
          
          if (status === 429 || backendError.toLowerCase().includes('rate limit')) {
            if (currentProvider === 'groq' && exhaustedProvider === 'groq') {
              currentProvider = 'gemini';
              toast.info(`Groq free limit reached. Thoughtfully switching to Gemini backup...`);
              setCurrentActivity(`Switching AI engine to Gemini...`);
              await new Promise(r => setTimeout(r, 1500));
              queue.unshift(task); // Requeue task
              continue; // Try again with Gemini
            } else {
              limitReached = true;
              setCurrentActivity(`API limits reached. Taking a breather, please try later.`);
              queue.unshift(task); // Save progress
              break; // Stop worker gracefully
            }
          } else {
            localFailedBatches++;
            const failMsg = `Batch ${task.index + 1}: ${backendError}`;
            localFailReasons.push(failMsg);
            toast.error(failMsg);
          }
        } finally {
          completedBatches++;
          setProgress(Math.round((completedBatches / totalBatches) * 100));
        }
      }
    };

    const queue = batches.map((batch, index) => ({ batch, index }));
    const workers = Array(Math.min(maxConcurrency, queue.length)).fill(null).map(() => processBatchQueue(queue));

    await Promise.allSettled(workers);
    clearInterval(timer);
    setCurrentActivity('Finalizing extraction...');

    setMetrics(prev => ({
      ...prev,
      successfulRows: localSuccessfulRows,
      skippedRows: localSkippedRows,
      failedBatches: localFailedBatches,
      processingTimeMs: Date.now() - startTime,
      skipReasons: localSkipReasons,
      failReasons: localFailReasons
    }));

    if (localFailedBatches === 0) {
      setState('done');
      toast.success('Extraction complete!');
    } else {
      setState('partial_success');
      toast.warning('Extraction finished with some batch errors. Partial results recovered.');
    }
  }, [batchSize, maxConcurrency, previewData]);

  return {
    state,
    progress,
    records,
    skippedRawRows,
    previewData,
    metrics,
    error,
    currentActivity,
    elapsedMs,
    etaMs,
    processFile,
    startProcessing,
    reset: () => {
      setState('idle');
      setProgress(0);
      setRecords([]);
      setSkippedRawRows([]);
      setPreviewData(null);
      setError(null);
      setCurrentActivity('Idle');
      setElapsedMs(0);
      setEtaMs(null);
      setMetrics({ totalRows: 0, successfulRows: 0, skippedRows: 0, failedBatches: 0, processingTimeMs: 0, skipReasons: {}, failReasons: [] });
    }
  };
}
