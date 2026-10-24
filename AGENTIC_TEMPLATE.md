# Agentic Entry Protocol & Guardrails

## STEP 1 – Connect & Audit Live Browser
- The agent must connect to a live Chrome/Brave instance on `http://127.0.0.1:9222`.
- List open tabs via `chrome-devtools:list_pages`.
- **Purpose:** Identify active contractor sessions (Mercor, Mindrift/Toloka, Handshake AI, OneForma).

## EXTENDED REQUIREMENT
After connecting, the agent **must**:
1. Recursively read every file in this repository and produce a concise purpose summary.
2. Open each platform’s portal (as identified from the repo) in the live browser; if missing, navigate to its URL using `chrome-devtools:navigate_page`.
3. Check for any new updates or pending tasks on each portal.
4. Log every action (connection, file reads, navigation, status checks).
5. Compile a single consolidated status report and send it to the user before proceeding further.

## EXECUTION GUARDRAILS
- Abort and report error if the browser connection fails.
- Verify identity routing before any login (secondary email `nakmeisiliya12@gmail.com` for Mercor, Handshake, Mindrift, Invisible, Prolific; primary email `pratikpatidar7990@gmail.com` for OneForma, Alignerr, Outlier, DataAnnotation).
- After each platform check, record a **status summary** (new tasks, pending actions, last‑update timestamp).
- Do **not** continue to any additional automation until the full report has been delivered and acknowledged by the user.

## QUICK CHECKLIST (Alt + M to send immediately)
1. Connect to browser (`http://127.0.0.1:9222`).
2. Read entire repo and summarise.
3. Open each platform portal, check updates, report.
4. Verify identity routing.
5. Follow the master runbook (`AGENT_HANDOFF_RUNBOOK.md`).

*These rules are mandatory for any agent that runs inside this repository.*