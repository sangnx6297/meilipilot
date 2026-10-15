$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root "build\bin"
$src = Join-Path $PSScriptRoot "payload"
$dst = Join-Path $bin "payload"

if (-not (Test-Path (Join-Path $src "deps.json"))) {
    throw "Thieu installer/payload/deps.json - chay installer/vendor-deps.ps1"
}

New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item -Path (Join-Path $src "*") -Destination $dst -Force

$deps = Get-Content -Raw -Path (Join-Path $dst "deps.json") | ConvertFrom-Json
$file = $deps.webview2.file
if (-not $file) { throw "deps.json thieu webview2.file" }
$pinned = Join-Path $dst $file
if (-not (Test-Path $pinned)) {
    throw "Thieu $pinned - chay installer/vendor-deps.ps1"
}
Write-Host "Goi Setup: $bin"
Write-Host "  MeiliPilot.exe + MeiliPilot-Setup.exe + payload\$file"
