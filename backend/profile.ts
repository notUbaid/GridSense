import dotenv from 'dotenv';
dotenv.config();
import { processBatch } from './src/lib/extractor';
import { config } from './src/config';

const BATCH_SIZE = 50;
const CONCURRENCY = 5;

// Generate synthetic rows
function generateRows(count: number) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      _row_id: String(i + 1),
      'First Name': 'John' + i,
      'Last Name': 'Doe',
      'Email Address': `johndoe${i}@example.com`,
      'Phone Number': '+1 555-010-' + String(i).padStart(3, '0'),
      'Company Name': 'Acme Corp ' + i,
      'Lead Status': i % 2 === 0 ? 'Interested' : 'Not Connected',
      'Note': 'Please call back tomorrow at 5pm.'
    });
  }
  return rows;
}

const headers = ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'Company Name', 'Lead Status', 'Note'];

async function processQueue(tasks: any[], concurrency: number) {
  let active = 0;
  let index = 0;
  const results: any[] = [];
  
  return new Promise((resolve) => {
    const dispatch = async () => {
      if (index >= tasks.length && active === 0) {
        resolve(results);
        return;
      }
      
      while (active < concurrency && index < tasks.length) {
        const task = tasks[index++];
        active++;
        
        processBatch(headers, task.batch, 'groq', null)
          .then((res: any) => {
            results.push(res);
          })
          .catch((err: any) => {
            console.error('Batch failed:', err.message);
            results.push({ error: err.message });
          })
          .finally(() => {
            active--;
            dispatch();
          });
      }
    };
    dispatch();
  });
}

async function runBenchmark(rowCount: number) {
  console.log(`\n--- Benchmarking ${rowCount} rows ---`);
  const rows = generateRows(rowCount);
  
  const chunks = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    chunks.push({ batch: rows.slice(i, i + BATCH_SIZE) });
  }
  
  const startTime = performance.now();
  
  const results: any = await processQueue(chunks, CONCURRENCY);
  
  const totalTime = performance.now() - startTime;
  
  let totalPromptChars = 0;
  let totalResponseChars = 0;
  let totalPromptTokens = 0;
  let totalResponseTokens = 0;
  let totalApiLatency = 0;
  let totalParseLatency = 0;
  let totalRetries = 0;
  let successfulBatches = 0;
  let failedBatches = 0;

  for (const res of results) {
    if (res.error) {
      failedBatches++;
      continue;
    }
    successfulBatches++;
    if (res.metrics) {
      totalPromptChars += res.metrics.promptChars || 0;
      totalResponseChars += res.metrics.responseChars || 0;
      totalPromptTokens += res.metrics.promptTokens || 0;
      totalResponseTokens += res.metrics.responseTokens || 0;
      totalApiLatency += res.metrics.apiLatencyMs || 0;
      totalParseLatency += res.metrics.parseLatencyMs || 0;
      totalRetries += res.metrics.retries || 0;
    }
  }

  console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Batches: ${successfulBatches} successful, ${failedBatches} failed`);
  if (successfulBatches > 0) {
    console.log(`Average API Latency per batch: ${(totalApiLatency / successfulBatches / 1000).toFixed(2)}s`);
    console.log(`Average Prompt Tokens per batch: ${(totalPromptTokens / successfulBatches).toFixed(0)}`);
    console.log(`Average Response Tokens per batch: ${(totalResponseTokens / successfulBatches).toFixed(0)}`);
    console.log(`Total Prompt Tokens: ${totalPromptTokens}`);
    console.log(`Total Parse Time: ${totalParseLatency.toFixed(2)}ms`);
    console.log(`Total Retries: ${totalRetries}`);
  }
}

async function main() {
  await runBenchmark(100);
  await runBenchmark(250);
}

main().catch(console.error);
