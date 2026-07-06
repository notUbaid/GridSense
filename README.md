# GridSense

**Intelligent Data Pipeline & Schema Mapping Engine**

GridSense is a highly engineered, production-ready extraction and transformation engine. It leverages dynamic AI fallback models to intelligently map unstructured CSV data into a strict CRM schema, maintaining data integrity through aggressive validation and automated retry mechanisms.

## Architecture Overview

This project is built as a unified monorepo to ensure seamless end-to-end type safety, deterministic builds, and synchronized deployments.

* **Frontend:** Next.js 15, React 19, Tailwind CSS v4, Lucide Icons, Shadcn UI
* **Backend:** Node.js, Express, Zod, Pino (Structured Logging), Groq SDK, Google Generative AI SDK
* **Testing:** Vitest (Integration & Unit), MockAIProvider (Deterministic AI Mocks)
* **Quality Assurance:** ESLint, Prettier, Husky (Pre-commit hooks), Lint-Staged
* **Infrastructure:** Vercel (Serverless Functions & Edge Routing)

## Engineering Highlights

### Dual-AI Fallback System
Engineered for absolute resilience. The backend primarily utilizes Groq (`llama-3.3-70b-versatile`) for extreme-speed inference. If Groq encounters a `429 Too Many Requests` rate limit, the system gracefully traps the error and seamlessly hands off processing to Google Gemini (`gemini-1.5-flash`), eliminating data drop-offs and manual intervention.

### Smart Asynchronous Processing Queue
Large datasets are dynamically chunked and processed through a concurrent worker pool. The frontend continuously monitors batch health, rendering real-time performance metrics, elapsed time, and dynamic ETA calculations. Rate limits trigger intelligent, localized auto-pauses rather than global failures.

### Deterministic Testing Infrastructure
AI applications are notoriously difficult to test due to non-deterministic outputs. GridSense utilizes a custom `MockAIProvider` during the `NODE_ENV=test` runtime. This intercepts LLM requests and injects highly predictable, strictly-typed mock responses, allowing Vitest to execute full pipeline integration tests in milliseconds.

## Development Setup

### Prerequisites
* Node.js (v18+)
* npm

### Installation
Clone the repository and install dependencies from the root directory. The root package manager will automatically bootstrap the workspaces and initialize Husky hooks.

```bash
git clone https://github.com/notUbaid/GridSense.git
cd GridSense
npm install
```

### Environment Configuration
Copy the `.env.example` file to create your environment variables. 

```bash
cp .env.example .env
cp .env.example backend/.env
```
Ensure you populate `GROQ_API_KEY` and `GEMINI_API_KEY` with your respective provider credentials.

### Execution
GridSense uses `concurrently` to orchestrate the dev servers. A single command spins up both environments.

```bash
npm run dev
```
* Frontend Network: `http://localhost:3000`
* Backend Network: `http://localhost:8000`

## Testing & Quality Control

Execute the Vitest test suite to validate the extractor logic and API routes:
```bash
npm run test
```

Execute the linter across all workspaces:
```bash
npm run lint
```

## Deployment

The application is configured for zero-configuration deployments on Vercel. 
The `vercel.json` dictates routing, rewriting `/api/v1/*` requests directly to the Express serverless functions within the `backend/` directory. Ensure your production environment variables are properly mapped in the Vercel dashboard prior to deployment.
