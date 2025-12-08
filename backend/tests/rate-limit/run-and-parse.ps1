# Run Artillery rate limit test and automatically parse results
# Usage: .\run-and-parse.ps1 100  (for 100-request test)
#        .\run-and-parse.ps1 500  (for 500-request test)

param(
    [int]$RequestCount = 100
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  AUTOMATED RATE LIMIT TEST & ANALYSIS     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Validate input
if ($RequestCount -ne 100 -and $RequestCount -ne 500) {
    Write-Host "❌ Invalid request count: $RequestCount" -ForegroundColor Red
    Write-Host "   Supported values: 100, 500`n" -ForegroundColor Yellow
    exit 1
}

# Check if Artillery is installed
$artilleryCmd = Get-Command artillery -ErrorAction SilentlyContinue
if (-not $artilleryCmd) {
    Write-Host "❌ Artillery not found!" -ForegroundColor Red
    Write-Host "   Install: npm install -g artillery`n" -ForegroundColor Yellow
    exit 1
}

# Paths
$TestFile = Join-Path $PSScriptRoot "spam-$RequestCount.yml"
$ResultsDir = Join-Path $PSScriptRoot "results"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$OutputFile = Join-Path $ResultsDir "rate_limit_$($RequestCount)_$Timestamp.json"

# Create results directory
if (-not (Test-Path $ResultsDir)) {
    New-Item -ItemType Directory -Path $ResultsDir -Force | Out-Null
}

# Check test file exists
if (-not (Test-Path $TestFile)) {
    Write-Host "❌ Test file not found: $TestFile" -ForegroundColor Red
    exit 1
}

# Check if test data exists
$TestDataFile = Join-Path $PSScriptRoot "test-data.json"
if (-not (Test-Path $TestDataFile)) {
    Write-Host "⚠️  Test data not found!" -ForegroundColor Yellow
    Write-Host "   Running: npm run rate-limit:prepare`n" -ForegroundColor Cyan
    
    Push-Location (Join-Path $PSScriptRoot ".." "..")
    npm run rate-limit:prepare
    Pop-Location
    
    Write-Host ""
}

# Display test info
Write-Host "📋 Test Configuration:" -ForegroundColor White
Write-Host "   Test Type:     Rate Limit Spam Test" -ForegroundColor Gray
Write-Host "   Requests:      $RequestCount" -ForegroundColor Gray
Write-Host "   Config File:   spam-$RequestCount.yml" -ForegroundColor Gray
Write-Host "   Output:        $(Split-Path $OutputFile -Leaf)" -ForegroundColor Gray
Write-Host ""

# Run Artillery test
Write-Host "🚀 Running Artillery load test..." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

try {
    artillery run $TestFile --output $OutputFile
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Artillery test failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host "`n✅ Test completed successfully!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "`n❌ Error running Artillery test: $_" -ForegroundColor Red
    exit 1
}

# Parse results
Write-Host "🔍 Parsing test results..." -ForegroundColor Cyan
Write-Host ""

$ParseScript = Join-Path $PSScriptRoot "parse-results.ps1"
& $ParseScript -ResultFile $OutputFile

Write-Host "💾 Full results saved to:" -ForegroundColor White
Write-Host "   $OutputFile`n" -ForegroundColor Gray

Write-Host "✅ Analysis complete!`n" -ForegroundColor Green
