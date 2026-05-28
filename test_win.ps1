try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3050/health' -TimeoutSec 5 -UseBasicParsing
    Write-Host "WINDOWS_OK: $($r.Content)"
} catch {
    Write-Host "WINDOWS_FAIL: $($_.Exception.Message)"
}
