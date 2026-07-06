# PRD.md

# AI Universal CRM Importer

**Version:** 1.0

**Status:** Draft

**Author:** Ubaid Khan

---

# 1. Product Overview

## Problem Statement

Businesses receive lead data from numerous sources including Facebook Lead Ads, Google Ads, Excel spreadsheets, CRMs, real estate portals, marketing agencies, and manually maintained spreadsheets.

Every source exports CSV files with completely different structures, inconsistent column names, varying data quality, duplicated information, and missing fields.

Traditional CSV importers require users to manually map every column before importing.

This process is slow, frustrating, and prone to human error.

The goal of this product is to eliminate manual mapping by using Artificial Intelligence to intelligently understand uploaded datasets and automatically transform them into a standardized CRM format.

---

# 2. Vision

Create an AI-powered CSV import system capable of understanding virtually any spreadsheet structure and converting it into clean CRM records with minimal user intervention.

The system should behave like an intelligent data analyst instead of a traditional importer.

---

# 3. Goals

* Accept CSV files from any source.
* Require zero manual column mapping.
* Automatically identify CRM fields using AI.
* Skip invalid records.
* Normalize inconsistent values.
* Produce structured CRM-ready output.
* Provide a modern, responsive user experience.
* Handle thousands of records efficiently.

---

# 4. Non Goals

The following are intentionally out of scope for Version 1.

* User authentication
* Multi-user support
* Database persistence
* CRM integrations
* Editing imported records
* Exporting to third-party CRMs
* Scheduled imports
* AI fine-tuning
* Learning from previous imports

---

# 5. Target Users

### Sales Teams

Import lead exports from advertising platforms.

### Marketing Agencies

Import campaign leads from multiple clients.

### Real Estate Companies

Convert portal exports into CRM format.

### Small Businesses

Upload manually maintained Excel sheets.

### CRM Administrators

Reduce manual data cleaning effort.

---

# 6. Success Metrics

* 95%+ field extraction accuracy
* Zero manual mapping required
* Import time under 30 seconds for average files
* Skip invalid records correctly
* Responsive UI on desktop and mobile
* Minimal AI hallucinations
* Structured JSON returned for every valid record

---

# 7. Functional Requirements

---

## Step 1 — Upload CSV

Users can upload a CSV file using:

* Drag & Drop
* File Picker

Validation:

* Accept only CSV
* Show filename
* Show file size
* Reject empty files
* Reject malformed CSV

---

## Step 2 — CSV Preview

After upload:

* Parse CSV locally
* No AI processing
* Display first records
* Responsive table
* Horizontal scrolling
* Vertical scrolling
* Sticky header
* Row count
* Column count

Users should verify data before processing.

---

## Step 3 — Confirm Import

A confirmation screen should display:

* File name
* Number of rows
* Number of columns
* Preview

When the user clicks:

**Import**

The frontend uploads the parsed CSV to the backend.

---

## Step 4 — AI Processing

Backend performs:

1. Parse CSV
2. Normalize records
3. Split into batches
4. Generate AI prompt
5. Send to LLM
6. Validate AI output
7. Repair invalid fields
8. Merge batches
9. Return structured JSON

---

## Step 5 — Results

Display:

Imported Records

Skipped Records

Total Imported

Total Skipped

Processing Time

Each record should clearly indicate whether it was successfully imported.

---

# 8. CRM Schema

Every imported record should follow this schema.

```text
created_at
name
email
country_code
mobile_without_country_code
company
city
state
country
lead_owner
crm_status
crm_note
data_source
possession_time
description
```

---

# 9. AI Requirements

The AI must intelligently understand arbitrary datasets.

Examples of possible column names include:

Customer

Client Name

Prospect

Person

Lead

Contact Name

Owner

Phone

Phone Number

Primary Contact

Mobile

Cell

Contact Number

Email Address

Email ID

Mail

Comments

Remarks

Notes

Description

Follow Up

Status

Lead Status

Location

Region

Town

The system must not depend on fixed column names.

---

# 10. AI Rules

## Status Values

Only allow:

* GOOD_LEAD_FOLLOW_UP
* DID_NOT_CONNECT
* BAD_LEAD
* SALE_DONE

Anything else should be mapped when confidence is high.

Otherwise leave blank.

---

## Data Source Values

Only:

