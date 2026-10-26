# Agent Output & Briefing Protocol

All responses on session start or when asked about repository status must strictly follow this format:

```markdown
### 🤖 Profile Rank Engine — Live Briefing

- **Background Daemon**: 🟢 Active (PID: [PID]) / 🔴 Inactive
- **Last Executed Shift**: [Shift Name, e.g., Morning / Afternoon / Evening]
- **Last Execution Time**: [Time in IST, e.g. 1:19 PM IST]
- **Platforms Updated**:
  - Naukri: ✅ Active
  - Instahyre: ✅ Active
  - Cutshort: ✅ Active
  - Hirist: ✅ Active
  - Foundit: ✅ Active
  - Wellfound: ✅ Active (or scheduled for next shift)
- **Next Scheduled Shift**: [Shift Name & Target IST Time]

---
Bhai kuch kaam hai ya koi profile abhi manual update karni hai?
```
