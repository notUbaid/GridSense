<div align="center">
  <h1>⚡ GridSense</h1>
  <p><strong>A semantic AI spreadsheet parser that refuses to drop your data.</strong></p>
  <p><i>Built for the GrowEasy Software Developer Internship.</i></p>

  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img alt="Express.js" src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img alt="Groq" src="https://img.shields.io/badge/Groq-f55036?style=for-the-badge&logo=groq&logoColor=white" />
</div>

<br />

The core of this assignment wasn't just about parsing CSVs—it was about understanding spreadsheets whose column names and layouts are completely unpredictable (e.g., `"First Name"` vs. `"Name"` vs. `"Client"`). 

Instead of forcing the user into a brittle, manual column-mapping UI, **GridSense** uses an LLM to infer the semantic meaning of each row and normalize it directly into a standard CRM schema.

---

## 🧠 How it actually works

1. **Client-side Parsing**: You drop a CSV. `PapaParse` reads and sanitizes it entirely in the browser to prevent server memory bloat.
2. **Chunking & Concurrency**: The frontend slices the data into small batches (default 20 rows) and dispatches them concurrently using a `Promise.allSettled()` task queue. *A single network failure will not halt your entire import.*
3. **Semantic Extraction**: A lightweight Express backend intercepts the chunks, strictly validates the payloads, and passes them to an LLM (Groq Llama 3.1 70B). The AI uses zero-shot semantic deduction to map the messy rows into a strictly typed JSON CRM object.
4. **Integrity & Retries**: LLMs hallucinate and rate limits happen. The backend mathematically enforces input-to-output row counts. If the AI drops a row, or the network returns a `429`, the backend intercepts it and triggers a jittered exponential backoff mechanism.

> [!NOTE]
> For a deep dive into the engineering decisions, state machines, and API boundary design, please read the [Architecture.md](./Architecture.md).

---

## 🚀 Quick Start (Reviewer Guide)

I've set up a root package script so you don't have to fiddle with multiple terminals to review this submission.

### 1. Environment Setup

Create a `.env` file in the `backend` directory (or use the provided `.env.example` at the root as a template):
```bash
GROQ_API_KEY=your_groq_api_key
```

### 2. Install & Run

From the root directory of the repository, run:

```bash
# Install dependencies for root, frontend, and backend simultaneously
npm run install:all

# Boot up both Next.js and Express concurrently
npm run dev
```

The application will be running at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: `http://localhost:8000`

---

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui, PapaParse, TanStack Table
- **Backend**: Node.js, Express, Zod, Groq SDK, Pino
- **Tooling**: TypeScript, Concurrently
