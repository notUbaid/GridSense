# GridSense Architecture

GridSense is designed as a production-grade, highly resilient data extraction pipeline. It handles the inherent unpredictability of Large Language Models (LLMs) and network latency by wrapping AI processing in strict validation boundaries and robust retry mechanisms.

---

## 1. System Architecture

The application is structured as a decoupled monorepo containing:
- **Frontend**: A Next.js (App Router) client handling file parsing, chunking, state management, and real-time progress streaming.
- **Backend**: A lightweight Node.js/Express microservice dedicated to AI orchestration, schema validation, and exponential backoff strategies.

By isolating the AI orchestration in the backend, we protect API keys, enable horizontal scaling of the processing workers, and strictly enforce the API boundary between client and server.

---

## 2. Request Flow

1. **Client Parsing**: The user drops a CSV file into the frontend. `PapaParse` reads and sanitizes the file locally in the browser (handling files of any size without overwhelming server memory).
2. **Chunking**: The frontend breaks the parsed data into manageable chunks (e.g., 20 rows per batch) and places them into an asynchronous task queue.
3. **Concurrent Dispatch**: The frontend dispatches multiple batches concurrently (controlled by `NEXT_PUBLIC_AI_CONCURRENCY`) to the backend via the `/api/v1/process/batch` endpoint.
4. **Backend Extraction**: The backend validates the payload via Zod, constructs the prompt, and sends the chunk to the Groq LLM.
5. **Validation & Integrity**: The backend enforces strict mathematical integrity (Input Rows === Output Records). If the LLM swallows data, it is rejected and retried.
6. **Streaming Response**: As each batch succeeds (or permanently fails), the frontend updates the live Results Table and the Progress Bar.
7. **Partial Success Dashboard**: Upon completion, the user is presented with a metrics dashboard displaying successful extractions, intentionally skipped rows, and failed batches.

---

## 3. Frontend

The frontend is built for responsiveness and graceful degradation.

- **Componentized State Machine**: The UI flow is broken into decoupled components (`Dropzone`, `PreviewCard`, `ProgressCard`, `SummaryDashboard`) managed by a unified `useProcessing` hook.
- **Resilient Concurrency**: The batching engine utilizes `Promise.allSettled()` instead of `Promise.all()`. If a single batch fails after maximum retries due to network instability, the engine logs the failure and continues processing the remaining batches, preventing complete data loss.
- **Client-side Sanitization**: Strings exceeding maximum token limits are truncated locally before transmission, reducing 413 Payload Too Large errors and optimizing AI token usage.

---

## 4. Backend

The backend is intentionally minimal, avoiding "Enterprise Java" anti-patterns (like unnecessary Dependency Injection containers or overly abstracted Services) in favor of idiomatic, functional Node.js.

- **`extractor.ts`**: The core domain logic. It handles the LLM prompt construction, structured JSON generation, and backoff retries in a single, pure async function.
- **`routes.ts`**: The Express API layer. It executes inline Zod validation on incoming requests before passing them to the extractor.

---

## 5. AI Pipeline

GridSense relies on Groq's Llama 3.1 70B model to perform semantic mapping. 

- **Zero-Shot Mapping**: The AI does not rely on predefined column headers. It reads the raw data and semantically deduces which fields correspond to the standard CRM schema.
- **Structured Outputs**: We utilize `zod-to-json-schema` to dynamically generate a strict JSON schema that the LLM must adhere to. The prompt explicitly requires `response_format: { type: 'json_object' }`.
- **Few-Shot Prompting**: The system prompt includes a minimal few-shot example to guide the model on formatting Edge Cases (like combining First and Last names into a single `name` string).

---

## 6. Batch Processing & Integrity

Batching is strictly required when processing files with AI due to context window limits.

- **Integrity Verification**: LLMs are known to hallucinate by silently dropping rows when processing lists. GridSense enforces an absolute length check: if a batch of 20 rows is sent, 20 objects must be returned. If not, the backend throws an `IntegrityError` and retries the batch.
- **Intentional Skips**: If the LLM determines a row is completely unmappable (e.g. empty data), it returns an object of `null` values. The backend recognizes this as an "intentional skip", filtering it from the successful records while logging it in the metrics payload.

---

## 7. Retry Logic

Network requests to LLM providers are inherently volatile due to global rate limits (HTTP 429) and transient model errors (HTTP 500+).

GridSense employs a sophisticated **Exponential Backoff with Jitter** strategy:
- The base delay is determined by the HTTP status code (e.g., 3000ms for 429s, 1000ms for 500s).
- The delay increases exponentially based on the attempt number: `baseDelay * 2^(attempt - 1)`.
- A random jitter (up to 1000ms) is added to prevent the "thundering herd" problem when multiple concurrent batches retry simultaneously.

---

## 8. Validation

Data correctness is enforced at the system boundaries:
1. **Request Validation**: The Express route strictly validates `ProcessBatchRequestSchema` via Zod before attempting to communicate with the LLM.
2. **Response Validation**: The output from the LLM is parsed and validated against `CrmRecordSchema`. Any properties that hallucinate outside of the defined schema are stripped out.

---

## 9. Future Improvements

While this architecture is robust, a transition to a full-scale SaaS platform would benefit from the following enhancements:

- **Asynchronous Webhooks**: Moving from HTTP Request/Response to a Webhook or WebSocket architecture for extremely large files (100k+ rows) to prevent browser timeout limits.
- **Dedicated Queue System**: Swapping the in-memory array concurrency model for Redis and BullMQ to provide persistent jobs, pause/resume functionality, and distributed processing.
- **Shared Workspace**: Extracting the duplicated Zod schemas into a shared `packages/schema` workspace to enforce a single source of truth across the monorepo.
- **Cost Analytics**: Tracking Groq token usage per batch to implement user-level billing and rate-limiting.
