# Script tự động chạy test và phân tích kết quả
param([string]$TestType = "1000")

Write-Host "🚀 Running Load Test with Auto-Parse" -ForegroundColor Cyan

# Tạo file tạm
$outputFile = "temp-artillery.txt"

# Chạy test và lưu output
Write-Host "📊 Running test..." -ForegroundColor Yellow
npm run "load-test:$TestType" | Tee-Object -FilePath $outputFile

# Parse kết quả  
Write-Host "`n🔍 Parsing results..." -ForegroundColor Yellow
if (Test-Path $outputFile) {
    Get-Content $outputFile | .\tests\load\parse-results.ps1
    Remove-Item $outputFile -Force
    Write-Host "✅ Done!" -ForegroundColor Green
}