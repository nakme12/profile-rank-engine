# Profile Rank Engine — Autonomous Multi-Platform Daily Rank Booster

Autonomous Playwright + GitHub Actions engine designed to keep your candidate profile ranked in the **Top 1%** across **Naukri**, **Instahyre**, and **Wellfound (AngelList)** by performing automated daily activity refreshes every morning at **9:00 AM IST**.

---

## 🎯 Supported Platforms:
1. **Naukri.com:** Automated resume re-upload & headline touch (Page 1 recruiter search placement).
2. **Instahyre.com:** Active candidate opportunities search ping ("Active Looking" priority badge).
3. **Wellfound.com:** Profile preferences & feed ping (DataDome/Cloudflare safe).

---

## 📱 How to Run from Mobile:
1. Open the **GitHub Mobile App**.
2. Navigate to this repository (`nakme12/profile-rank-engine`).
3. Go to **Actions** -> **Daily Multi-Platform Profile Rank Booster**.
4. Tap **Run workflow** -> Select `all` -> Tap **Run**.
5. Within 45 seconds, all 3 platforms will be refreshed in the cloud, and screenshots will be saved!

---

## ⚙️ Initial 1-Time Session Setup (Local PC):
Run the setup command to generate authenticated `state.json` without passwords:
```bash
# Naukri
npm run setup:naukri

# Instahyre
npm run setup:instahyre

# Wellfound
npm run setup:wellfound
```
Convert the generated `auth/*-state.json` to base64 and paste into GitHub Repository Secrets:
- `NAUKRI_AUTH_STATE`
- `INSTAHYRE_AUTH_STATE`
- `WELLFOUND_AUTH_STATE`
