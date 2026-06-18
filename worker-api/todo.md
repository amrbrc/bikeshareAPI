# Amer's Worker API Step-by-Step Task List (`/worker-api/todo.md`)

This guide is designed for you to tackle the API implementation one step at a time. Each task contains an explanation of the business logic and database queries you will need to copy from the original monolith.

---

## [x] Task 1: Initialize the Project and Install Dependencies
* **Files Affected**: `package.json`
* **Explanation**: Create a basic `package.json` file inside `worker-api/` and install three core dependencies:
  1. `express` (routing server)
  2. `cors` (allow cross-origin requests from the gateway)
  3. `mysql2` (promise-based database driver)
* **What to do**:
  Initialize npm and install dependencies:
  ```bash
  npm init -y
  npm install express cors mysql2
  ```

---

## [x] Task 2: Configure the Database Pool
* **Files Affected**: `db.js`
* **Explanation**: Configure a promise-based connection pool to your `upbs` database using `mysql2/promise`.
* **What to do**:
  Export a connection pool instance:
  ```javascript
  const mysql = require('mysql2/promise');
  const upbsPool = mysql.createPool({ ... });
  module.exports = { upbsPool };
  ```

---

## [x] Task 3: Establish the Basic Server Setup
* **Files Affected**: `server.js`
* **Explanation**: Set up the Express boilerplates: instantiate Express, use `cors()`, use `express.json()` (to parse request bodies), and make the server listen on port `3001`.
* **What to do**:
  Create `server.js` with imports, middleware, and a port listener:
  ```javascript
  const express = require('express');
  const cors = require('cors');
  const db = require('./db');
  const app = express();
  // ... middleware
  app.listen(3001, () => console.log('API online!'));
  ```

---

## [x] Task 4: Implement the Member Check Route
* **Files Affected**: `server.js`
* **Endpoint**: `POST /api/members/check`
* **Explanation**: Jhirick's Gateway needs to know if an SMS sender is a registered member of UP Bike Share before processing certain commands.
* **Database Query to copy**:
  ```sql
  SELECT * FROM members WHERE phone_number = ?
  ```
* **Expected Response**:
  - `{ "registered": true, "user": { ... } }` (contains name, number, etc.)
  - `{ "registered": false, "user": null }`

---

## [x] Task 5: Implement the Search Location Route
* **Files Affected**: `server.js`
* **Endpoint**: `POST /api/search`
* **Explanation**: Resolves the "search [bike code]" command. It retrieves the bicycle's coordinate, logs the search request, and returns the formatted response.
* **Database Queries to copy**:
  1. Retrieve member info: `SELECT lastname, firstname, phone_number FROM members WHERE phone_number = ?`
  2. Retrieve bike location: `SELECT new_location FROM bicycle_codes WHERE bicycle_code = ?`
  3. Insert Log: `INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) VALUES (?, ?, ?, ?, NOW(), ?, ?)`
* **Expected Response**: `{ "reply": "At the moment, the current location of <bike> is at <location>." }`

---

## [x] Task 6: Implement Help and How Routes
* **Files Affected**: `server.js`
* **Endpoints**: `POST /api/help` and `POST /api/how`
* **Explanation**: Expose static instruction responses to users, log the commands under "Bikeshare help" and "How to Borrow".
* **Database Queries to copy**:
  1. Member verification.
  2. Insert Log query.
* **Expected Response**: `{ "reply": "Commands: ..." }` or `{ "reply": "Use the format: ..." }`

---

## [x] Task 7: Implement Search All and Locations Routes
* **Files Affected**: `server.js`
* **Endpoints**: `POST /api/search-all` and `POST /api/locations`
* **Explanation**: Retrieve coordinate details of all active bicycles or all active stations.
* **Database Queries to copy**:
  1. Bulk bicycle list: `SELECT bicycle_code, new_location, previous_location FROM bicycle_codes`
  2. Active station list: `SELECT location_name FROM locations`
  3. Insert Logs.
* **Expected Response**: `{ "reply": "All Bicycles Locations:\n..." }`

---

## [x] Task 8: Implement Usage History Route (With SMS Splitter)
* **Files Affected**: `server.js`
* **Endpoint**: `POST /api/usage`
* **Explanation**: Resolves the "usage [bike code]" command. It fetches historical movements of a bike, logs the request, and splits the reply array if the history text exceeds 160 characters (to avoid carrier truncation).
* **Database Queries to copy**:
  1. Verify bike: `SELECT * FROM bicycle_codes WHERE bicycle_code = ?`
  2. Fetch history: `SELECT previous_location, new_location, borrowed_by, borrowed_at FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC LIMIT 1`
  3. Insert Log.
* **Expected Response**: `{ "replies": [ "Part 1...", "Part 2..." ] }`

---

## [x] Task 9: Implement the Atomic Borrowing Transaction Route
* **Files Affected**: `server.js`
* **Endpoint**: `POST /api/borrow`
* **Explanation**: This is the most crucial endpoint. It modifies database state and logs a borrowing session in a single database transaction. If any queries fail, it rolls back to ensure data integrity.
* **Database Queries to copy (wrapped in `upbsConn.beginTransaction()`):**
  1. Verify locations are active: `SELECT * FROM locations WHERE location_name = ?`
  2. Update current bike location: `UPDATE bicycle_codes SET previous_location = ?, new_location = ? WHERE bicycle_code = ?`
  3. Create history record: `INSERT INTO bicycle_history (bicycle_code, previous_location, new_location, borrowed_by) VALUES (?, ?, ?, ?)`
  4. Log session: `INSERT INTO Logs (...) VALUES (...)`
  5. Commit or Rollback if catch block is triggered.
* **Expected Response**: `{ "reply": "Hi <Name>! The lock code for bicycle <id> is <lock>..." }`

---

## [x] Task 10: Implement Error / Invalid Command Fallbacks
* **Files Affected**: `server.js`
* **Endpoints**: `POST /api/invalid-command` and `POST /api/non-registered`
* **Explanation**: Record invalid SMS commands or unrecognized sender attempts to database logger tables.
* **Database Queries to copy**:
  - `SELECT * FROM invalid_command_senders WHERE phone_number = ? AND message_id = ?`
  - `INSERT INTO invalid_command_senders (phone_number, message_id) VALUES (?, ?)`
  - `SELECT * FROM non_registered_senders WHERE phone_number = ? AND message_id = ?`
  - `INSERT INTO non_registered_senders (phone_number, message_id) VALUES (?, ?)`
* **Expected Response**: `{ "reply": "Invalid Command..." }` or `{ "reply": "Sorry, you are not registered..." }`
