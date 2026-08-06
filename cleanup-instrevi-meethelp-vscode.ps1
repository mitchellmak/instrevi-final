param(
  [string]$InstreviPath = 'C:\Users\Mitch\OneDrive\Desktop\Instrevi'
)

$ErrorActionPreference = 'Stop'

$workspaceStorage = Join-Path $env:APPDATA 'Code\User\workspaceStorage'
$instreviWorkspaceId = '7950e6c6e0302ca61fceb8888917948a'
$meethelpWorkspaceId = '89b1be934e1b59f523e75f91da2133d8'

$instreviCache = Join-Path $workspaceStorage $instreviWorkspaceId
$meethelpCache = Join-Path $workspaceStorage $meethelpWorkspaceId

Write-Host 'Closing VS Code processes...'
Get-Process -Name Code -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host 'Removing cached workspace data...'
foreach ($path in @($instreviCache, $meethelpCache)) {
  if (Test-Path $path) {
    Remove-Item -Recurse -Force $path
    Write-Host "Removed: $path"
  } else {
    Write-Host "Not found: $path"
  }
}

Write-Host 'Reopening Instrevi workspace only...'
if (Get-Command code -ErrorAction SilentlyContinue) {
  & code "$InstreviPath"
  Write-Host 'Done.'
} else {
  Write-Host 'Cleanup complete, but VS Code CLI command (code) was not found in PATH.'
  Write-Host "Open this folder manually: $InstreviPath"
}
