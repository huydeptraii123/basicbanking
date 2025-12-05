# Artillery Load Test Summary Parser
# Parse Artillery output and display summary table

param(
    [string]$LogFile = ""
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Artillery Load Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($LogFile -and (Test-Path $LogFile)) {
    $content = Get-Content $LogFile -Raw
} else {
    Write-Host "Reading from pipeline or clipboard..." -ForegroundColor Yellow
    Write-Host "Usage: Get-Content results.txt | .\parse-results.ps1" -ForegroundColor Gray
    Write-Host "   or: .\parse-results.ps1 -LogFile results.txt`n" -ForegroundColor Gray
    
    $content = $input | Out-String
    if (-not $content) {
        Write-Host "❌ No input provided. Paste Artillery output and press Ctrl+Z then Enter:" -ForegroundColor Red
        $content = [System.Console]::In.ReadToEnd()
    }
}

# Extract Summary section
if ($content -match "Summary report.*?(?=All VUs finished|$)") {
    $summary = $matches[0]
} else {
    $summary = $content
}

# Parse metrics
function Get-Metric {
    param($text, $pattern)
    if ($text -match $pattern) {
        return $matches[1].Trim()
    }
    return "N/A"
}

# Extract values
$totalRequests = Get-Metric $summary "http\.requests:.*?(\d+)"
$successRequests = Get-Metric $summary "http\.codes\.200:.*?(\d+)"
$error429 = Get-Metric $summary "http\.codes\.429:.*?(\d+)"
$error503 = Get-Metric $summary "http\.codes\.503:.*?(\d+)"
$error500 = Get-Metric $summary "http\.codes\.500:.*?(\d+)"
$timeout = Get-Metric $summary "timeout:.*?(\d+)"

$responseMin = Get-Metric $summary "http\.response_time:.*?min:.*?(\d+)"
$responseMedian = Get-Metric $summary "http\.response_time:.*?median:.*?([\d.]+)"
$responseP95 = Get-Metric $summary "http\.response_time:.*?p95:.*?([\d.]+)"
$responseP99 = Get-Metric $summary "http\.response_time:.*?p99:.*?([\d.]+)"
$responseMax = Get-Metric $summary "http\.response_time:.*?max:.*?(\d+)"

$vusersCreated = Get-Metric $summary "vusers\.created:.*?(\d+)"
$vusersCompleted = Get-Metric $summary "vusers\.completed:.*?(\d+)"
$vusersFailed = Get-Metric $summary "vusers\.failed:.*?(\d+)"

# Calculate metrics
$successRate = if ($totalRequests -ne "N/A" -and [int]$totalRequests -gt 0) {
    [math]::Round(([int]$successRequests / [int]$totalRequests) * 100, 2)
} else { "N/A" }

$failureRate = if ($vusersCreated -ne "N/A" -and [int]$vusersCreated -gt 0) {
    [math]::Round(([int]$vusersFailed / [int]$vusersCreated) * 100, 2)
} else { "N/A" }

# Display Summary Table
Write-Host "REQUEST SUMMARY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Gray
$requestTable = @(
    [PSCustomObject]@{Metric="Total Requests"; Value=$totalRequests}
    [PSCustomObject]@{Metric="Success (200)"; Value="$successRequests ($successRate`%)"}
    [PSCustomObject]@{Metric="Throttled (429)"; Value=$error429}
    [PSCustomObject]@{Metric="Queue Full (503)"; Value=$error503}
    [PSCustomObject]@{Metric="Server Error (500)"; Value=$error500}
    [PSCustomObject]@{Metric="Timeout"; Value=$timeout}
)
$requestTable | Format-Table -AutoSize

Write-Host "`nRESPONSE TIME (ms)" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Gray
$responseTable = @(
    [PSCustomObject]@{Metric="Min"; Value=$responseMin}
    [PSCustomObject]@{Metric="Median"; Value=$responseMedian}
    [PSCustomObject]@{Metric="P95"; Value=$responseP95}
    [PSCustomObject]@{Metric="P99"; Value=$responseP99}
    [PSCustomObject]@{Metric="Max"; Value=$responseMax}
)
$responseTable | Format-Table -AutoSize

Write-Host "`nVIRTUAL USERS" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Gray
$usersTable = @(
    [PSCustomObject]@{Metric="Created"; Value=$vusersCreated}
    [PSCustomObject]@{Metric="Completed"; Value=$vusersCompleted}
    [PSCustomObject]@{Metric="Failed"; Value="$vusersFailed ($failureRate`%)"}
)
$usersTable | Format-Table -AutoSize

# Health Assessment
Write-Host "`nHEALTH ASSESSMENT" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Gray

$health = "Unknown"
$healthColor = "Gray"

if ($successRate -ne "N/A") {
    $successNum = [double]$successRate
    if ($successNum -ge 95) {
        $health = "EXCELLENT"
        $healthColor = "Green"
    } elseif ($successNum -ge 80) {
        $health = "GOOD"
        $healthColor = "Yellow"
    } elseif ($successNum -ge 50) {
        $health = "DEGRADED"
        $healthColor = "DarkYellow"
    } else {
        $health = "CRITICAL"
        $healthColor = "Red"
    }
}

Write-Host "Success Rate: " -NoNewline
Write-Host $health -ForegroundColor $healthColor

if ($timeout -ne "N/A" -and [int]$timeout -gt 0) {
    Write-Host "WARNING: High timeout count detected!" -ForegroundColor Red
}

if ($error500 -ne "N/A" -and [int]$error500 -gt 0) {
    Write-Host "WARNING: Server errors detected!" -ForegroundColor Red
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

# Optional: Save to file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$summaryFile = "test-summary-$timestamp.txt"

$summaryOutput = @"
Artillery Load Test Summary - $(Get-Date)
============================================

REQUEST SUMMARY
Total Requests: $totalRequests
Success (200): $successRequests ($successRate%)
Throttled (429): $error429
Queue Full (503): $error503
Server Error (500): $error500
Timeout: $timeout

RESPONSE TIME (ms)
Min: $responseMin
Median: $responseMedian
P95: $responseP95
P99: $responseP99
Max: $responseMax

VIRTUAL USERS
Created: $vusersCreated
Completed: $vusersCompleted
Failed: $vusersFailed ($failureRate%)

HEALTH: $health
"@

$summaryOutput | Out-File $summaryFile -Encoding UTF8
Write-Host "📄 Summary saved to: $summaryFile" -ForegroundColor Cyan
