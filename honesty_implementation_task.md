# Honesty Policy Implementation Tasks

This file tracks the implementation progress of the Honesty Policy updates for the UP Bikeshare System.

---

## 👨‍💻 Developer A (Amer): Database, Core API & Background Timers

- [x] **Step 1: Database Schema Upgrades**
  - [x] Add columns to `members` table:
    - `trust_points` (INT, Default: `100`)
    - `points_frozen` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
  - [x] Add columns to `bicycle_codes` table:
    - `condition_status` (VARCHAR(50), Default: `'Good'`)
    - `broken_reported_at` (DATETIME, Default: `NULL`)
    - `penalty_applied` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
  - [x] Add columns to `bicycle_history` table:
    - `reminder_1h_sent` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
    - `reminder_4h_sent` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
    - `done_text_received` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
    - `condition_confirmed` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)
    - `pending_status_time` (DATETIME, Default: `NULL`)
    - `reminder_pending_sent` (TINYINT(1)/BOOLEAN, Default: `0` / `FALSE`)

- [x] **Step 2: Update `POST /api/borrow` (Gatekeeper Rules)**
  - [x] Reject borrow request with `"Account suspended."` if `trust_points < 50`.
  - [x] Reject borrow request with `"Account frozen due to dispute."` if `points_frozen === true`.
  - [x] Reject borrow request with `"Bike unavailable."` if `condition_status !== 'Good'`.

- [x] **Step 3: Build Centralized Cron Service (`worker-api/services/cronJobs.js`)**
  - [x] Install `node-cron` dependency.
  - [x] Implement **Job 1 (Every 10 mins)**: 1-Hour & 4-Hour reminders.
    - If `borrow_time > 1 HOUR` and `reminder_1h_sent = FALSE` and trip active -> Send reminder text, set `reminder_1h_sent = TRUE`.
    - If `borrow_time > 4 HOURS` and `reminder_4h_sent = FALSE` and trip active -> Send reminder text, set `reminder_4h_sent = TRUE`.
  - [x] Implement **Job 2 (Every 2 mins)**: 5-Minute Pending status handshake reminder.
    - If bike is in `Pending_Status` longer than 5 mins and `reminder_pending_sent = FALSE` -> Send reminder text, set `reminder_pending_sent = TRUE`.
  - [x] Implement **Job 3 (Hourly)**: 48-Hour Unrepaired Damage Countdown.
    - If `condition_status = 'Broken'` and `broken_reported_at < NOW() - 48 hours` and `penalty_applied = FALSE` -> Deduct 20 trust points from the reporter, set `penalty_applied = TRUE`, send SMS notification.

---

## 👨‍💻 Developer B (Jhirick): Gateway, SMS Endpoints & Dashboard

- [x] **Step 1: Gateway Server Updates (Port 3000)**
  - [x] Update regex parser to identify:
    - `done [code]` -> Forward to `POST /api/done`
    - `[code] good` / `good [code]` -> Forward to `POST /api/good`
    - `[code] broken` / `broken [code]` -> Forward to `POST /api/broken`
    - `[code] fixed` / `fixed [code]` -> Forward to `POST /api/fixed`
  - [x] Create `/api/sms/send` endpoint to allow worker-api services to trigger outgoing SMS alerts.

- [x] **Step 2: Build SMS Handshake Endpoints (Port 3001)**
  - [x] Implement `POST /api/done`:
    - Mark active trip `done_text_received = TRUE` and set `pending_status_time = NOW()`.
    - Set bike status `condition_status = 'Pending_Status'`.
    - Reply: `"Trip for Bike [id] ended. Is the bike in Good or Broken condition? Reply '[id] GOOD' or '[id] BROKEN'. Please take a photo of the bike at the rack as proof."`
  - [x] Implement `POST /api/good`:
    - Verify bike is in `Pending_Status`.
    - Set `condition_status = 'Good'` in `bicycle_codes` and `condition_confirmed = TRUE` in `bicycle_history`.
    - Reply: `"Thank you! Bike [id] condition confirmed as Good."`
  - [x] Implement `POST /api/broken`:
    - If reported by current user (in response to done handshake): set `condition_status = 'Broken'`, set `broken_reported_at = NOW()`, set `penalty_applied = FALSE`. Reply: `"Bike [id] marked broken... You have 48 hours to repair..."`
    - If reported by next user (conflict with previous GOOD): set `condition_status = 'Disputed'`, reward reporter B with `+5` points, freeze User A's points (`points_frozen = TRUE`), send dispute SMS alerts to both.
  - [x] Implement `POST /api/fixed`:
    - Reset bike `condition_status = 'Good'` and clear repair timers.

- [x] **Step 3: Dashboard Admin Resolution & UI**
  - [x] Implement `POST /api/admin/resolve-dispute` in `adminController.js`:
    - If guilty: Unfreeze User A's points, apply `-30` demerit, keep bike status as `'Broken'`.
    - If innocent: Unfreeze User A's points, restore status.
  - [x] Front-end Updates:
    - Display `"Disputed"` bikes in red in the dashboard map and grid.
    - Add a `"Frozen"` badge indicator next to members with frozen points in the settings pane.
    - Build a dispute resolution interface inside Admin settings.
