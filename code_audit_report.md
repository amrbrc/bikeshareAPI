# UP Bikeshare System Codebase Audit Report

This report documents the security vulnerabilities, logical loopholes, and architectural discrepancies identified during a comprehensive audit of the UP Bikeshare system codebase. It spans the [Gateway Server](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js), [Worker API](file:///home/amer-talastasin/bikeshareAPI/worker-api), and the frontend [Dashboard](file:///home/amer-talastasin/bikeshareAPI/dashboard).

---

## Summary of Findings

| ID | Title | Category | Severity | Target File |
|---|---|---|---|---|
| 1 | Unprotected Public SMS Send API | Security / Vulnerability | High | [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L13) |
| 2 | Concurrent Polling Race Condition (Double Processing) | Logic / Concurrency | High | [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L169) |
| 3 | Infinite Loop & Queue Blockage on API Errors | Stability / Error Handling | High | [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L57) |
| 4 | Borrowing Transaction Concurrency Race Condition | Logic / Concurrency | High | [worker-api/controllers/bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L271) |
| 5 | Hardcoded Admin Authentication Session Token Bypass | Security / Vulnerability | High | [worker-api/controllers/adminController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L10) |
| 6 | Missing `#members-list` DOM Element (Broken Dispute Resolution UI) | Frontend / Mismatch | High | [dashboard/index.html](file:///home/amer-talastasin/bikeshareAPI/dashboard/index.html) |
| 7 | Re-Registration Blocked After Soft Deletion | Logic / Loophole | Medium | [worker-api/controllers/adminController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L37) |
| 8 | Dynamic Stations Mismatch with Static Leaflet Map | Frontend / Mismatch | Medium | [dashboard/js/map.js](file:///home/amer-talastasin/bikeshareAPI/dashboard/js/map.js#L10) |
| 9 | Inconsistent Member Soft-Deactivation Checks | Logic / Loophole | Medium | [worker-api/routes/api.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/routes/api.js) |
| 10 | Syntax Error in Admin Override Bicycle Query | Stability / Bug | Medium | [worker-api/controllers/adminController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L204) |
| 11 | Missing `dotenv` Configuration in Gateway | Configuration / Bug | Medium | [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L1) |
| 12 | Hardcoded Gateway URL inside Worker API | Configuration / Discrepancy | Low | [worker-api/controllers/bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L583) |
| 13 | Un-transactional Multi-Step Updates in Handshakes | Logic / Stability | Medium | [worker-api/controllers/bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L512) |
| 14 | Silent Failures in SMS Sending Feedback Loop | Stability / Loophole | Low | [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L172) |
| 15 | "Search [bldg]" Instruction Discrepancy | Logic / UX Mismatch | Low | [worker-api/controllers/bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L4) |

---

## Detailed Findings & Solutions

### 1. Unprotected Public SMS Send API
> [!WARNING]
> **Severity**: High (Security Vulnerability)  
> **Location**: [gateway-server/server.js:L13-L25](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L13-L25)

#### Description
The `/api/sms/send` endpoint parses a phone number and message body to send out an SMS through the modem. It listens on port `3000` (binding to `0.0.0.0` by default) but implements no authentication headers, API key checks, or rate limiting. Any system on the network can abuse this endpoint to broadcast arbitrary SMS messages, resulting in high cellular costs or text-spam attacks.

#### Solution
- Configure the gateway to only listen on the local loopback interface: `app.listen(GATEWAY_PORT, '127.0.0.1', ...)` if the Worker API runs on the same machine.
- Alternatively, introduce a shared secret API key in the `.env` file of both services, verifying it via middleware before executing the `sendReply` function.

---

### 2. Concurrent Polling Race Condition (Double Processing)
> [!WARNING]
> **Severity**: High (Logic / Concurrency Bug)  
> **Location**: [gateway-server/server.js:L167-L169](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L167-L169)

#### Description
The gateway handles polling using `setInterval(pollInbox, 200)`. If a database query runs slowly or the Worker API experiences latency, the `pollInbox` function will overlap. Since the selected inbox records are only marked as processed (`Processed='true'`) at the end of the loop, concurrent executions will fetch the *same* unprocessed SMS rows. This results in duplicate API calls (e.g. multiple borrows registered, double dispute logs, and duplicate reply SMS texts sent to members).

#### Solution
Replace `setInterval` with a recursive `setTimeout` configuration that triggers the next polling execution only *after* the current execution finishes, or maintain a global `isPolling` boolean lock.
```javascript
async function startPolling() {
    try {
        await pollInbox();
    } finally {
        setTimeout(startPolling, 200);
    }
}
```

---

### 3. Infinite Loop & Queue Blockage on API Errors
> [!IMPORTANT]
> **Severity**: High (Stability / Error Handling)  
> **Location**: [gateway-server/server.js:L57-L74](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L57-L74) and [L157-L160](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L157-L160)

#### Description
If a query or endpoint inside the `try` block of `pollInbox` fails (e.g. if the Worker API returns a `400 Bad Request` validation failure or a `500 Database Error`), the `catch (apiError)` block logs the message but **does not** update the database record as processed. The message is left as `Processed='false'`. On the next poll 200ms later, the same message is retrieved, fails again, and creates a tight infinite loop of crashing calls. Furthermore, if a single message throws, it aborts the loop over `rows`, blocking the processing of all subsequent messages.

#### Solution
Classify errors:
- If the error is a client-level response (400, 422, 404), mark the database record as processed immediately to prevent retry loops, and optionally send a fallback SMS informing the user of the invalid request.
- Only skip marking the record as processed for transient system failures (such as `503 Service Unavailable` or a network timeout).

---

### 4. Borrowing Transaction Concurrency Race Condition
> [!CAUTION]
> **Severity**: High (Logic / Concurrency Bug)  
> **Location**: [worker-api/controllers/bikeController.js:L271-L342](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L271-L342)

#### Description
In `borrow`, the database transaction is initialized on line 342 (`await upbsConn.beginTransaction()`), but the checks to see if the member is suspended/frozen and whether the bicycle is available (`condition_status === 'Good'`) are run on lines 290 and 313 **outside** and **before** the transaction starts. 
If two users request to borrow the same bicycle concurrently:
1. User A's check confirms the bike's status is `'Good'`.
2. User B's check confirms the bike's status is `'Good'`.
3. User A opens a transaction and updates the bike's status to `'Borrowed'`.
4. User B opens a transaction and updates the bike's status to `'Borrowed'`.
Both users receive successful responses with the lock combination. The bike's status remains `'Borrowed'`, but the history records are corrupted, and two active borrowings exist.

#### Solution
Start the transaction at the very beginning of the `borrow` handler (before any SELECT queries) and run the member/bicycle queries inside the transaction using locks (e.g., `SELECT ... FOR UPDATE` or `SELECT ... LOCK IN SHARE MODE`) to serialize concurrent checks.

---

### 5. Hardcoded Admin Authentication Session Token Bypass
> [!CAUTION]
> **Severity**: High (Security Vulnerability)  
> **Location**: [worker-api/controllers/adminController.js:L10-L15](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L10-L15) and [worker-api/middleware/authMiddleware.js:L10-L12](file:///home/amer-talastasin/bikeshareAPI/worker-api/middleware/authMiddleware.js#L10-L12)

#### Description
The admin login returns a static string `'admin-logged-in-token'`, and `authMiddleware` checks strictly for this hardcoded token. An attacker does not need to know the admin credentials; they can bypass the login screen entirely by manually adding the `Authorization: Bearer admin-logged-in-token` header to any requests, gaining full administrative control of the system (adjusting points, overriding locks, and deleting users).

#### Solution
Replace the static token system with dynamically generated session tokens, or sign a lightweight JSON Web Token (JWT) using a secure secret key retrieved from the `.env` file (e.g. using `jsonwebtoken` library).

---

### 6. Missing `#members-list` DOM Element (Broken Dispute Resolution UI)
> [!IMPORTANT]
> **Severity**: High (Frontend / Mismatch)  
> **Location**: [dashboard/index.html](file:///home/amer-talastasin/bikeshareAPI/dashboard/index.html) and [dashboard/js/settings.js:L48](file:///home/amer-talastasin/bikeshareAPI/dashboard/js/settings.js#L48)

#### Description
`settings.js` queries `document.getElementById('members-list')` to render the list of registered users. Inside this renderer, if a member's points are frozen, it injects the GUI to resolve active disputes (the "Innocent" and "Guilty" verdict buttons). However, `#members-list` does not exist in `index.html`. The script returns early (`if (!membersList) return;`), meaning the members list is completely invisible, and admins **cannot** resolve user disputes from the frontend dashboard.

#### Solution
Modify [dashboard/index.html](file:///home/amer-talastasin/bikeshareAPI/dashboard/index.html) to include the `<div id="members-list"></div>` container (for example, inside the admin panel view under "Member Modifications" or as a dedicated section).

---

### 7. Re-Registration Blocked After Soft Deletion
> [!WARNING]
> **Severity**: Medium (Logic Loophole)  
> **Location**: [worker-api/controllers/adminController.js:L37-L40](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L37-L40), [L63-L66](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L63-L66), and [L89-L92](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L89-L92)

#### Description
When members, bikes, or locations are deleted, they are soft-deleted by setting `is_active = 0`. However, the creation endpoints checks for duplicates using:
`SELECT * FROM members WHERE phone_number = ?`
Since soft-deleted records remain in the database, this query still returns the inactive user. The server will reject the registration, returning "Phone number already registered". Deleted phone numbers and bike codes can never be re-added or reused.

#### Solution
Filter out inactive records during registration checks:
`SELECT * FROM members WHERE phone_number = ? AND is_active = 1`
Alternatively, if an inactive record is found, the system should re-activate it by updating `is_active = 1` instead of blocking the request.

---

### 8. Dynamic Stations Mismatch with Static Leaflet Map
> [!IMPORTANT]
> **Severity**: Medium (Frontend Mismatch)  
> **Location**: [dashboard/js/map.js:L10-L18](file:///home/amer-talastasin/bikeshareAPI/dashboard/js/map.js#L10-L18) and [L182-L185](file:///home/amer-talastasin/bikeshareAPI/dashboard/js/map.js#L182-L185)

#### Description
An admin can dynamically add or delete stations from the database. However, `map.js` plots pins by looping over a static, hardcoded dictionary `STATION_COORDS`. If an admin adds a new station, it will appear in the dashboard lists but will **never** display on the Leaflet map. Conversely, if a station is deleted, it will remain on the map because the coordinates are statically defined.

#### Solution
Add `latitude` and `longitude` fields to the `locations` database table. Update the "Add Station" form to collect these coordinates, and modify `map.js` to fetch active stations dynamically from `/api/locations` to plot markers, rather than reading from a hardcoded array.

---

### 9. Inconsistent Member Soft-Deactivation Checks
> [!WARNING]
> **Severity**: Medium (Logic Loophole)  
> **Location**: [worker-api/routes/api.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/routes/api.js) and [worker-api/controllers/memberController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/memberController.js)

#### Description
Active status (`is_active = 1`) is checked strictly on borrow, return, and dispute resolution endpoints. However, the check is ignored in:
- `checkMember` (`/api/members/check`)
- `search` (`/api/search`)
- `searchAll` (`/api/search-all`)
- `locations` (`/api/locations`)
- `usage` (`/api/usage`)
A deactivated (deleted) user will still return as a registered member to the gateway, and can run query/search commands, which bypasses the deactivation intention.

#### Solution
Update all member lookup SQL statements to append `AND is_active = 1`. Specifically in `checkMember`:
`SELECT * FROM members WHERE phone_number = ? AND is_active = 1`

---

### 10. Syntax Error in Admin Override Bicycle Query
> [!IMPORTANT]
> **Severity**: Medium (Stability / Bug)  
> **Location**: [worker-api/controllers/adminController.js:L204-L215](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/adminController.js#L204-L215)

#### Description
In `overrideBicycle`, the SQL query is built dynamically based on whether fields are passed:
```javascript
let updateQuery = "UPDATE bicycle_codes SET ";
if (combination_lock) { updateQuery += "combination_lock = ?, "; ... }
if (condition_status) { updateQuery += "condition_status = ?, "; ... }
updateQuery = updateQuery.slice(0, -2) + " WHERE bicycle_code = ? ...";
```
If an admin sends a request with both fields undefined/missing, `updateQuery` is sliced to `"UPDATE bicycle_codes S"`, resulting in a syntax error: `UPDATE bicycle_codes S WHERE bicycle_code = ?`.

#### Solution
Add validation checks at the beginning of the handler:
```javascript
if (!combination_lock && !condition_status) {
    return res.status(400).json({ success: false, error: 'At least one field (lock or status) must be provided' });
}
```

---

### 11. Missing `dotenv` Configuration in Gateway
> [!WARNING]
> **Severity**: Medium (Configuration Bug)  
> **Location**: [gateway-server/server.js:L1](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L1)

#### Description
The gateway server does not call `require('dotenv').config()`. It is unable to read configuration from the `.env` file (e.g. database credentials or worker URLs). It falls back to hardcoded database defaults (`host: '127.0.0.1'`, etc.). If the database configuration needs to be modified, changes must be hardcoded in files, which is a bad practice.

#### Solution
Install `dotenv` inside the `/gateway-server` directory and add `require('dotenv').config()` at the top of [gateway-server/server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js).

---

### 12. Hardcoded Gateway URL inside Worker API
> [!NOTE]
> **Severity**: Low (Configuration Mismatch)  
> **Location**: [worker-api/controllers/bikeController.js:L583](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L583)

#### Description
In `bikeController.js`, when a dispute is triggered, the Worker API alerts the previous user by sending a POST request to `http://localhost:3000/api/sms/send`. This URL is hardcoded. If the gateway server runs on a different port or host (controlled via `GATEWAY_URL` in `.env`), the Worker API will ignore it, resulting in failed dispute notifications.

#### Solution
Import and resolve the gateway endpoint dynamically from the environment variable:
`const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';`
Then fetch: `${GATEWAY_URL}/api/sms/send`.

---

### 13. Un-transactional Multi-Step Updates in Handshakes
> [!WARNING]
> **Severity**: Medium (Logic / Stability)  
> **Location**: [worker-api/controllers/bikeController.js:L512-L596](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L512-L596)

#### Description
The `broken` handler performs several updates across multiple tables (`bicycle_codes`, `members`, `Logs`) in sequence:
1. Set condition_status to `'Disputed'`
2. Add `+5` points to the next user
3. Insert entry to `Logs`
4. Set `points_frozen = 1` for the previous user.
None of these calls are wrapped in a database transaction. If the connection fails halfway through (e.g. after step 2), the database enters a corrupt state where a user gets points but the bike status is unchanged and the previous borrower is not frozen.

#### Solution
Wrap the multi-update operations in a transaction block using `connection.beginTransaction()` / `connection.commit()` / `connection.rollback()`, similar to `POST /api/borrow`.

---

### 14. Silent Failures in SMS Sending Feedback Loop
> [!NOTE]
> **Severity**: Low (Stability Loophole)  
> **Location**: [gateway-server/server.js:L172-L188](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js#L172-L188) and [worker-api/services/cronJobs.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/services/cronJobs.js)

#### Description
In `gateway-server/server.js`, `sendReply` resolves the promise even if the `gammu` command fails (returns non-zero exit code). In `cronJobs.js`, if `sendSMS` fails, the job updates the database setting `reminder_pending_sent = 1` regardless. This means that if the GSM modem goes offline, messages are dropped silently, marked as successfully processed, and will never retry.

#### Solution
Have the promise reject on non-zero exit codes. Modify `cronJobs.js` and `gateway-server` to catch these rejections and retry sending after a delay, rather than assuming success.

---

### 15. "Search [bldg]" Instruction Discrepancy
> [!NOTE]
> **Severity**: Low (UX / Logic Mismatch)  
> **Location**: [worker-api/controllers/bikeController.js:L4-L61](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js#L4-L61) and [worker-api/controllers/helpController.js:L25](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/helpController.js#L25)

#### Description
The help command output advertises `4. search [bldg]` as a valid option. However, the backend `/api/search` handler only queries the bike code matching `bicycle_code = ?`. If a user texts `search eee` (which is a building/location name), the query fails and returns `Bicycle code eee not found`.

#### Solution
Update `search` in `bikeController.js` to detect if the query matches a valid location name. If it does, query `SELECT bicycle_code FROM bicycle_codes WHERE new_location = ?` and return a list of all bikes parked at that location.
