# Stops the local dev Postgres + Redis instances started by dev-db-start.ps1.
$root = Split-Path -Parent $PSScriptRoot
$pg = "$root\.tools\postgres\bin"
$pgData = "$root\.tools\pgdata"

Write-Host "Stopping Postgres..."
& "$pg\pg_ctl.exe" -D $pgData stop -m fast

Write-Host "Stopping Redis..."
Get-Process redis-server -ErrorAction SilentlyContinue | Stop-Process -Force
