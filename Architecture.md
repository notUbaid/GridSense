# GridSense Architecture & Request Flow

GridSense handles the inherent unpredictability of Large Language Models (LLMs) and network latency by wrapping AI processing in strict validation boundaries.

Here is the exact step-by-step technical flow of the application.

### Step 1: Landing
User opens `gridsense.vercel.app`. They immediately understand the core utility: upload *any* CSV and it will be normalized.

### Step 2: Client-Side Parsing
User uploads an arbitrary file (e.g., `facebook_leads.csv`). Nothing AI-related happens yet. 
`PapaParse` runs locally in the browser to convert the CSV into a JSON array:
```json
[
 {
   "Full Name": "John",
   "Phone": "9876543210",
   "Remarks": "Call tomorrow"
 }
]
```
This is fully local. No server memory is consumed.

### Step 3: Data Preview
The user is shown a preview of the parsed data.
- **Rows:** 145
- **Columns:** 7
- **Sample Data:** Displays the first few rows (John, 9876543210, Call tomorrow).

This satisfies the initial assignment requirements. 

### Step 4: Execution Trigger
User clicks **Start AI Extraction**. NOW the backend is called.

### Step 5: Chunking & Concurrency
If a file has 500 rows, the frontend does not send all 500 rows at once. It sends them in chunks:
`20` ➔ `20` ➔ `20` ➔ `20` ...

**Why?**
- Cheaper (avoids massive token contexts).
- Faster (batches are processed concurrently).
- More accurate (LLMs hallucinate less on smaller lists).
- Easier to retry (a single failure doesn't ruin the whole 500-row import).

### Step 6: Backend Payload Validation
The backend receives 20 rows. The first thing it does is validate the shape of the request using Zod. If it's a bad request, it rejects it immediately before wasting any API calls.

### Step 7: Prompt Construction
The backend dynamically builds the prompt for this specific chunk:
> You are an expert CRM extractor. Convert these records.
> Rules: ...
> Rows: [...]

### Step 8: AI Processing (Groq)
Groq looks at the arbitrary column headers and semantically maps them:
- `Customer Name` ➔ `name`
- `Phone` ➔ `mobile`
- `Remarks` ➔ `crm_note`
- `Status` ➔ `GOOD_LEAD_FOLLOW_UP`

### Step 9: Structured Output
Groq returns a strictly formatted JSON array matching our CRM schema:
```json
[
 {
  "name": "John",
  "email": "",
  "phone_local": "9876543210",
  "crm_status": "GOOD_LEAD_FOLLOW_UP"
 }
]
```

### Step 10: Backend Response Validation
We don't trust the AI. The backend validates the AI's response again.
- **Zod Schema:** Does it strictly match `CrmRecordSchema`?
- **Mathematical Integrity:** Did we send 20 rows and get exactly 20 records back?

If it's correct ➔ Return to the frontend.
If it's wrong (hallucination, dropped rows, rate limit) ➔ Trigger exponential backoff and retry the batch.

### Step 11: Real-Time Streaming
Instead of making the user wait `████████████` for all 500 rows to finish, the frontend streams the progress via a live progress bar as batches resolve:
- 20 rows done...
- 40 rows done...
- 60 rows done...

### Step 12: Summary Dashboard
Once all batches resolve, a dashboard is shown:
- **Imported:** 432
- **Skipped:** 6 (intentionally skipped because both email and phone were missing)
- **Failed:** 1 Batch (data preserved via partial success)
- **Time:** 14.2s

### Step 13: Results Table
The normalized data is rendered in a clean TanStack table for final review.

### Step 14: Export
User clicks Download to get `crm_records.csv`. Done. 

That's literally the whole application.
