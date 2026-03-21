# Build Tailwind CSS for Astana (Windows)
# Run this script in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "🔨 Building Tailwind CSS..." -ForegroundColor Yellow

$TailwindVersion = "3.4.1"
$TailwindUrl = "https://github.com/tailwindlabs/tailwindcss/releases/download/v$TailwindVersion/tailwindcss-windows-x64.exe"
$TailwindBin = "$env:TEMP\tailwindcss-astana.exe"
$InputCss = "src\input.css"
$OutputCss = "src\assets\css\tailwind.min.css"

# Check if input.css exists
if (-not (Test-Path $InputCss)) {
    Write-Host "❌ Error: $InputCss not found" -ForegroundColor Red
    exit 1
}

# Download Tailwind CLI if not exists
if (-not (Test-Path $TailwindBin)) {
    Write-Host "📥 Downloading Tailwind CSS CLI..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $TailwindUrl -OutFile $TailwindBin
        Write-Host "✅ Tailwind CSS CLI downloaded" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed to download Tailwind CSS CLI" -ForegroundColor Red
        Write-Host $_.Exception.Message
        exit 1
    }
}
else {
    Write-Host "✅ Using existing Tailwind CSS CLI" -ForegroundColor Green
}

# Create output directory if not exists
$outputDir = Split-Path $OutputCss -Parent
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

# Build CSS
Write-Host "⚙️  Building CSS..." -ForegroundColor Yellow
try {
    & $TailwindBin -i $InputCss -o $OutputCss --minify
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $OutputCss).Length
        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        Write-Host "✅ Tailwind CSS built successfully!" -ForegroundColor Green
        Write-Host "📄 Output: $OutputCss ($fileSizeKB KB)" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Failed to build Tailwind CSS" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error building Tailwind CSS" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
