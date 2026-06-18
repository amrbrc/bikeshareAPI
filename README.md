# UP Bikeshare System

This codebase is the backend of the **UP Bike Share System**, a student-run, free-to-use bicycle-sharing service at the University of the Philippines. 

The system allows registered users to search for available bicycles, query location stations, view usage history, and borrow bicycles directly by sending simple, normalized SMS commands from their mobile phones.

## How It Works (High-Level)
1. **User Sends SMS**: A user sends a command (e.g., `search all` or `1 eee to vinzons`) to the system's phone number.
2. **Modem receives SMS**: A physical GSM modem receives the SMS, and `gammu-smsd` (SMS Daemon) reads it and stores it in the local `smsd.inbox` database table.
3. **Gateway Polling**: The **Gateway Server** polls the inbox table, detects the new message, parses the command, and sends it to the **Worker API**.
4. **Business Logic Execution**: The **Worker API** connects to the main `upbs` database, checks the sender's registration, processes the action (like updating bike coordinates or logging transactions), and returns the appropriate text reply.
5. **SMS Sent to User**: The Gateway Server receives the reply from the Worker API and injects it back to the GSM modem in the background using `gammu-smsd-inject`, delivering the response SMS back to the user's phone.

---

## System Architecture

The codebase has been refactored from a single monolithic server into two modular services:

### 1. Gateway Server (`gateway-server`)
- **Port**: `3000`
- **Purpose**: Acts as the SMS-hardware gateway proxy.
- **Key Roles**:
  - Polls the local `smsd` inbox database for unprocessed messages.
  - Normalizes and parses incoming SMS commands.
  - Proxies commands to the Worker API.
  - Interfaces with the physical GSM modem via `gammu-smsd-inject` in a non-blocking background queue to deliver replies.

### 2. Worker API (`worker-api`)
- **Port**: `3001`
- **Purpose**: Houses the core business logic and database interactions.
- **Key Roles**:
  - Checks user membership registration status.
  - Manages bicycle statuses and coordinates in database transactions.
  - Queries active location stations and lists usage histories.
  - Logs transaction histories (`Logs` table) and invalid attempt counters.

---

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (split into `smsd` for SMS daemon and `upbs` for bike sharing data)
- **Hardware Interface**: Gammu (via SMSD)

---

## Running Locally

### 1. Worker API (Business Logic)
Starts on **Port 3001**.
```bash
cd worker-api
npm install
node server.js
```

### 2. Gateway Server (SMS Handling)
Starts on **Port 3000**.
*Note: Ensure your Gammu daemon is running and configured to point to this server.*
```bash
cd gateway-server
npm install
node server.js
```

### 3. Production (PM2)
To run both services simultaneously on a server:
```bash
pm2 start gateway-server/server.js --name "upbs-gateway"
pm2 start worker-api/server.js --name "upbs-worker"
pm2 save
pm2 startup
```
