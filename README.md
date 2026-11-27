# Warehouse Management System — UI (`warehouse-ui`)

React + TypeScript frontend for the 5×5 Automated Warehouse Management System, backed by a Django REST Framework API.

## Documentation & Links

* **UI Design & Architecture:** [DESIGN.md](./DESIGN.md)
* **AI Usage Declaration:** [AI_USAGE.md](./AI_USAGE.md)
* **Backend Setup & API Reference:** [warehouse-api README](https://github.com/Sharelove123/warehouse-api/blob/main/README.md)
* **Repositories:**
  * UI Repository: https://github.com/Sharelove123/warehouse-ui
  * API Repository: https://github.com/Sharelove123/warehouse-api
* **Hosted Services (update before final commit):**
  * Hosted UI: `<your-vercel-https-url>`
  * Browser Login URL: `<your-vercel-https-url>/login`
  * Hosted API: `<your-azure-https-url>`

## Supported Runtimes

* **Node.js:** `>= 20.0.0` (verified locally on Node `v25.9.0` and npm `11.12.1`)
* **Python (API):** `>= 3.12` (verified locally on Python `3.14.6`)

## Local Installation & Running

### 1. Start the API (`warehouse-api`)

```bash
cd warehouse-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export SQLITE_PATH=/tmp/wms.sqlite3
export DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
export CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173
export EVAL_ADMIN_USERNAME=demo_admin
export EVAL_ADMIN_PASSWORD='<local-admin-password>'
export EVAL_AUDITOR_USERNAME=demo_auditor
export EVAL_AUDITOR_PASSWORD='<local-auditor-password>'
export EVAL_TECHNICIAN_USERNAME=demo_technician
export EVAL_TECHNICIAN_PASSWORD='<local-technician-password>'

python manage.py migrate --noinput
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000 --noreload
```

### 2. Start the UI (`warehouse-ui`)

```bash
cd warehouse-ui
npm install
export HOST=127.0.0.1
export PORT=5173
export API_BASE_URL=http://127.0.0.1:8000
npm start
```

## Environment Variables

See `.env.example` for placeholder values:
* `HOST` / `PORT`: Development server host and port (default `127.0.0.1:5173`).
* `API_BASE_URL` / `VITE_API_BASE_URL` / `REACT_APP_API_BASE_URL`: Base URL of the running Django REST API (default `http://127.0.0.1:8000`).
* `UI_BASE_URL` / `BASE_URL`: Base URL targeted by Playwright tests (default `http://127.0.0.1:5173`).
* `PLAYWRIGHT_JSON_OUTPUT_FILE`: Destination path for Playwright's full JSON test report (defaults to `playwright-results.json`).
* `EVAL_ADMIN_USERNAME`, `EVAL_ADMIN_PASSWORD`, `EVAL_AUDITOR_USERNAME`, `EVAL_AUDITOR_PASSWORD`, `EVAL_TECHNICIAN_USERNAME`, `EVAL_TECHNICIAN_PASSWORD`: Local evaluation credentials read by `seed_demo` and Playwright tests.

## Demo Usernames

Hosted passwords are submitted separately in the evaluation form and are intentionally excluded from repositories and documentation:
* **Admin:** `demo_admin`
* **Auditor:** `demo_auditor`
* **Technician:** `demo_technician`

## Playwright End-to-End Tests

With both the local API (migrated and seeded) and UI servers running, and the `EVAL_*` environment variables exported:

```bash
npx playwright install chromium
npm test
```

Playwright uses Chromium, does not launch a competing `webServer`, and writes a full JSON report to `PLAYWRIGHT_JSON_OUTPUT_FILE`.

### Recorded Verification Results

* **Backend (`python manage.py test -v 2`):** `6 passed` (health endpoint, 25-cell grid + `A1` transfer point, load/unload + validation, RBAC `403` enforcement, admin user CRUD + password reset, `seed_demo` idempotency).
* **Frontend build (`npm run build`):** `tsc -b && vite build` passed with zero errors.
* **Playwright E2E (`npm test` on Chromium against local SQLite + Django + Vite):** `4 passed (11.1s)`:
  1. Auditor inspects 5×5 map (`A1` transfer + 24 cells), shuttle status (`SHUTTLE-01`), and 7-day dashboard (read-only).
  2. Technician loads pallet, triggers duplicate-pallet validation error, verifies `<5s` multi-session sync in an Auditor session, and unloads pallet.
  3. Technician RBAC restrictions verified on Auditor Dashboard and User Admin routes.
  4. Admin creates user, resets password, verifies new login, and removes access.

## Known Limitations

* Multi-session map synchronization uses 3-second HTTP polling rather than WebSockets.
* Auditor movement history displays the most recent 15 events without pagination.
* Hosted free-tier infrastructure may experience brief cold starts when waking from inactivity.
