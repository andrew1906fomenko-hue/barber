$ErrorActionPreference = "Stop"

$ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress

Write-Host "FastBook dev server for Android"
Write-Host "Phone URL: http://$ip:3000"
Write-Host "Keep this window open while using the Android app."

npm run dev -- -H 0.0.0.0 -p 3000
