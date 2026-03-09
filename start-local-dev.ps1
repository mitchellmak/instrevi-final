$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSCommandPath
$serverDir = Join-Path $root 'server'
$clientDir = Join-Path $root 'client'

function Stop-NodeByPattern {
  param([string]$Pattern)

  $procs = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'node.exe' -and $_.CommandLine -match $Pattern
  }

  foreach ($proc in $procs) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped PID=$($proc.ProcessId) ($Pattern)"
    } catch {
      Write-Host "Skip PID=$($proc.ProcessId): $($_.Exception.Message)"
    }
  }
}

function Stop-ListenerOnPort {
  param([int]$Port)

  $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    try {
      Stop-Process -Id $listener.OwningProcess -Force -ErrorAction Stop
      Write-Host "Stopped listener PID=$($listener.OwningProcess) on port $Port"
    } catch {
      Write-Host "Skip listener PID=$($listener.OwningProcess) on port ${Port}: $($_.Exception.Message)"
    }
  }
}

Write-Host 'Resetting local dev processes...'
Stop-ListenerOnPort 3000
Stop-ListenerOnPort 5000
Stop-NodeByPattern 'react-scripts\\scripts\\start.js'
Stop-NodeByPattern 'nodemon\\bin\\nodemon.js'
Stop-NodeByPattern 'localtunnel'

Write-Host 'Starting backend (server)...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$serverDir'; npm run dev" | Out-Null

Write-Host 'Starting frontend (client)...'
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$clientDir'; Remove-Item Env:REACT_APP_API_URL -ErrorAction SilentlyContinue; npm start" | Out-Null

Write-Host ''
Write-Host 'Local dev started in new terminals.'
Write-Host 'Frontend: http://localhost:3000'
Write-Host 'Backend:  http://localhost:5000'
