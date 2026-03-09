# Instrevi Admin Desktop

A minimal Electron wrapper that opens the Instrevi admin page in a dedicated desktop window.

## Setup

1. Open a terminal in this folder:
   - `cd admin-desktop`
2. Install dependencies:
   - `npm install`

## Run

- Local backend admin page:
  - `npm run start:dev`
- Production admin page:
  - `npm run start:prod`
- Custom URL:
  - `npm run start -- --url=http://localhost:5000/admin`

## Build Windows executable

- Build unpacked app (sanity check):
  - `npm run pack`
- Build portable Windows executable:
  - `npm run dist`

Build outputs are generated in `admin-desktop/dist`, for example:

- `Instrevi-Admin-1.0.0-x64-portable.exe`

## Notes

- This wrapper does not bypass login; it uses the same admin auth flow as the browser.
- Keep your backend on HTTPS in production.
- Setup installer builds were removed; this desktop wrapper now targets portable EXE only.
