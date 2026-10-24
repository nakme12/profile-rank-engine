# Auto‑start Agent Template

# This script should be placed in each repository folder.
# Replace the placeholder command with the actual entry point for your agent.

Write-Host "[Agent] Starting autonomous mode for repository $(Split-Path -Parent $MyInvocation.MyCommand.Path)"

# Example placeholder – adjust as needed:
# & "C:\Path\To\Your\AgentExecutable.exe" --config "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\REPO_RULES.md"
