# UP Bikeshare System (UPBS) Revisions: Developer Division of Labor

This document establishes the division of labor between **Amer** (Backend, DB, & Security) and **Jhirick** (Frontend & Dashboard Integration) for implementing the de-hardcoding and organization-led policy revisions.

---

## 👨‍💻 Developer A (Amer - Worker API, DB, & Security Lead)

Amer is responsible for all database migrations, backend endpoints, scheduled timers (cron jobs), dynamic string queries, OTP logic, and de-hardcoding database queries.

### 1. Database Migrations (`worker-api/schema_update.sql`)
* [ ] **Table Upgrades**: Create and run the SQL migrations for:
  - Adding `role VARCHAR(20) DEFAULT 'student'` and `consecutive_good_rides INT DEFAULT 0` to the `members` table.
  - Creating the `system_settings` table to store rules and values dynamically.
  - Creating the `login_otps` table to hold 4-digit verification pins, mobile numbers, and expiry timestamps.
* [ ] **Defaults Injection**: Populate `system_settings` with the default points settings (e.g., `'penalty_hit_and_run' = -35`, `'suspension_limit' = 50`, etc.).
* [ ] **Initial Role Data**: Run a script to set specific existing user phone numbers to have `role = 'admin'` for dashboard management access.

### 2. Cron Jobs cleanup (`worker-api/services/cronJobs.js`)
* [ ] **Timer Deletion**: Remove `startUnrepairedDamageJob` (48h countdown) and `start24hReminderJob` (24h warn) from the cron routines.
* [ ] **Settings Integration**: Update `startSixHourPenaltyJob` to fetch `'penalty_overtime'` points amount dynamically from the settings table instead of subtracting a hardcoded `-5`.

### 3. Dynamic points & merits logic
* [ ] **De-hardcoding Points**: Update the Worker API endpoints (`adminController.js` and `bikeController.js`) to query values from the `system_settings` table before applying additions/subtractions:
  - **Honesty Reward**: Query `'honesty_reward'` in `POST /api/done`.
  - **Borrow threshold**: Query `'suspension_limit'` in `POST /api/borrow`.
  - **Dispute verdicts**: Query `'penalty_hit_and_run'`, `'penalty_false_report'`, and `'reward_honest_report'` in `POST /api/admin/resolve-dispute`.
* [ ] **Consistent Rider Routine**:
  - In `POST /api/good` (when trip condition is confirmed Good): Increment user's `consecutive_good_rides`. If it reaches a multiple of 5, reward them with the `'consistent_rider_reward'` points (up to 120 max limit) and trigger an SMS notification.
  - In `POST /api/admin/resolve-dispute`: If a user is found Guilty, reset `consecutive_good_rides` to `0`.

### 4. Dynamic Hub Locations SMS listing
* [ ] **Dynamic Locations**: Update `/api/help` and `/api/locations` inside `helpController.js` to query active location names (`SELECT location_name FROM locations WHERE is_active = 1...`) and construct the SMS reply dynamically:
  - `"UPBS Help: To borrow text '[bike] [from] to [to]'. Available stations: " + activeHubs + ". To end trip, text 'done [bike]'."`

### 5. Dispute "Waive" Checkbox Backend handler
* [ ] **Waiver Logic**: Update `POST /api/admin/resolve-dispute` to accept `waive_penalty` in the payload.
* [ ] **Point Bypass**: If verdict is guilty and `waive_penalty` is true, resolve the dispute (unfreeze user, mark bike as broken), but skip the point deduction query. Send a custom SMS explaining that the points deduction was waived.

### 6. Authentication & OTP API Endpoints
* [ ] **OTP Endpoints**: Implement `POST /api/auth/request-otp` and `POST /api/auth/verify-otp`.
  - **Request OTP**: Checks if the phone number exists in `members`. Generates a 4-digit numeric code, saves it to `login_otps` (5-minute expiry), and invokes the Gateway SMS dispatcher to text the code to the user.
  - **Verify OTP**: Checks if the submitted code matches the valid record in `login_otps`. If correct, deletes the OTP and returns a signed JWT containing user's `phone_number` and `role`.
* [ ] **Admin credentials API**: Maintain the `/api/admin/login` fallback route checking against environment credentials.

---

## 👩‍💻 Developer B (Jhirick - Frontend & Dashboard Integration Lead)

Jhirick is responsible for updating the unified login layout, creating the Student Dashboard interface, building the Points Configuration settings tab, and adding the dispute resolution waive checkbox.

### 1. Unified Portal Login UI (`dashboard/index.html` & `dashboard/js/settings.js`)
* [ ] **UPBS Portal Login design**: Rename the settings panel login card to "UPBS Portal Login".
* [ ] **OTP Request layout**: Add an input field for phone numbers, a "Request OTP" button, and an OTP validation input field that displays after requesting.
* [ ] **Login actions**: Connect buttons to Amer's OTP endpoints (`/api/auth/request-otp` and `/api/auth/verify-otp`). Show loading states ("Sending code...", "Verifying...") during authentication.
* [ ] **Admin override**: Provide a togglable link ("Admin Credentials Login") to display the original username/password input for system fallbacks.

### 2. View Routing & Access Control
* [ ] **Role checking**: On successful login, decode the JWT token (or check the returned JSON payload) to verify the user's role.
* [ ] **Dashboard display**:
  - If `role === 'admin'`: Open the full **Management Dashboard** (live occupancy grids, override settings, user search list, dispute resolution cards).
  - If `role === 'student'`: Render the brand-new **Student Dashboard** view.

### 3. Student Dashboard View (`dashboard/index.html` & CSS)
* [ ] **Dashboard Panels**: Build the responsive student landing panel showing:
  - **Trust Score Gauge**: An elegant circular SVG progress gauge displaying their trust score (e.g. `95/120`). Animate the meter bar. Color is calculated dynamically in JS: Green for >= 90, Yellow for 60 to 89, Red for < 60.
  - **Active Ride Timer**: If user has an active checkout, show a prominent widget with a ticking clock counting up to the 6-hour limit.
  - **Personal Ride Log**: A table listing the user's personal borrow history (dates, bike code, stations).
  - **Rules Checklist card**: Modern cards outlining the Honesty Policy commands.

### 4. Dispute "Waive" Checkbox UI
* [ ] **Checkbox inclusion**: On the dispute cards in the admin members listing, add a checkbox: `[ ] Waive standard point penalty` next to the resolution actions.
* [ ] **Payload update**: Include `waive_penalty: checkbox.checked` in the body of the fetch request to `/api/admin/resolve-dispute`.

### 5. Points Configuration Tab
* [ ] **Tab Navigation**: Add a new tab button **"Points Settings"** in the Admin panel.
* [ ] **Settings Grid**: Construct a dashboard table or list of settings cards populated via `GET /api/admin/settings`.
* [ ] **Edit modals**: Add edit/save options to update any settings dynamically via `POST /api/admin/settings`.
