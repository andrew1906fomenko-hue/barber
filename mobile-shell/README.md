# FastBook Android shell

This Android app is a lightweight WebView shell for the local FastBook Next.js dev server.

## How it works

- The app opens the live Next.js server, so Codex changes are visible after the dev server reloads.
- It first tries the last working URL.
- If the computer IPv4 changes, it scans hotspot clients, the current Wi-Fi subnet, and common hotspot subnets on ports `3000`, `3001`, and `3016`, then saves the new working address.
- If Android hides hotspot client data, enter the computer IPv4 in the app once. The app will remember it.

## Run for phone testing

From the project root:

```powershell
.\scripts\start-mobile-dev.ps1
```

Keep that terminal open while using the Android app. The phone and computer must be connected through the same Wi-Fi network or through the phone's mobile hotspot.

## APK

The debug APK is built here:

```text
mobile-shell\android\app\build\outputs\apk\debug\app-debug.apk
```
