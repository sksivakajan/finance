# Starts the local dev Postgres + Redis instances used when Docker isn't
# available on this machine. See scripts/README.md for background.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pg = "$root\.tools\postgres\bin"
$pgData = "$root\.tools\pgdata"
$pgLog = "$root\.tools\pg.log"
$redisDir = "$root\.tools\redis"
$redisLog = "$root\.tools\redis.log"
$redisErrLog = "$root\.tools\redis.err.log"

Write-Host "Starting Postgres..."
& "$pg\pg_ctl.exe" -D $pgData -l $pgLog -o "-p 5432" start
& "$pg\pg_isready.exe" -p 5432

Write-Host "Starting Redis..."
$existing = Get-Process redis-server -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Redis already running (pid $($existing.Id))"
} else {
  Start-Process -FilePath "$redisDir\redis-server.exe" `
    -ArgumentList "--port 6379 --daemonize no" `
    -WorkingDirectory $redisDir -WindowStyle Hidden `
    -RedirectStandardOutput $redisLog -RedirectStandardError $redisErrLog
  Start-Sleep -Seconds 1
}
& "$redisDir\redis-cli.exe" -p 6379 ping
