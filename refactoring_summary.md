# UP Bike Share: Decoupled Architecture Refactoring Summary

This document summarizes the refactoring process, architecture, and deployment procedures for transitioning the UP Bike Share monolithic SMS daemon into a decoupled **Gateway Server** and **Worker API** architecture.

---

## 🏗️ Decoupled Architecture Overview

```
 ┌──────────────────────────┐      SMS Commands      ┌─────────────────────────┐
 │   Gammu SMS Daemon       │ ─────────────────────► │     Gateway Server      │
 │ (Writes to smsd database)│ ◄───────────────────── │   (Daemon - Port 3000)  │
 └──────────────────────────┘      Gammu Inject      └───────────┬─────────────┘
                                                                 │
                                                       HTTP REST │ (Axios client)
                                                       Payloads  ▼
 ┌──────────────────────────┐                        ┌─────────────────────────┐
 │      MySQL / MariaDB     │                        │       Worker API        │
 │  (App Database: upbs)    │ ◄───────────────────── │   (Express - Port 3001) │
 └──────────────────────────┘      SQL Queries       └─────────────────────────┘
```

1. **Gateway Server (`/gateway-server`)**:
   - Monitored by a systemd daemon.
   - Continuous database polling loop checking `smsd.inbox` for unprocessed messages (`Processed = 'false'`).
   - Normalizes and parses incoming SMS commands using regular expressions.
   - Delegates business and transactional database logic to the Worker API over HTTP REST requests.
   - Triggers physical SMS dispatch using the connected GSM modem (`gammu-smsd-inject` spawn) and marks messages as processed.

2. **Worker API (`/worker-api`)**:
   - Powered by Express.js and connected to the main `upbs` application database.
   - Exposes RESTful endpoints validating requests, handling transactional states, query logs, and generating SMS reply text.
   - Keeps database queries decoupled from hardware and daemon loop operations.

---

## 📦 Component & File Breakdown

### 1. Gateway Server (`/gateway-server`)
- **[server.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/server.js)**: Orchestrates the main `pollInbox()` loop, parses inputs with regexes, calls corresponding REST endpoints on the Worker API via Axios, sends SMS replies, and flags messages as processed.
- **[db.js](file:///home/amer-talastasin/bikeshareAPI/gateway-server/db.js)**: Connects to the local Gammu database `smsd` using `mysql2/promise` (defaulting to `127.0.0.1`).
- **[package.json](file:///home/amer-talastasin/bikeshareAPI/gateway-server/package.json)**: Declares dependencies for `axios` and `mysql2`.

### 2. Worker API (`/worker-api`)
- **[server.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/server.js)**: Express boilerplate loading middleware (CORS, body-parser) and mounting routes.
- **[routes/api.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/routes/api.js)**: Declares clean route paths mapping paths to controllers.
- **[db.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/db.js)**: Configures the connection pool to the `upbs` app database (defaulting to `127.0.0.1`).
- **[package.json](file:///home/amer-talastasin/bikeshareAPI/worker-api/package.json)**: Declares dependencies for `express`, `cors`, `mysql2`, and a `"start"` script.
- **Controllers (`/worker-api/controllers`)**:
  - **[memberController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/memberController.js)**: Handles `/api/members/check` (user validation).
  - **[bikeController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/bikeController.js)**: Exposes search endpoints (`/api/search`, `/api/search-all`, `/api/locations`), history (`/api/usage`), and atomic transaction borrowing (`/api/borrow`).
  - **[helpController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/helpController.js)**: Exposes endpoints for static user instruction texts (`/api/help`, `/api/how`).
  - **[fallbackController.js](file:///home/amer-talastasin/bikeshareAPI/worker-api/controllers/fallbackController.js)**: Logs system failures and bad inputs (`/api/invalid-command`, `/api/non-registered`).

---

## 🛠️ Key Refactoring Fixes & Integrations

During integration testing, we resolved several critical bugs to ensure smooth end-to-end communication:

1. **Parameter Payload Structure Mismatch**:
   The Gateway was initially sending only `{ phone_number, command }`. This was corrected so that all endpoints receive the variables expected by the Worker API (`smsSender`, `messageId`, `bicycleCode`, `fromLocation`, `toLocation`).
2. **Registration Check Property Key**:
   Fixed the key evaluation in `server.js` from `checkResponse.data.isRegistered` to `checkResponse.data.registered` to align with the Worker API response.
3. **Missing URL Prefixes**:
   Added the `/api` route prefix to all Axios REST target URLs (e.g. `/api/search` instead of `/search`).
4. **Multi-Message Replies for Usage History**:
   Adjusted the Gateway to detect when the API returns an array of messages (`{ replies: [...] }`) and dispatch them sequentially.
5. **Database Duplicate Entry Errors (`ER_DUP_ENTRY`)**:
   Fixed an issue where duplicate invalid command logs from the same number caused key duplication exceptions. We replaced query statements with `INSERT IGNORE INTO` and encapsulated logger queries inside internal `try-catch` blocks to protect main requests.
6. **Local Host connection defaults**:
   Aligned both configuration pools to point to `127.0.0.1` by default, making testing and deployment on the host machine work out-of-the-box.

---

## 🚀 Production Deployment (Systemd)

We created two independent systemd service unit files to automate the decoupled processes on the host server:

### Service Files in the Workspace:
- **[bikeshare-worker.service](file:///home/amer-talastasin/bikeshareAPI/bikeshare-worker.service)**: Launches the business logic API.
- **[bikeshare-gateway.service](file:///home/amer-talastasin/bikeshareAPI/bikeshare-gateway.service)**: Launches the SMS polling daemon. *(Configured to automatically load the worker service as a dependency).*

### Installation Commands on Host Machine (`192.168.1.10`):

1. **Copy the Decoupled Service files to Systemd**:
   ```bash
   sudo cp /home/stph/bikeshareAPI_2/bikeshare-worker.service /etc/systemd/system/
   sudo cp /home/stph/bikeshareAPI_2/bikeshare-gateway.service /etc/systemd/system/
   ```

2. **Reload systemd & Enable the services (to start on boot)**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable bikeshare-worker.service
   sudo systemctl enable bikeshare-gateway.service
   ```

3. **Manage the decoupled server daemon state**:
   - **Start**: `sudo systemctl start bikeshare-gateway.service`
   - **Stop**: `sudo systemctl stop bikeshare-gateway.service bikeshare-worker.service`
   - **Restart**: `sudo systemctl restart bikeshare-worker.service bikeshare-gateway.service`

4. **Live Terminal Logging**:
   To stream logs in real-time, run:
   ```bash
   journalctl -u bikeshare-worker.service -u bikeshare-gateway.service -f
   ```
