# Profile Rank Booster Engine (Autonomous Multi-Platform)

Autonomous cloud & local multi-platform rank booster for **Naukri**, **Instahyre**, **Cutshort**, **Hirist**, **Foundit**, and **Wellfound**.

## 🚀 Key Highlights
- **Shift Schedule**:
  - **Morning** (08:45 AM IST): Naukri, Instahyre, Cutshort, Hirist, Foundit
  - **Afternoon** (02:15 PM IST): Naukri, Instahyre, Cutshort, Hirist, Foundit + Wellfound
  - **Evening** (06:45 PM IST): Wellfound (US timezone peak)
- **Offline Catch-Up Sync**: Automatically detects and catches up any missed shift if the local system was offline.
- **Telegram Notification**: Real-time markdown notification sent to Telegram after each shift run.
- **Hybrid Execution**: Dual-engine architecture running via **GitHub Actions** with local daemon monitoring.

## 📁 Repository Structure
```
profile-rank-engine/
├── .github/workflows/          # GitHub Actions cloud cron & on-demand runner
│   └── daily-profile-boost.yml
├── .agents/                    # Agent guidelines & prompt rules
├── auth/                       # Local session cookies & auth state (git-ignored)
├── resumes/                    # Active resume files used for re-upload boost
│   └── Pratik_Patidar_Resume.pdf
├── scripts/                    # Platform automation engines
│   ├── local-cron-daemon.cjs   # Daemon with offline catch-up sync
│   ├── capture-session.ts      # Auto-detect login & save session (CDP or fresh browser)
│   ├── verify-sessions.ts      # Session health check across all platforms
│   ├── session-utils.ts        # Shared platform config & session helpers
│   ├── notify-telegram.ts      # Telegram notification service
│   ├── setup-session.ts        # Interactive login & session cookie saver
│   ├── update-all.ts           # Orchestrator for all platforms
│   ├── update-cutshort.ts      # Cutshort rank updater
│   ├── update-hirist.ts        # Hirist rank updater
│   ├── update-foundit.ts       # Foundit (ex-Monster) rank updater
│   ├── update-naukri.ts        # Naukri rank updater
│   ├── update-instahyre.ts     # Instahyre rank updater
│   ├── update-profile-pic.ts   # Profile photo updater (Naukri / Wellfound / Instahyre)
│   └── update-wellfound.ts     # Wellfound rank updater
├── run_daemon_silent.vbs       # Silent background launcher for local daemon
└── package.json
```

## 🛠️ Commands
```bash
# Save a fresh login session (run when a portal session expires)
npx tsx scripts/setup-session.ts foundit

# Auto-detect login & save session without pressing ENTER (uses your running Brave on :9222)
npx tsx scripts/capture-session.ts foundit --cdp

# Health check: is every saved session still valid?
npx tsx scripts/verify-sessions.ts

# Update profile photo from assets/profile.jpeg (or PROFILE_PHOTO=/path/to/pic.jpg)
npx tsx scripts/update-profile-pic.ts all
npx tsx scripts/update-profile-pic.ts naukri

# Run on-demand update for all platforms
npm run update:all

# Run specific shift mode
npx tsx scripts/update-all.ts morning
npx tsx scripts/update-all.ts afternoon
npx tsx scripts/update-all.ts evening

# Start background daemon
wscript.exe run_daemon_silent.vbs
```
