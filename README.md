<div align="center">
  <h1>GridSense</h1>
  <p><strong>Intelligent Data Pipeline & Schema Mapping Engine</strong></p>

  <p>
    <a href="https://github.com/notUbaid/GridSense"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://github.com/notUbaid/GridSense"><img src="https://img.shields.io/badge/Express.js-Backend-blue?style=for-the-badge&logo=express" alt="Express.js" /></a>
    <a href="https://github.com/notUbaid/GridSense"><img src="https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-orange?style=for-the-badge&logo=google" alt="AI Engines" /></a>
    <a href="https://github.com/notUbaid/GridSense"><img src="https://img.shields.io/badge/Testing-Vitest-yellow?style=for-the-badge&logo=vitest" alt="Vitest" /></a>
    <a href="https://github.com/notUbaid/GridSense"><img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel" /></a>
  </p>
</div>

<br />

> GridSense is a highly engineered, production-ready extraction and transformation engine. It leverages dynamic AI fallback models to intelligently map unstructured CSV data into a strict CRM schema, maintaining data integrity through aggressive validation and automated retry mechanisms.

---

## Architecture Overview

This project is built as a unified monorepo to ensure seamless end-to-end type safety, deterministic builds, and synchronized deployments.

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 15, React 19, Tailwind CSS v4, Lucide Icons, Shadcn UI |
| **Backend** | Node.js, Express, Zod, Pino, Groq SDK, Google Generative AI |
| **Testing** | Vitest (Integration & Unit), MockAIProvider |
| **CI/CD** | ESLint, Prettier, Husky, Lint-Staged, Vercel |

<br />

## Engineering Highlights

### Dual-AI Fallback System
Engineered for absolute resilience. The backend primarily utilizes Groq (`llama-3.3-70b-versatile`) for extreme-speed inference. If Groq encounters a `429 Too Many Requests` rate limit, the system gracefully traps the error and seamlessly hands off processing to Google Gemini (`gemini-1.5-flash`), eliminating data drop-offs and manual intervention.

### Smart Asynchronous Processing Queue
Large datasets are dynamically chunked and processed through a concurrent worker pool. The frontend continuously monitors batch health, rendering real-time performance metrics, elapsed time, and dynamic ETA calculations. Rate limits trigger intelligent, localized auto-pauses rather than global failures.

### Deterministic Testing Infrastructure
AI applications are notoriously difficult to test due to non-deterministic outputs. GridSense utilizes a custom `MockAIProvider` during the `NODE_ENV=test` runtime. This intercepts LLM requests and injects highly predictable, strictly-typed mock responses, allowing Vitest to execute full pipeline integration tests in milliseconds.

<br />

## Development Setup

<details>
<summary><strong>1. Prerequisites</strong></summary>
<br>

- Node.js (v18+)
- npm
- Git

</details>

<details>
<summary><strong>2. Installation</strong></summary>
<br>

Clone the repository and install dependencies from the root directory. The root package manager will automatically bootstrap the workspaces and initialize Husky hooks.

```bash
git clone https://github.com/notUbaid/GridSense.git
cd GridSense
npm install
```
</details>

<details>
<summary><strong>3. Environment Configuration</strong></summary>
<br>

Copy the `.env.example` file to create your environment variables. 

```bash
cp .env.example .env
cp .env.example backend/.env
```
*Ensure you populate `GROQ_API_KEY` and `GEMINI_API_KEY` with your respective provider credentials.*
</details>

<details>
<summary><strong>4. Execution</strong></summary>
<br>

GridSense uses `concurrently` to orchestrate the dev servers. A single command spins up both environments.

```bash
npm run dev
```
- **Frontend Network:** `http://localhost:3000`
- **Backend Network:** `http://localhost:8000`
</details>

<br />

## Testing & Quality Control

Execute the **Vitest** test suite to validate the extractor logic and API routes:
```bash
npm run test
```

Execute the linter across all workspaces to enforce style guidelines:
```bash
npm run lint
```

<br />

## Deployment

The application is configured for zero-configuration deployments on **Vercel**. 

The `vercel.json` dictates routing, rewriting `/api/v1/*` requests directly to the Express serverless functions within the `backend/` directory. Ensure your production environment variables are properly mapped in the Vercel dashboard prior to deployment.

---
<div align="center">
  <sub>Built with precision and engineered for scale.</sub>
</div>
