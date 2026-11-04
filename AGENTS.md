# PROJECT RULES & IRONCLAD CONSTRAINTS: AUTONOMOUS APPLY & OUTREACH ENGINE

> [!IMPORTANT]
> These rules are mandatory, permanent, and must NEVER be violated or bypassed in any session, under any circumstances.

---

## 1. Candidate Profile & Target Roles
* **Candidate:** Pratik Patidar (Indore, Madhya Pradesh)
* **Experience Tier:** 0–2 YOE (Fresher, Associate, Junior, SDE-1)
* **Core Tech Stack:** React.js, Next.js, TypeScript, JavaScript, Node.js, Express, Tailwind CSS, Redux, Frontend-heavy Full Stack.
* **Location Priority:** Indore top priority, followed by Remote and Major Hubs (Bangalore, Pune, Delhi-NCR, Hyderabad).

### Hard Exclusions (Strict Reject):
* **Senior / Lead / Architect Roles:** > 2 YOE, Senior, Lead, Staff, Principal, Architect, Manager, SDE-2, SDE-3.
* **Non-Web / Conflicting Stacks:** Pure Java Backend, Spring Boot, Hibernate, C# / .NET / ASP.NET, Angular, Python Backend (Django/Flask), PHP, Laravel, WordPress, Salesforce / Apex, SAP / ABAP, SCADA, PLC.
* **Mobile / QA / Other:** Android, iOS, Flutter, React Native, QA / Testing / Automation, DevOps / SRE, IT Admin, Sales, Graphics Designer, Telecaller.

---

## 2. Strict Date Freshness Rule (MAX 3 DAYS / <= 72 HOURS)
* **Zero Tolerance for Old Postings:** The candidate must ONLY be applied to jobs posted within the last 3 days (0, 1, 2, or 3 days old).
* **Fail-Closed Architecture:** If date cannot be verified with 100% certainty from API, URL, or DOM text, **DISCARD BY DEFAULT**. Never silently fallback to "Recently Posted" or assume fresh.

---

## 3. Deep Live JD Tech Stack Audit
* Never rely on job title alone. Recruiters put generic or masked titles (e.g. "Frontend Developer (AI)" requiring .NET).
* Always inspect the full live Job Description (JD) text before submitting.
* Must match at least one candidate core skill (`React`, `Next`, `TypeScript`, `JavaScript`, `Node`, `Tailwind`, `Redux`, `Frontend`, `Full Stack`).
* Must DISCARD immediately on any hard-banned keyword using word-boundary regex (`\b`).

---

## 4. Live Proof & Zero Phantom Logging
* A job or outreach email is ONLY recorded in database/logs if:
  1. Live DOM or network confirms success (e.g. "Applied", "Application sent", "Undo ·", or Gmail Sent folder DOM physical match).
* External site redirects ("Apply on company site") must **NEVER** be counted in direct applied numbers; save them to `data/external_leads.json`.

---

## 5. Lightweight Resume Compliance (< 500 KB)
* All resume uploads and attachments must use canonical optimized PDFs from `C:\mcp\shared-data\resumes\`:
  - `Pratik_Patidar_Resume_Full_Stack_Developer.pdf` (85 KB)
  - `Pratik_Patidar_Resume_Frontend_Engineer.pdf` (171 KB)
* Never attach unoptimized heavy PDFs (> 2 MB) that trigger upload timeouts or portal rejection.

---

## 6. Shared Mistakes Ledger Protocol (Mandatory on Every Session)
* On startup, ALWAYS read `C:\mcp\shared-data\MISTAKES_LEDGER.md`.
* If you discover ANY new portal-specific trap, selector failure, button transition bug, anti-bot challenge, or pagination flaw:
  - **IMMEDIATELY APPEND** it to `C:\mcp\shared-data\MISTAKES_LEDGER.md` under `### 🔴 Blunder #X`.
  - Save the file so that all other autonomous agents in `C:\mcp` inherit that knowledge automatically.

---

## 7. Permanence
* Any session or agent working in this repo must adhere to these rules without exception.
* Never rush. Accuracy, fail-closed safety, and genuine candidate protection always supersede speed.
