# ðŸ¤– Agent Operations Guide: Profile Rank Engine

## 1. Repository Purpose & Architecture
**Repository:** $(System.Collections.Hashtable.Name)  
**Domain/Purpose:** Autonomous multi-platform daily profile rank booster and activity simulator (Naukri, Instahyre, Wellfound, Hirist).  
**Agent Role:** Simulates organic profile updates, headline refreshes, keyword optimization, and resume timestamp updates to maintain top search ranking.

## 2. Key Files & Entry Points
- `package.json`
- `src/`
- `scripts/`

## 3. Execution & Workflow
- **Standard Command / Trigger:** `npm start or node profile booster scripts.`
- Always verify environment variables, dependencies, and prerequisites before executing scripts.
- Never hardcode sensitive tokens or personal credentials directly into tracked files.

## 4. Cross-Agent Continuity
When switching between different autonomous agents:
1. Always read this file first before making changes or executing runs.
2. Maintain all existing state files and audit logs.
3. Keep user output structured and deterministic as specified in `OUTPUT_FORMAT.md`.
