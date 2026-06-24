# 📋 Task List: Dashboard UI Revisions (PART 1)

This checklist tracks the progress of the Dashboard UI Revisions task. Mark items as completed (`[x]`) or in-progress (`[/]`) as development proceeds.

---

## 🛑 Prerequisite: Soft-Delete Column Additions
- [ ] **Step 1: Update SQL Schema Migration**
  - [ ] Add `is_active TINYINT(1) DEFAULT 1` to `members` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
  - [ ] Add `is_active TINYINT(1) DEFAULT 1` to `bicycle_codes` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
  - [ ] Add `is_active TINYINT(1) DEFAULT 1` to `locations` table in [schema_update.sql](file:///home/amer-talastasin/bikeshareAPI/worker-api/schema_update.sql).
- [ ] **Step 2: Update Borrow checks in API**
  - [ ] Ensure `POST /api/borrow` query checks that user, bike, and locations have `is_active = 1`.

---

## 👨‍💻 Developer A (Amer): Database Queries & Admin Controllers

### [ ] Step 1: Build the Advanced Search Queries
- [ ] Write API query to search bike by code, returning padlock, condition status, active borrow timer, and past history.
- [ ] Write API query to search active members by phone number or lastname using a `LIKE` query.

### [ ] Step 2: Build the Admin Override Logic
- [ ] Write endpoint to manually override/update a member's `trust_points`.
- [ ] Write endpoint to manually override/update a bike's lock code and `condition_status`.

### [ ] Step 3: Build the Soft Delete Logic
- [ ] Write endpoint to soft-delete a member (set `is_active = 0`).
- [ ] Write endpoint to soft-delete a bike (set `is_active = 0`).
- [ ] Write endpoint to soft-delete a location/station (set `is_active = 0`).

### [ ] Step 4: Build the Report Log Queries
- [ ] Write query to fetch the Maintenance Queue (active bikes with condition status `'Broken'`, `'Missing'`, or `'Disputed'`, showing `last_user_phone`).
- [ ] Write query to fetch Honesty Logs (filtered from the `Logs` table where `Request` matches `'Broken Report'`, `'Fixed Report'`, or `'Missing Report'`).
- [ ] Add logging logic in [bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js) so reporting actions populate these logs.

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

### [ ] Step 5: Route Registration & Security
- [ ] Register all new endpoints in [api.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/routes/api.js).
- [ ] Wrap all administrative endpoints with `authMiddleware` to secure them.
