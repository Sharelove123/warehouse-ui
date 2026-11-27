# AI Usage Declaration (`AI_USAGE.md`)

## 1. AI Tools Used

* **Coding Assistant:** Antigravity AI coding assistant (using Gemini) inside the local IDE workspace.
* **Scope of Use:** Planning the system architecture, scaffolding the Django REST Framework API (`warehouse-api`) and React + TypeScript UI (`warehouse-ui`), implementing models/endpoints/components, writing Django and Playwright tests, and drafting documentation.

## 2. How Outputs Were Verified

Every generated component, endpoint, and configuration file was reviewed and verified locally against the assignment brief:
1. **Backend Verification:**
   * Ran `python manage.py makemigrations` and `python manage.py test` to verify grid structure (`A1` transfer point + 24 storage cells), load/unload validation, duplicate pallet rejection, RBAC `403` enforcement across Admin/Technician/Auditor roles, admin user creation/reset/deletion, and `seed_demo` idempotency.
2. **Frontend & End-to-End Verification:**
   * Built the TypeScript frontend with `npm run build` (`tsc -b && vite build`) to catch strict TypeScript and JSX issues.
   * Ran the Playwright Chromium suite (`npm test`) against live local Django (`runserver --noreload` with `SQLITE_PATH`) and Vite (`npm start`) servers using `EVAL_*` environment variables, verifying multi-session 5-second polling sync, RBAC UI restrictions, and JSON reporter output (`PLAYWRIGHT_JSON_OUTPUT_FILE`).

## 3. Concrete Corrections & Engineering Checks Made

* **Sandbox / Network Separation:** Local package installation (`pip` and `npm`) and Playwright browser checks were executed against live local dependencies while ensuring no hardcoded credentials or secrets were placed in code or `evaluation.json`.
* **CORS & Environment Variable Mapping:** Explicitly stripped trailing slashes from `CORS_ALLOWED_ORIGINS` in Django settings so `{ui_url}` placeholder substitution never triggers `django-cors-headers` system-check failures, and mapped `API_BASE_URL`, `VITE_API_BASE_URL`, and `REACT_APP_API_BASE_URL` in `vite.config.ts`.
* **Self-Lockout & Concurrency Safeguards:** Added backend guards preventing admins from deleting/demoting themselves or the last active admin, plus `UniqueConstraint` (`status='STORED'`) and atomic transactions on pallet load/unload.

## 4. Remaining Uncertainties

* Hosted cloud deployment behavior (cold-start latency and cross-origin TLS configuration between the frontend and backend hosts) must be verified manually once deployed to the live hosting providers.
