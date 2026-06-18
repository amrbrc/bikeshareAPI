# Jhirick's Gateway Server Step-by-Step Task List (`/gateway-server/todo.md`)

This guide is designed for you to tackle the Gateway Server implementation one step at a time. Each task contains instructions and explanations on how to integrate the local Gammu polling loop with Amer's Worker API server.

---

## [ ] Task 1: Initialize the Project and Install Dependencies
* **Files Affected**: `package.json`
* **Explanation**: Create a basic `package.json` file inside `gateway-server/` and install your dependencies:
  1. `axios` (to make HTTP requests to Amer's port `3001` server)
  2. `mysql2` (promise-based database driver to check the local `smsd` inbox table)
* **What to do**:
  Initialize npm and install dependencies:
  ```bash
  npm init -y
  npm install axios mysql2
  ```

---

## [ ] Task 2: Configure the Local `smsd` Database Pool
* **Files Affected**: `db.js`
* **Explanation**: Set up a promise-based connection pool to your local Gammu `smsd` database using `mysql2/promise`.
* **What to do**:
  Export a connection pool instance:
  ```javascript
  const mysql = require('mysql2/promise');
  const smsdPool = mysql.createPool({ ... });
  module.exports = { smsdPool };
  ```
  *(Note: The Gateway Server should not connect to the UP Bike Share `upbs` database at all; Amer's Worker API will handle that).*

---

## [ ] Task 3: Establish the Server Polling Boilerplate
* **Files Affected**: `server.js`
* **Explanation**: Set up your main daemon file. Import the connection pool, `child_process.spawn`, and `axios`. Set up a polling interval that fires `checkInbox()` every 200ms.
* **What to do**:
  Create `server.js` with basic imports and a polling timer:
  ```javascript
  const db = require('./db');
  const { spawn } = require('child_process');
  const axios = require('axios');

  const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';

  async function checkInbox() {
      // Polling logic will go here
  }

  console.log('Gateway Server started. Polling local smsd inbox...');
  setInterval(checkInbox, 200);
  ```

---

## [ ] Task 4: Port the `sendReply` and `markAsProcessed` Helpers
* **Files Affected**: `server.js`
* **Explanation**: Port the spawning logic for Gammu. When `sendReply` is called, it spawns `gammu-smsd-inject`. Upon process completion, it updates the local database to set `Processed = 'true'`.
* **What to do**:
  Implement `sendReply` using a Promise wrapper so you can chain sequential messages:
  ```javascript
  async function sendReply(smsSender, message, messageId, smsdConn) {
      return new Promise((resolve) => {
          const gammu = spawn('gammu-smsd-inject', ['TEXT', smsSender, '-text', message]);
          gammu.on('close', async (code) => {
              if (smsdConn && messageId) {
                  await smsdConn.query("UPDATE inbox SET Processed = 'true' WHERE ID = ?", [messageId]);
              }
              resolve();
          });
      });
  }
  ```

---

## [ ] Task 5: Implement `checkInbox` Polling Database Retrieval
* **Files Affected**: `server.js`
* **Explanation**: Inside your `checkInbox()` function, fetch all unprocessed inbox messages from the Gammu database.
* **What to do**:
  Acquire a connection from your connection pool and execute:
  ```javascript
  const smsdConn = await db.smsdPool.getConnection();
  const rows = await smsdConn.query("SELECT * FROM inbox WHERE Processed='false'");
  // Loop through rows, parse content, and execute APIs
  ```

---

## [ ] Task 6: Implement Axios API Integrations & Route Handlers
* **Files Affected**: `server.js`
* **Explanation**: Loop through each unprocessed message, query Amer's registration checker endpoint, parse the command via regex, and hit the corresponding API route.
* **API Routing Mappings**:
  1. **User Registration Status Check**:
     `POST ${WORKER_URL}/api/members/check` (Send `{ phone_number }`)
  2. **Search command (`search [bike]`)**:
     `POST ${WORKER_URL}/api/search`
  3. **Help command (`bikeshare help`)**:
     `POST ${WORKER_URL}/api/help`
  4. **How command (`how`)**:
     `POST ${WORKER_URL}/api/how`
  5. **Search All command (`search all`)**:
     `POST ${WORKER_URL}/api/search-all`
  6. **Locations command (`locations`)**:
     `POST ${WORKER_URL}/api/locations`
  7. **Usage command (`usage [bike]`)**:
     `POST ${WORKER_URL}/api/usage` (Expects an array of replies. Send each reply sequentially using `sendReply` loop).
  8. **Borrowing command (`[bike] [from] to [to]`)**:
     `POST ${WORKER_URL}/api/borrow` (Check registration first. If response contains `{ invalidBicycle: true }`, execute `/api/invalid-command` fallback instead).
  9. **Fallback command handlers**:
     Call `/api/invalid-command` or `/api/non-registered` when commands or users don't check out.
* **Error handling strategy**: Wrap your Axios calls in `try/catch`. If Amer's server is down, print the error but **do not** mark the message as processed in the database. This allows it to safely retry when the Worker API is restarted.

---

## [ ] Task 7: Run End-to-End Tests
* **What to do**:
  1. Insert a test row into your local `inbox` table:
     ```sql
     INSERT INTO inbox (SenderNumber, TextDecoded, Processed) VALUES ('09171234567', 'search all', 'false');
     ```
  2. Start Amer's server on port `3001`.
  3. Start the gateway server: `node server.js`.
  4. Verify that the command is successfully parsed, sent to port `3001`, Gammu is spawned, and the row in `inbox` becomes `Processed = 'true'`.
