# Developer B: Gateway Server Implementation Plan (`/gateway-server`)

**Owner**: Jhirick (Developer B)
**Role**: Gateway Server Development (The front desk / top box)

This document contains instructions for rewriting the monolithic `server.js` into a minimized SMS gateway that polls the inbox, forwards queries to the Worker API, and triggers SMS sending.

---

## 1. Database Connection (`/gateway-server/db.js`)
Maintain a simple connection pool using `mysql2/promise` pointing *only* to the Gammu `smsd` inbox database.
- The Gateway Server should not connect to the `upbs` main database.

---

## 2. Server Loop (`/gateway-server/server.js`)
The server's job is minimized to polling, parsing commands, sending HTTP requests to Amer's Worker API, and calling Gammu.

### Implementation Steps

#### Step 2.1: SMS Polling
- Implement an interval query (every 200ms) executing:
  `SELECT * FROM inbox WHERE Processed='false'` on `smsdPool`.

#### Step 2.2: Input Normalization & Routing
- Normalize the input message string (`trim().toLowerCase()`).
- Check user registration status via Axios:
  `POST http://localhost:3001/api/members/check` with `{ phone_number }`.
- Route matched patterns to Worker API endpoints:
  - **Search**: `/search`
  - **Help**: `/help`
  - **How**: `/how`
  - **Search All**: `/search-all`
  - **Locations**: `/locations`
  - **Usage**: `/usage`
  - **Borrowing**: `/borrow` (Requires registration check first. If Worker API responds with `{ invalidBicycle: true }`, fall back to `/invalid-command`).
  - **Invalid/Non-registered**: `/invalid-command` or `/non-registered`.

#### Step 2.3: SMS Delivery & Process Updates
- Keep the `sendReply` function using `child_process.spawn('gammu-smsd-inject', ...)` to send SMS replies.
- When `gammu` successfully sends the SMS, update the database inbox row to mark it processed (`Processed = 'true'`).
- Handle Axios request errors so that if the Worker API is temporarily down, the message is NOT marked as processed. This allows the Gateway to safely retry when the Worker API comes back online.
