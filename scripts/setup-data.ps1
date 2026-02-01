#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Downloads and extracts the TW Stock App data package.
.DESCRIPTION
    This script downloads the data archive from GitHub Releases
    and extracts it to the public/data directory.
.EXAMPLE
    .\scripts\setup-data.ps1
#>

$ErrorActionPreference = "Stop"

# Configuration
$RepoOwner = "benitorhuang-svg"
$RepoName = "tw-stock-app"
$DataFileName = "tw-stock-data.zip"
$TargetDir = "public/data"

Write-Host "📦 TW Stock App - Data Setup" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Check if data already exists
if (Test-Path "$TargetDir/stocks.json") {
    Write-Host "⚠️  Data already exists in $TargetDir" -ForegroundColor Yellow
    $confirm = Read-Host "Do you want to re-download? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Host "Skipping download." -ForegroundColor Gray
        exit 0
    }
}

# Get latest release download URL
Write-Host "`n🔍 Finding latest data release..." -ForegroundColor White
try {
    $releaseUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ "User-Agent" = "PowerShell" }
    $asset = $release.assets | Where-Object { $_.name -eq $DataFileName }
    
    if (-not $asset) {
        throw "Data package not found in latest release"
    }
    
    $downloadUrl = $asset.browser_download_url
    Write-Host "   Found: $($release.tag_name)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Could not fetch release info: $_" -ForegroundColor Red
    Write-Host "`n💡 Alternative: Download manually from GitHub Releases" -ForegroundColor Yellow
    Write-Host "   https://github.com/$RepoOwner/$RepoName/releases" -ForegroundColor Gray
    exit 1
}

# Download
Write-Host "`n⬇️  Downloading $DataFileName..." -ForegroundColor White
$tempZip = Join-Path $env:TEMP $DataFileName
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
    $sizeMB = [math]::Round((Get-Item $tempZip).Length / 1MB, 2)
    Write-Host "   Downloaded: $sizeMB MB" -ForegroundColor Green
}
catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "`n📂 Extracting to $TargetDir..." -ForegroundColor White
try {
    # Create target directory if not exists
    if (-not (Test-Path $TargetDir)) {
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }
    
    Expand-Archive -Path $tempZip -DestinationPath $TargetDir -Force
    Write-Host "   Extraction complete!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Extraction failed: $_" -ForegroundColor Red
    exit 1
}
finally {
    # Cleanup
    Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
}

# Verify
$fileCount = (Get-ChildItem -Path $TargetDir -Recurse -File).Count
Write-Host "`n✅ Setup complete! $fileCount files extracted." -ForegroundColor Green
Write-Host "   You can now run: npm run dev" -ForegroundColor Cyan
