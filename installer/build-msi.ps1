# Build MeiliPilot.msi (WiX) — equivalent of Advanced Installer "Simple" MSI.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Installer = $PSScriptRoot
$OutMsi = Join-Path $Root "build\bin\MeiliPilot.msi"
$Exe = Join-Path $Root "build\bin\MeiliPilot.exe"
$Icon = Join-Path $Root "build\windows\icon.ico"

if (-not (Test-Path $Exe)) {
    throw "Chua co MeiliPilot.exe. Chay 'wails build' hoac 'make build' truoc."
}
if (-not (Test-Path $Icon)) {
    throw "Thieu build\windows\icon.ico"
}

function Find-Wix {
    $cmd = Get-Command wix -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $cands = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\WiXToolset.WiXCLI_Microsoft.Winget.Source_*\wix.exe",
        "$env:ProgramFiles\WiX Toolset *\bin\wix.exe",
        "${env:ProgramFiles(x86)}\WiX Toolset *\bin\wix.exe"
    )
    foreach ($p in $cands) {
        $hit = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($hit) { return $hit.FullName }
    }
    return $null
}

$wix = Find-Wix
if (-not $wix) {
    Write-Host "Chua co WiX CLI. Dang cai WiXToolset.WiXCLI (winget)..."
    winget install --id WiXToolset.WiXCLI -e --accept-package-agreements --accept-source-agreements --disable-interactivity
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $wix = Find-Wix
}
if (-not $wix) {
    throw "Khong tim thay wix.exe. Cai: winget install WiXToolset.WiXCLI"
}

Push-Location $Installer
try {
    & $wix --version
    & $wix extension add -acceptEula wix7 WixToolset.UI.wixext | Out-Null
    New-Item -ItemType Directory -Force -Path (Split-Path $OutMsi) | Out-Null
    & $wix build `
        -acceptEula wix7 `
        (Join-Path $Installer "MeiliPilot.wxs") `
        -ext WixToolset.UI.wixext `
        -arch x64 `
        -bindpath Bin="$(Join-Path $Root 'build\bin')" `
        -bindpath Res="$(Join-Path $Root 'build\windows')" `
        -o $OutMsi
    if ($LASTEXITCODE -ne 0) { throw "wix build failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host "MSI: $OutMsi"
Get-Item $OutMsi | Format-List FullName, Length, LastWriteTime
