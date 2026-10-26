# 🤖 Profile Rank Engine — Agent Intelligence & Bootstrap Protocol

> **CRITICAL DIRECTIVE FOR ALL AGENTS OPENING THIS REPOSITORY:**  
> Whenever an agent session starts, is reopened, or receives any initial prompt, the agent **MUST FIRST** execute the status command or inspect the state files to provide a comprehensive briefing before answering the user.

---

## ⚡ 1. MANDATORY AGENT STARTUP SEQUENCE (First Turn Protocol)
Whenever you start or open this workspace, immediately perform these steps before or within your first reply:

1. **Check Live Execution Status**:
   - Run `node scripts/status-brief.cjs` to fetch current background daemon status, shift execution dates, and latest cloud runs.
   - Or inspect:
     - `artifacts/scheduler-state.json` (shifts run today)
     - `artifacts/local-scheduler.log` (last local activity)
     - `gh run list -w "Daily Multi-Platform Profile Rank Booster" -L 1` (last cloud run)

2. **Present Live Briefing to User**:
   - **Daemon State**: Is the local cron daemon active (`PID`)?
   - **Last Run Time**: When was the last run completed?
   - **Profiles Updated**: Which platforms were refreshed (Naukri, Instahyre, Cutshort, Hirist, Foundit, Wellfound) and their status?
   - **Next Scheduled Shift**: When is the next shift due (Morning 8:45 AM, Afternoon 2:15 PM, Evening 6:45 PM IST)?

3. **Conclude with User Prompt**:
   - Always conclude your opening update with:  
     > *"Bhai kuch kaam hai ya koi specific profile abhi update karni hai?"*

---

## 🏗️ 2. Repository Architecture & Roles
- **Repo Name:** `profile-rank-engine`
- **Purpose:** Autonomous multi-platform daily profile rank booster (Naukri, Instahyre, Cutshort, Hirist, Foundit, Wellfound).
- **Core Files:**
  - `scripts/update-all.ts`: Master orchestrator running targeted shift updates.
  - `scripts/local-cron-daemon.cjs`: Persistent background watcher with offline catch-up sync.
  - `scripts/status-brief.cjs`: Quick diagnostic & status summarizer for agents.
  - `scripts/capture-session.ts`: Auto-detect login and save a session (fresh browser, or `--cdp` to reuse the user's running Brave on :9222). No terminal ENTER needed.
  - `scripts/verify-sessions.ts`: One-command session health check for all platforms.
  - `scripts/session-utils.ts`: Shared platform URLs, login-detection and rolling-refresh helpers.
  - `run_daemon_silent.vbs`: Background launcher without showing terminal window.
  - `.github/workflows/daily-profile-boost.yml`: Cloud runner on GitHub Actions.
  - `auth/`: Local session states (`naukri-state.json`, `instahyre-state.json`, etc.)
  - `artifacts/scheduler-state.json`: Daily record of executed shifts.

---

## 🛡️ 3. Strict Operating Rules
1. **Zero Function Breakage**: Never modify selectors or credentials logic in `scripts/update-*.ts` without explicit user request.
2. **Offline Catch-Up Engine**: Maintain `scheduler-state.json`. If a shift was missed while the system was offline or asleep, the daemon catches up automatically upon waking.
3. **No Root Clutter**: Never create scratch files in root. Use `artifacts/` or `scripts/`.
4. **Session Expiry Playbook**: Run `npx tsx scripts/verify-sessions.ts` first. If a platform is `EXPIRED`/`MISSING`, run `npx tsx scripts/capture-session.ts <platform> --cdp` (reuses the user's logged-in Brave) — do NOT ask the user to run multi-step commands manually.
5. **Never fetch/store credentials**: The agent never asks for or types passwords/OTPs. Only cookies from an already-authenticated browser may be captured.
