# Developer A: Worker API Implementation Plan (`/worker-api`)

**Owner**: Amer (Developer A)
**Role**: Worker API Development (The bottom box)

This document contains the step-by-step specifications for extracting the database-heavy and transaction-heavy business logic of the monolith into a brand-new Express.js API server running on port `3001`.

---

## 1. Database Connection (`/worker-api/db.js`)
Initialize a connection pool using `mysql2/promise` pointing to the main UP Bike Share database (`upbs`).
- Environment variables or placeholders for DB config (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME_UPBS`).

---

## 2. API Server (`/worker-api/server.js`)
Create an Express.js app listening on port `3001`. The server must expose RESTful endpoints that map directly to the core monolithic functions.

### Endpoints Specification

#### `POST /api/members/check`
Check if a phone number is registered.
- **Request Body**: `{ "phone_number": "0917XXXXXXX" }`
- **Response**: `{ "registered": true, "user": { ... } }` or `{ "registered": false, "user": null }`

#### `POST /api/search`
Query current location of a bicycle code.
- **Request Body**: `{ "smsSender": "...", "bicycleCode": "...", "messageId": 123 }`
- **Response**: `{ "reply": "At the moment, the current location of <bike> is at <location>." }`
- **Action**: Queries `members`, queries `bicycle_codes`, and inserts logs into the `Logs` table.

#### `POST /api/help`
Provide list of available commands.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Commands: 1. bike code <from> to <destination> | 2. locations..." }`
- **Action**: Verifies member, logs request, returns instructions text.

#### `POST /api/how`
Provide borrowing instructions.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Use the format: <bicycle_code> <previous_location> to <new_location>..." }`
- **Action**: Verifies member, logs request, returns instructions text.

#### `POST /api/search-all`
Retrieve location of all bikes.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "All Bicycles Locations:\n..." }`
- **Action**: Fetches all locations, logs request, returns structured text.

#### `POST /api/locations`
List all active stations/locations.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Available locations: eee, vinzons..." }`
- **Action**: Verifies member, fetches locations from database, logs request.

#### `POST /api/usage`
Retrieve the latest usage entry for a bike.
- **Request Body**: `{ "smsSender": "...", "bicycleCode": "...", "messageId": 123 }`
- **Response**: `{ "replies": [ "Part 1 of history...", "Part 2 of history..." ] }`
- **Action**: Validates member & bike, queries `bicycle_history`, formats and splits strings exceeding 160 characters, logs the request.

#### `POST /api/borrow`
Process a bicycle borrowing request in an atomic transaction.
- **Request Body**: `{ "smsSender": "...", "bicycleCode": "...", "fromLocation": "...", "toLocation": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Hi <Name>! The lock code for bicycle <id> is 1234..." }` or `{ "invalidBicycle": true }` if code not found.
- **Action**: Starts a database transaction (`upbsConn.beginTransaction()`), updates bicycle coordinates in `bicycle_codes`, inserts records into `bicycle_history`, inserts logs into `Logs`, and commits. Rollbacks on errors.

#### `POST /api/invalid-command`
Log and respond to an unrecognized command.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Invalid Command..." }`
- **Action**: Checks/inserts to `invalid_command_senders`, logs query request, returns reply.

#### `POST /api/non-registered`
Log and respond to a non-registered user attempt.
- **Request Body**: `{ "smsSender": "...", "messageId": 123 }`
- **Response**: `{ "reply": "Sorry, you are not registered..." }`
- **Action**: Checks/inserts to `non_registered_senders`, logs request, returns reply.