* leads_on_demand
* meridian_tower
* eden_park
* varah_swamy
* sarjapur_plots

Otherwise:

Leave blank.

---

## Date

Must produce JavaScript compatible dates.

---

## Multiple Emails

Use:

First email

Remaining emails:

Append to crm_note.

---

## Multiple Phone Numbers

Use:

First phone

Remaining phones:

Append to crm_note.

---

## Missing Contact Information

If both email and mobile are missing:

Skip record.

---

## Hallucination Prevention

The AI must never invent values.

Unknown values should remain empty.

---

# 11. Prompt Engineering Strategy

System Prompt responsibilities:

* Understand arbitrary spreadsheets
* Infer semantic meaning
* Never hallucinate
* Preserve existing information
* Return structured JSON
* Follow CRM schema exactly
* Skip invalid records
* Normalize status values
* Normalize data source values

Few-shot examples should be included for better extraction quality.

---

# 12. Batch Processing

Large CSVs should never be sent in a single request.

Pipeline:

CSV

↓

Rows

↓

Batch (20–30 rows)

↓

LLM

↓

Validation

↓

Merge

↓

Response

Benefits:

* Lower token usage
* Better accuracy
* Easier retries
* Lower latency

---

# 13. Validation Layer

Every AI response must be validated.

Checks include:

Required object structure

Correct field names

Allowed enum values

Date validity

Email format

Phone normalization

Invalid records should never reach the frontend.

---

# 14. Retry Strategy

If an AI request fails:

Retry automatically.

Retry policy:

Attempt 1

↓

Attempt 2

↓

Attempt 3

↓

Fail batch

Only failed batches should retry.

Entire imports should never restart.

---

# 15. Error Handling

Frontend should display:

Invalid file

Malformed CSV

Upload failed

AI unavailable

Import failed

Network error

Large file warning

Unexpected server error

Backend should return meaningful error messages.

---

# 16. Edge Cases

Duplicate columns

Missing headers

Extra headers

Blank rows

Merged columns

Multiple phones

Multiple emails

Unknown status

Random notes

Extra whitespace

Unicode text

Quoted commas

Escaped newlines

Very large CSV

Duplicate records

Empty values

International phone numbers

International addresses

---

# 17. Performance Requirements

Preview should render within:

2 seconds

Average import:

<30 seconds

Support:

5,000+ rows

Memory efficient parsing

Incremental processing

---

# 18. Security

Validate uploaded files.

Limit upload size.

Prevent malicious CSV injection.

Escape output where required.

Never expose API keys.

Environment variables only.

---

# 19. Accessibility

Keyboard navigation

Proper labels

Screen reader support

Focus indicators

Responsive layouts

Color contrast compliance

---

# 20. User Experience

Loading indicators

Progress bars

Success notifications

Error toasts

Responsive tables

Sticky headers

Dark mode

Empty states

Helpful error messages

No page refreshes

---

# 21. API Design

## POST

/api/upload

Uploads CSV.

Returns preview.

---

## POST

/api/import

Processes CSV using AI.

Returns CRM records.

---

## GET

/api/health

Returns server status.

---

# 22. Suggested Project Structure

```text
frontend/

app/

components/

hooks/

lib/

types/

backend/

src/

controllers/

routes/

services/

csv/

ai/

prompts/

validation/

schemas/

utils/
```

---

# 23. Tech Stack

Frontend

* Next.js
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Table
* PapaParse

Backend

* Node.js
* Express
* TypeScript

Validation

* Zod

AI

* Gemini / OpenAI / Claude

Deployment

* Vercel
* Railway

---

# 24. Future Enhancements

Support XLSX

Support TSV

Support Google Sheets

Manual AI correction

Confidence scores

Column mapping suggestions

Streaming imports

Webhook integrations

CRM exports

Learning user preferences

Duplicate detection

Incremental syncing

Import history

Audit logs

Role-based access

Analytics dashboard

---

# 25. Definition of Done

The project is considered complete when:

* CSV upload works.
* Preview renders correctly.
* AI extracts CRM fields accurately.
* Invalid records are skipped.
* Structured JSON is returned.
* Results table displays imported and skipped records.
* Responsive UI works across devices.
* Error handling is implemented.
* README includes setup instructions.
* Application is deployed.
* GitHub repository is public.
* Code follows clean architecture principles.
