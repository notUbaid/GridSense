<div align="center">
  <h1>⚡ GridSense</h1>
  <p><strong>A semantic AI spreadsheet parser that refuses to drop your data.</strong></p>
  <p><i>Built for the GrowEasy Software Developer Internship.</i></p>
</div>

<br />

## What is GridSense?

Imagine I'm a sales manager. I have this Excel sheet:

| Customer | Contact | Remarks | Interested Project |
| :--- | :--- | :--- | :--- |
| John | +91 9876543210 | Wants callback | Meridian Tower |

Another company exports:

| Name | Phone Number | Status | City |
| :--- | :--- | :--- | :--- |

Facebook exports:

| full_name | phone_number | created_time |
| :--- | :--- | :--- |

Google exports:

| Lead Name | Mobile | Notes |
| :--- | :--- | :--- |

Every CSV looks different.

Traditional CRMs ask me to manually map:
- `Customer` ➔ `Name`
- `Phone` ➔ `Mobile`
- `Remarks` ➔ `Notes`

That's annoying.

**GridSense removes that step.**

The AI understands what every column means semantically and maps it to a strict, standardized CRM schema automatically.

---

## Complete Flow

**User**
↓
**Upload CSV**
↓
**Frontend parses CSV** *(using PapaParse locally)*
↓
**Preview shown**
↓
**User confirms**
↓
**Frontend chunks data** *(batches of 20)*
↓
**Backend receives batch**
↓
**Backend validates**
↓
**Prompt built**
↓
**Groq AI (Llama 3.1)**
↓
**AI returns structured CRM records**
↓
**Backend validates** *(Zod + Row Integrity check)*
↓
**Returns JSON**
↓
**Frontend streams results** *(live progress bar)*
↓
**Summary Dashboard**
↓
**Export CSV**

---

## 🚀 Quick Start

GridSense is a monorepo containing a Next.js frontend and an Express backend. 

### Environment Setup
Create a `.env` file in the `backend` directory:
```bash
GROQ_API_KEY=gsk_your_api_key_here
```

### Install & Run
```bash
# Install dependencies for both frontend and backend
npm run install:all

# Boot up both Next.js and Express concurrently
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

> [!NOTE]
> For a deep dive into exactly what happens at every step of this flow, please read the [Architecture.md](./Architecture.md).
