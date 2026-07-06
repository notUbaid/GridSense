<div align="center">
  <h1>🤝 Contributing to GridSense</h1>
  <p><strong>Guidelines and Instructions for Engineers</strong></p>
</div>

<br />

Welcome to GridSense! This document provides comprehensive guidelines and instructions for engineers who wish to contribute to the project, maintain code quality, or scale the infrastructure.

---

## 🏗️ Architecture Overview

GridSense is orchestrated as a unified monorepo to guarantee parity between the frontend interface and the backend processing engine.

- **Frontend (`/frontend`)**: A Next.js 15 application utilizing React 19, Tailwind CSS v4, and Shadcn UI components.
- **Backend (`/backend`)**: An Express.js REST API deployed as a Vercel Serverless Function. It features a robust dual-AI fallback engine integrating both the **Groq SDK** and **Google Generative AI**.

<br />

## 🛠️ Prerequisites

Before contributing, ensure your local development environment meets the following baseline requirements:

- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- **Git**
- A valid **Groq API Key** (`GROQ_API_KEY`)
- A valid **Google Gemini API Key** (`GEMINI_API_KEY`)

<br />

## 🚀 Getting Started

Follow these steps to bootstrap the monorepo on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/notUbaid/GridSense.git
cd GridSense
```

### 2. Install Dependencies
Running `npm install` in the root directory will automatically execute the post-install scripts and initialize Husky hooks.
```bash
npm install
```

### 3. Environment Configuration
Copy the `.env.example` templates to both the root and the backend directory to provide the necessary variables.
```bash
cp .env.example .env
cp .env.example backend/.env
```
Ensure you update the `.env` files with your actual API keys.

### 4. Run the Development Servers
Use the root orchestration command to concurrently start both the Next.js frontend and the Express backend.
```bash
npm run dev
```

<br />

## 📏 Code Standards & Conventions

To maintain a high-quality codebase, we enforce strict formatting and linting rules.

- **Pre-commit Hooks:** Husky and lint-staged are configured to automatically run ESLint and Prettier on staged files before a commit is allowed.
- **Commit Messages:** We strongly recommend following the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat:`, `fix:`, `docs:`, `chore:`).

### Manual Linting
You can manually run the linter across all workspaces to verify compliance:
```bash
npm run lint
```

<br />

## 🧪 Testing Infrastructure

GridSense relies on **Vitest** for integration and unit testing. The testing suite uses a custom `MockAIProvider` to bypass network requests to LLMs, ensuring tests are deterministic and execute in milliseconds.

To run the backend test suite:
```bash
npm run test
```
*Note: Ensure you are writing tests for any new extraction logic or schema modifications.*

<br />

---
<div align="center">
  <sub>Thank you for helping us build intelligent data infrastructure.</sub>
</div>
