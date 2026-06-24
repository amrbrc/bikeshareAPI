# 📋 Task List: Dashboard UI Revisions (PART 1)

This checklist tracks the progress of the Dashboard UI Revisions task. Mark items as completed (`[x]`) or in-progress (`[/]`) as development proceeds.

---

## 🛑 Prerequisite: Soft-Delete Column Additions
- [x] **Step 1: Update SQL Schema Migration**
  - [x] Add `is_active TINYINT(1) DEFAULT 1` to `members` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
  - [x] Add `is_active TINYINT(1) DEFAULT 1` to `bicycle_codes` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
  - [x] Add `is_active TINYINT(1) DEFAULT 1` to `locations` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
- [x] **Step 2: Update Borrow checks in API**
  - [x] Ensure `POST /api/borrow` query checks that user, bike, and locations have `is_active = 1`.

---

## 👨‍💻 Developer A (Amer): Database Queries & Admin Controllers

### [x] Step 1: Build the Advanced Search Queries
- [x] Write API query to search bike by code, returning padlock, condition status, active borrow timer, and past history.
- [x] Write API query to search active members by phone number or lastname using a `LIKE` query.

### [x] Step 2: Build the Admin Override Logic
- [x] Write endpoint to manually override/update a member's `trust_points`.
- [x] Write endpoint to manually override/update a bike's lock code and `condition_status`.

### [x] Step 3: Build the Soft Delete Logic
- [x] Write endpoint to soft-delete a member (set `is_active = 0`).
- [x] Write endpoint to soft-delete a bike (set `is_active = 0`).
- [x] Write endpoint to soft-delete a location/station (set `is_active = 0`).

### [x] Step 4: Build the Report Log Queries
- [x] Write query to fetch the Maintenance Queue (active bikes with condition status `'Broken'`, `'Missing'`, or `'Disputed'`, showing `last_user_phone`).
- [x] Write query to fetch Honesty Logs (filtered from the `Logs` table where `Request` matches `'Broken Report'`, `'Fixed Report'`, or `'Missing Report'`).
- [x] Add logging logic in [bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js) so reporting actions populate these logs.

---

## 👨‍💻 Developer B (Jhirick): Express Routing & Frontend UI Overhaul

### [ ] Step 1: Sidebar & Layout Cleanup
- [ ] Remove "SMS Reference Guide" container from [index.html](file:///home/amer-talastasin/bikeshareAPI/dashboard/index.html).
- [ ] Create "Registration & Setup" sidebar submenu in [index.html](file:///home/amer-talastasin/bikeshareAPI/dashboard/index.html).
- [ ] Move add-member, add-bike, and add-station forms into the new registration sidebar group.

### [ ] Step 2: Search UI Components (Replacing Bulk Lists)
- [ ] Create UI Search Bar for Bikes and render the "Bike Profile Card" (showing Padlock, Condition, Active Timer, past trips table).
- [ ] Create UI Search Bar for Members and display search results. Color-code trust points (Red < 50, Green >= 50) and include [Adjust Points] and [Delete] buttons.

### [ ] Step 3: Management UI Additions
- [ ] Add inputs to manually override lock code and status inside Bike settings.
- [ ] Add [Delete] buttons to Station settings.

### [ ] Step 4: Report Logs View
- [ ] Add a new tab/view for "Report Logs".
- [ ] Create two tables: Maintenance Queue and Honesty Logs, rendering data returned from Amer's endpoints.

### [x] Step 5: Route Registration & Security
- [x] Register all new endpoints in [api.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/routes/api.js).
- [x] Wrap all administrative endpoints with `authMiddleware` to secure them.
