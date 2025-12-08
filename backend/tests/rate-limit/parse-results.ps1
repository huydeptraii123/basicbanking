# Parse Artillery Rate Limit Test Results
# Automatically analyzes spam test output and displays summary

param(
    [string]$ResultFile = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RATE LIMIT TEST RESULTS ANALYZER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($ResultFile -eq "") {
    # Find most recent JSON result
    $ResultsDir = Join-Path $PSScriptRoot "results"
    
    if (-not (Test-Path $ResultsDir)) {
        Write-Host "❌ No results directory found at: $ResultsDir" -ForegroundColor Red
        Write-Host "Run a test first: npm run rate-limit:test:100`n" -ForegroundColor Yellow
        exit 1
    }

    $LatestFile = Get-ChildItem $ResultsDir -Filter "*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $LatestFile) {
        Write-Host "❌ No result files found in: $ResultsDir" -ForegroundColor Red
        exit 1
    }
    
    $ResultFile = $LatestFile.FullName
}

if (-not (Test-Path $ResultFile)) {
    Write-Host "❌ Result file not found: $ResultFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Analyzing: $(Split-Path $ResultFile -Leaf)`n" -ForegroundColor Gray

# Parse JSON
$data = Get-Content $ResultFile -Raw | ConvertFrom-Json

# Extract metrics
$summary = $data.aggregate.counters
$latency = $data.aggregate.summaries

# Calculate totals
$totalRequests = $summary.'vusers.completed' + $summary.'vusers.failed'
$successRequests = $summary.'http.responses' - ($summary.'http.response_time.timeout' ?? 0)
$blockedBy429 = $summary.'http.codes.429' ?? 0
$blockedBy503 = $summary.'http.codes.503' ?? 0
$success200 = $summary.'http.codes.200' ?? 0
$timeout = $summary.'http.response_time.timeout' ?? 0
$serverError = $summary.'http.codes.500' ?? 0

$totalBlocked = $blockedBy429 + $blockedBy503
$successRate = if ($totalRequests -gt 0) { [math]::Round(($success200 / $totalRequests) * 100, 2) } else { 0 }
$blockedRate = if ($totalRequests -gt 0) { [math]::Round(($totalBlocked / $totalRequests) * 100, 2) } else { 0 }

# Response times
$minLatency = [math]::Round($latency.'http.response_time'.min, 2)
$maxLatency = [math]::Round($latency.'http.response_time'.max, 2)
$medianLatency = [math]::Round($latency.'http.response_time'.median, 2)
$p95Latency = [math]::Round($latency.'http.response_time'.p95, 2)
$p99Latency = [math]::Round($latency.'http.response_time'.p99, 2)

# ===== REQUEST SUMMARY =====
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  📊 REQUEST SUMMARY" -ForegroundColor White -BackgroundColor DarkCyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "  Total Requests:        $totalRequests" -ForegroundColor White
Write-Host "  ✅ Success (200):      $success200 ($successRate%)" -ForegroundColor Green
Write-Host "  🚫 Blocked (429):      $blockedBy429" -ForegroundColor Yellow
Write-Host "  🚫 Queue Full (503):   $blockedBy503" -ForegroundColor Yellow
Write-Host "  ⏱️  Timeout:            $timeout" -ForegroundColor Magenta
Write-Host "  ❌ Server Error (500): $serverError" -ForegroundColor Red
Write-Host ""

# ===== RATE LIMIT EFFECTIVENESS =====
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🛡️  RATE LIMIT EFFECTIVENESS" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "  Total Blocked:         $totalBlocked ($blockedRate%)" -ForegroundColor Yellow
Write-Host "  Allowed Requests:      $success200" -ForegroundColor Green
Write-Host "  Block Effectiveness:   $(if ($blockedRate -gt 50) { "EXCELLENT ✅" } elseif ($blockedRate -gt 20) { "GOOD ✓" } else { "LOW ⚠️" })" -ForegroundColor $(if ($blockedRate -gt 50) { "Green" } elseif ($blockedRate -gt 20) { "Yellow" } else { "Red" })
Write-Host ""

# ===== RESPONSE TIME =====
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  ⏱️  RESPONSE TIME (ms)" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

Write-Host "  Min:      $minLatency ms" -ForegroundColor White
Write-Host "  Median:   $medianLatency ms" -ForegroundColor White
Write-Host "  P95:      $p95Latency ms" -ForegroundColor Yellow
Write-Host "  P99:      $p99Latency ms" -ForegroundColor Magenta
Write-Host "  Max:      $maxLatency ms" -ForegroundColor Red
Write-Host ""

# ===== HEALTH STATUS =====
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  🏥 SYSTEM HEALTH STATUS" -ForegroundColor White -BackgroundColor DarkMagenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

# Health scoring
$healthScore = 0
$healthReasons = @()

if ($serverError -eq 0) { 
    $healthScore += 30
    $healthReasons += "✓ No server errors (500)"
} else {
    $healthReasons += "✗ Server errors detected: $serverError"
}

if ($blockedRate -gt 50) { 
    $healthScore += 40
    $healthReasons += "✓ Rate limiting working ($blockedRate% blocked)"
} elseif ($blockedRate -gt 20) {
    $healthScore += 20
    $healthReasons += "~ Rate limiting partially working ($blockedRate% blocked)"
} else {
    $healthReasons += "✗ Rate limiting ineffective ($blockedRate% blocked)"
}

if ($successRate -gt 20) { 
    $healthScore += 30
    $healthReasons += "✓ Legitimate requests allowed ($successRate% success)"
} else {
    $healthReasons += "✗ Too many requests blocked ($successRate% success)"
}

# Determine health level
$healthLevel = if ($healthScore -ge 80) { "EXCELLENT" }
              elseif ($healthScore -ge 60) { "GOOD" }
              elseif ($healthScore -ge 40) { "FAIR" }
              else { "POOR" }

$healthColor = if ($healthScore -ge 80) { "Green" }
               elseif ($healthScore -ge 60) { "Yellow" }
               elseif ($healthScore -ge 40) { "Magenta" }
               else { "Red" }

Write-Host "  Overall Status: $healthLevel ($healthScore/100)" -ForegroundColor $healthColor
Write-Host ""
foreach ($reason in $healthReasons) {
    Write-Host "    $reason" -ForegroundColor Gray
}
Write-Host ""

# ===== RECOMMENDATION =====
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  💡 RECOMMENDATION" -ForegroundColor White -BackgroundColor DarkYellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

if ($healthLevel -eq "EXCELLENT" -or $healthLevel -eq "GOOD") {
    Write-Host "  ✅ Rate limiting is working effectively!" -ForegroundColor Green
    Write-Host "  Spam requests are being blocked while legitimate traffic flows." -ForegroundColor Gray
} elseif ($healthLevel -eq "FAIR") {
    Write-Host "  ⚠️  Rate limiting needs tuning." -ForegroundColor Yellow
    Write-Host "  Consider adjusting maxRequests or windowMs settings." -ForegroundColor Gray
} else {
    Write-Host "  ❌ Rate limiting may not be enabled or configured properly." -ForegroundColor Red
    Write-Host "  Enable rate limiting: npm run rate-limit:toggle" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================`n" -ForegroundColor Cyan
