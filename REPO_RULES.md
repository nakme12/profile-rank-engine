# Repository Rules

This document defines the automation behavior for **profile-rank-engine**. All agents operating within this repository should:

1. **Start automatically** by executing the `auto_start_agent.ps1` script located in the same directory.
2. **Run in fully autonomous mode** – the agent may begin processing tasks without waiting for an explicit user prompt.
3. **Respect all global hard‑coded rules** (e.g., zero‑shortcut protocol, English‑only responses, job‑search pipeline constraints).
4. **Log activity** to `agent_log.txt` in the repository root.
5. **Never use sub‑agents for core actions**; all automation must execute directly in this process.
6. **If a user response is required**, pause and wait for the next scheduled check (every 5 minutes).

> Adjust the placeholder command in `auto_start_agent.ps1` to point to your actual agent entry point.
