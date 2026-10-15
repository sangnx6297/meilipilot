$ErrorActionPreference = "Stop"
$payload = Join-Path $PSScriptRoot "payload"
New-Item -ItemType Directory -Force -Path $payload | Out-Null

$url = "https://go.microsoft.com/fwlink/?linkid=2124701"
$exeName = "MicrosoftEdgeWebView2RuntimeInstallerX64.exe"
$exe = Join-Path $payload $exeName
$depsPath = Join-Path $payload "deps.json"

function Test-PeExe([string]$path) {
    if (-not (Test-Path $path)) { return $false }
    $fs = [IO.File]::OpenRead($path)
    try {
        $a = $fs.ReadByte(); $b = $fs.ReadByte()
        return ($a -eq 0x4D -and $b -eq 0x5A)
    } finally { $fs.Close() }
}

if (-not (Test-PeExe $exe) -or (Get-Item $exe).Length -lt 1MB) {
    if (Test-Path $exe) { Remove-Item -Force $exe }
    Write-Host "Tai WebView2 Standalone x64 (pin luc dong goi)..."
    & curl.exe -L --fail --retry 3 --retry-delay 2 -o $exe $url
    if ($LASTEXITCODE -ne 0) { throw "Tai WebView2 that bai (curl $LASTEXITCODE)" }
    if (-not (Test-PeExe $exe)) { throw "File tai ve khong phai PE exe (kiem tra fwlink Windows x64)" }
} else {
    Write-Host "Da co payload: $exe"
}

function Get-WebView2RuntimeVersion {
    try {
        $out = & winget show Microsoft.EdgeWebView2Runtime --accept-source-agreements 2>$null | Out-String
        if ($out -match '(?m)^Version:\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)') {
            return $Matches[1]
        }
    } catch {}
    $hdr = & curl.exe -sI "https://go.microsoft.com/fwlink/?linkid=2093504" | Out-String
    if ($hdr -match 'MicrosoftEdge-([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\.pkg') {
        return $Matches[1]
    }
    throw "Khong xac dinh duoc version Runtime WebView2 (khong dung FileVersion cua Edge Update Setup)"
}

$ver = Get-WebView2RuntimeVersion
if ($ver -notmatch '^[8-9][0-9]\.|^1[0-9]{2}\.') {
    throw "Version Runtime khong hop le: $ver"
}
$hash = (Get-FileHash -Algorithm SHA256 -Path $exe).Hash.ToLowerInvariant()

$json = @"
{
  "webview2": {
    "name": "WebView2 Runtime",
    "version": "$ver",
    "file": "$exeName",
    "sha256": "$hash",
    "source": "$url"
  }
}
"@
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($depsPath, $json.Trim() + "`n", $utf8)
Write-Host "Pin WebView2 $ver"
Write-Host "sha256 $hash"
