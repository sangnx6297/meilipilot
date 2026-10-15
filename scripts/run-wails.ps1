param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$WailsArgs
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$wails = Join-Path $env:USERPROFILE "go\bin\wails.exe"
$go = Get-Command go -ErrorAction SilentlyContinue
if ($go) {
    $gp = (& go env GOPATH).Trim()
    $cand = Join-Path $gp "bin\wails.exe"
    if (Test-Path $cand) { $wails = $cand }
}
if (-not (Test-Path $wails)) {
    throw "wails.exe not found at $wails. On Windows: go install github.com/wailsapp/wails/v2/cmd/wails@latest"
}
Write-Host "Using $wails $($WailsArgs -join ' ')"
& $wails @WailsArgs
exit $LASTEXITCODE
