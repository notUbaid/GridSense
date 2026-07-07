# GridSense Architecture & Request Flow

GridSense is engineered to handle the inherent unpredictability of Large Language Models (LLMs) and network latency by wrapping AI processing in strict validation boundaries, dynamic chunking, and multi-provider failovers.

Here is the precise technical lifecycle of a dataset passing through the GridSense pipeline.

---

## 1. Client-Side Parsing & Triage

**Upload & Web Worker Parsing**
When a user uploads a file (e.g., `facebook_leads.csv`), nothing AI-related happens immediately. The file is parsed entirely client-side in the browser using `PapaParse` via Web Workers. This prevents server memory bloat, avoids payload limits, and provides instant UI feedback.

**Heuristic Pre-Filtering**
Before initiating costly API calls, the frontend runs a deterministic pre-flight check on the parsed rows. If a row is clearly devoid of contact information (e.g., lacks an `@` symbol and contains fewer than 7 digits), it is immediately discarded into the "Skipped" pile. 

---

## 2. Dynamic Schema Mapping

Once the data is parsed and triaged, the frontend extracts the column headers and requests a mapping schema from the backend (`/api/v1/process/map-headers`).

**The AI Architect**
The backend queries Groq (Llama-3.1-8B) to map the unknown CSV columns to our strict GrowEasy CRM schema. The AI returns a JSON mapping along with a `confidence` score.

**The Execution Fork**
Based on the mapping confidence, the frontend decides on the execution strategy:
*   **High Confidence (≥ 70%)**: The system switches to **Deterministic Mode**. Batches of 5,000 rows are processed synchronously without further AI involvement, leveraging lightning-fast standard property mapping.
*   **Low/No Confidence**: The system switches to **AI Extraction Mode**. The data is heavily chunked into highly constrained batches of 50 rows for deep LLM analysis.

---

## 3. Concurrent Worker Pool

Sending massive arrays to an LLM destroys the context window, causes severe hallucinations, and inevitably triggers rate limits. 

GridSense utilizes a concurrent worker pool (default `maxConcurrency: 4`) in the React frontend. If a dataset has 500 rows, the workers dispatch 50-row batches asynchronously (e.g., Worker 1 takes rows 1-50, Worker 2 takes 51-100). 

*Why this matters:*
- **Cost & Speed**: Parallel execution significantly reduces wall-clock time.
- **Accuracy**: LLMs hallucinate less on smaller, focused lists.
- **Resilience**: A single batch failure (e.g., 50 rows) doesn't corrupt the entire 500-row import.

---

## 4. Multi-Provider AI Inference

When the backend receives a 50-row batch, it constructs a prompt enforcing strict JSON output (`response_format: { type: 'json_object' }`).

**Primary Inference & Rate Limit Swapping**
1. The batch is sent to **Groq** (`llama-3.3-70b-versatile`). 
2. If Groq encounters a `429 Too Many Requests` limit, the backend explicitly traps it and returns the exact status to the frontend worker.
3. The frontend worker catches the rate limit, logs a warning, **swaps the designated provider to Google Gemini** (`gemini-2.5-flash`), and requeues the failed batch.
4. The pipeline continues uninterrupted. 

---

## 5. Zero-Hallucination Validation

GridSense operates on a "zero trust" policy for AI outputs. 

When the LLM returns the JSON payload:
1. **Sanitization**: Shared utilities (`ai-utils.ts`) strip rogue markdown code fences and sanitize empty strings.
2. **Schema Enforcement**: The payload is passed through strict **Zod validation**. If the AI hallucinated an enum value (e.g., assigning `crm_status: 'KIND_OF_INTERESTED'`), it is clamped to `null`.
3. **Data Integrity Check**: The backend verifies that the number of returned records matches the number of rows sent. Dropped rows trigger a batch failure.

---

## 6. Real-Time Streaming & Consolidation

As asynchronous workers resolve, the React frontend streams progress via a live dashboard.
*   **Metrics**: Renders real-time successful rows, skipped rows, and failed batches.
*   **Dynamic ETA**: Calculates time remaining based on `completedBatches` and `elapsedTime`.

Once all queues are drained, the normalized data is consolidated into a virtualized TanStack Table. The final output can be exported as a clean, UTF-8 BOM encoded CSV, fully compatible with Microsoft Excel.
