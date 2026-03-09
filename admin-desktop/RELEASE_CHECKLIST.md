# Instrevi Admin Desktop Release Checklist

## 1) Pre-flight

- Confirm backend admin URL is live and reachable.
- Confirm admin login works in browser first.
- In `admin-desktop/package.json`, verify `version` is bumped.

## 2) Build artifacts

- Unpacked sanity build:
  - `npm run pack`
- Portable build:
  - `npm run dist`

Expected output folder: `admin-desktop/dist`

## 3) Post-build validation

- Launch `*-portable.exe` on a clean test machine/user profile.
- Launch app and verify it opens admin URL.
- Login as admin and confirm core tabs load.

## 4) Publish package

- Keep only portable artifacts you intend to distribute.
- Record checksums and upload artifacts to your release channel.
