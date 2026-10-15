# GUI Setup.exe = WiX Burn bundle (WixStdBA), not the console cmd/setup.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Installer = $PSScriptRoot
$OutSetup = Join-Path $Root "build\bin\MeiliPilot-Setup.exe"
$Msi = Join-Path $Root "build\bin\MeiliPilot.msi"
$Deps = Join-Path $Installer "payload\deps.json"
$Wv2 = Join-Path $Installer "payload\MicrosoftEdgeWebView2RuntimeInstallerX64.exe"
$Icon = Join-Path $Root "build\windows\icon.ico"

if (-not (Test-Path $Msi)) { throw "Chua co MeiliPilot.msi. Chay installer/build-msi.ps1 truoc." }
if (-not (Test-Path $Deps)) { throw "Thieu payload/deps.json - chay installer/vendor-deps.ps1" }
if (-not (Test-Path $Wv2)) { throw "Thieu payload WebView2 Standalone - chay installer/vendor-deps.ps1" }
if (-not (Test-Path $Icon)) { throw "Thieu build\windows\icon.ico" }

$pin = (Get-Content -Raw $Deps | ConvertFrom-Json).webview2.version
if (-not $pin) { throw "deps.json thieu webview2.version" }

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
if (-not $wix) { throw "Khong tim thay wix.exe" }

Push-Location $Installer
try {
    & $wix --acceptEula wix7 extension add -g WixToolset.BootstrapperApplications.wixext
    & $wix --acceptEula wix7 extension add -g WixToolset.Util.wixext
    Write-Host "Burn GUI Setup, pin WebView2 $pin ..."
    & $wix build `
        --acceptEula wix7 `
        (Join-Path $Installer "Bundle.wxs") `
        -ext WixToolset.BootstrapperApplications.wixext `
        -ext WixToolset.Util.wixext `
        -arch x64 `
        -d "WebView2Pin=$pin" `
        -bindpath Bin="$(Join-Path $Root 'build\bin')" `
        -bindpath Res="$(Join-Path $Root 'build\windows')" `
        -bindpath Payload="$(Join-Path $Installer 'payload')" `
        -o $OutSetup
    if ($LASTEXITCODE -ne 0) { throw "wix bundle failed ($LASTEXITCODE)" }
} finally {
    Pop-Location
}

Write-Host "GUI Setup: $OutSetup"
Get-Item $OutSetup | Format-List FullName, Length, LastWriteTime
