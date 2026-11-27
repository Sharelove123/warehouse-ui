# Design Document — Warehouse Management System

## 1. Interpretation of the Brief

The system models an automated 5×5 warehouse floor (`A1`–`E5`) served by a single transfer shuttle (`SHUTTLE-01`):
* **`A1` (Transfer Point):** Transient entry and exit point only. Incoming pallets are palletized at `A1` and transferred immediately to one of the 24 storage cells (`A2`–`E5`, `B1`–`E1`, etc.). Unloading removes a pallet from its storage cell back through `A1` and out of warehouse stock with no separate tray-clear step.
* **24 Storage Locations:** Each holds at most one active pallet (`STORED`).
* **3 Roles:** `ADMIN` (full access + user administration), `TECHNICIAN` (view map/shuttle + load/unload stock), and `AUDITOR` (read-only floor inspection + auditor dashboard).

## 2. Architecture & Data Relationships

* **Frontend (`warehouse-ui`):** React 19 + TypeScript + Vite + Tailwind CSS + Recharts. Communicates with the REST API using Bearer JWT tokens with automatic refresh on `401`.
* **Backend (`warehouse-api`):** Django + Django REST Framework + SimpleJWT. Uses SQLite (`SQLITE_PATH`) for local evaluation and managed PostgreSQL (`DATABASE_URL`) for hosted deployment.

### Core Models
1. **`accounts.User`** (custom `AbstractUser`): Stores `role` (`ADMIN`, `AUDITOR`, `TECHNICIAN`) and `is_active` for access revocation.
2. **`warehouse.StorageLocation`**: 25 rows (`code`: `A1`–`E5`, `column`, `row`, `is_transfer_point`). `A1` has `is_transfer_point = True`.
3. **`warehouse.Pallet`**: Tracks `pallet_number`, `barcode`, `item_name`, `quantity`, `status` (`STORED` / `UNLOADED`), and a `OneToOneField` (`location`) to `StorageLocation` (`null=True` once unloaded). A database-level `UniqueConstraint` on `pallet_number` conditioned on `status='STORED'` prevents duplicate active pallet numbers while allowing historical unloaded records to remain auditable.
4. **`warehouse.Shuttle`**: Stores `identifier` (`SHUTTLE-01`), `status` (`IDLE`, `ACTIVE`, `CHARGING`, `MAINTENANCE`), `battery_percentage`, and `updated_at`.
5. **`warehouse.OccupancySnapshot`**: Stores one daily row (`date`, `occupied_count`, `free_count`) for the 7-day capacity chart.
6. **`warehouse.MovementLog`**: Immutable log of `LOAD` and `UNLOAD` operations with operator username and timestamp for auditor inspection.

## 3. Workflows, Multi-Session Sync & Permissions

* **Authentication & RBAC:** Every API route (except `/health/`, `/api/auth/login/`, `/api/auth/refresh/`) requires a valid JWT and an active user (`is_active=True`). Role permissions (`IsAdminRole`, `IsTechnicianOrAdminRole`, `IsAuditorOrAdminRole`) are enforced in DRF permission classes on the backend and mirrored in the React navigation and views.
* **Multi-Session Sync (<5 seconds):** `WarehouseMapPage` polls `GET /api/warehouse/map/` every **3 seconds** (3,000 ms), ensuring changes made in another browser session appear within 5 seconds without manual reload.
* **Accessible Visual Indicators:** Map cells use green (`FREE`) and red (`OCCUPIED`) styling paired with explicit text badges (`FREE`, `OCCUPIED`, `TRANSFER`) and icons so colour is never the sole indicator.

## 4. Assumptions, Validation & Failure Handling

* **Atomic Stock Mutations:** `load_pallet` and `unload_pallet` execute inside `transaction.atomic()` with row locking (`select_for_update()` where supported) so concurrent load attempts onto the same cell fail cleanly with HTTP `400` rather than overwriting a pallet.
* **Transfer Point Guardrails:** Attempting to load into or unload from `A1` is rejected on both UI (excluded from destination dropdown) and backend (`400 Bad Request`).
* **Quantity & Uniqueness:** Quantity must be a positive integer (`>= 1`). Duplicate `pallet_number` values among currently `STORED` pallets are rejected; barcodes are permitted across multiple pallets of the same SKU.
* **Self-Lockout Protection:** Admins cannot delete, deactivate, or demote their own account, and the API rejects removing or demoting the last remaining active admin.
* **Idempotent Seeding (`seed_demo`):** Uses `update_or_create` for the three evaluation/demo accounts and creates initial synthetic pallets only if no pallets or movement logs exist yet, ensuring repeated runs never duplicate accounts or wipe user-created data.

## 5. Historical Chart Definition

The Auditor Dashboard's **7-Day Occupancy & Free Capacity** chart plots daily counts out of the **24 storage locations** (`occupied_count + free_count = 24`, excluding transfer point `A1`):
* **Past 6 days (`today - 6` to `today - 1`):** Seeded with reproducible end-of-day synthetic baseline snapshots (`[9, 11, 10, 12, 14, 8]` occupied).
* **Today:** Dynamically synchronized via `sync_today_snapshot()` on every `LOAD`, `UNLOAD`, `seed_demo`, and dashboard fetch so today's bar always reflects the exact live floor occupancy.

## 6. Trade-offs & Deferred Work

* **Polling vs. WebSockets:** Chose 3-second HTTP polling over Django Channels/WebSockets to avoid requiring Redis/ASGI workers on free-tier infrastructure while easily satisfying the 5-second sync window.
* **JWT in `localStorage`:** Chosen for clean cross-origin deployment between a static frontend host and container API host; mitigated with 8-hour access tokens and explicit logout/user-deactivation checks on `/api/auth/me/` and permissions.
* **Deferred Work:** Pagination on movement logs (currently displays the latest 15 events), CSV export on the auditor dashboard, and simulated shuttle movement/battery drain transitions.
