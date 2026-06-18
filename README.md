# UP Bikeshare API

This repository contains two separate but integrated services that together form the complete **UP Bike Share System**:

1. **Gateway Server** (`gateway-server`):
   - The main entry point for all SMS interactions.
   - Manages the physical modem and the queue of incoming/outgoing messages.
   - Handles database cleanup and status updates.

2. **Worker API** (`worker-api`):
   - Contains the core business logic.
   - Handles user authentication, database queries (members, bikes, logs), and trip management.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Hardware Interface**: Gammu (via SMSD)

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
