Master Team Plan: UPBS Dashboard Integration & Honesty Policy

This plan divides the implementation tasks between the two developers to prevent code conflicts and play to each developer's strengths.

Current Priority: Complete the Dashboard Integration first. The Honesty Policy update will be tackled afterward.

Developer A (Amer - Worker API, DB & Security Lead) - Focuses on core configurations, heavy database logic, security middleware, and background timers.

Developer B (Jhirick - Gateway & API Endpoints Lead) - Focuses on Express routing, Gateway parsing, and building CRUD endpoint controllers.

PART 1: Dashboard Integration & Security (CURRENT PRIORITY)

Context: The Dashboard requires serving static frontend files from the API, securing admin routes, and exposing safe data to the public.

🛑 PREREQUISITE: Security Agreements

Admin Credentials: We will use admin and upbsadmin2026 as the default credentials in the .env file.

Combination Locks: The GET /api/bicycles endpoint must explicitly EXCLUDE the combination_lock column to prevent people from using "Inspect Element" to steal bike codes.

👨‍💻 Developer A (Amer): Server Config, Security, & Analytics

[x] Step 1: Environment Configuration (.env)

Edit worker-api/package.json to install dotenv.

Create worker-api/.env.example with DB credentials and ADMIN_USERNAME=admin / ADMIN_PASSWORD=upbsadmin2026.

[x] Step 2: Serve the Frontend (server.js)

Update worker-api/server.js to serve the ../dashboard folder using express.static. This makes the UI accessible at http://localhost:3001/ without CORS issues.

[x] Step 3: Authentication Middleware (authMiddleware.js)

Create worker-api/middleware/authMiddleware.js.

Check for Authorization: Bearer <token>. If it equals 'admin-logged-in-token', allow access. Otherwise, return 401 Unauthorized.

[x] Step 4: Build Analytics Controller (analyticsController.js)

Implement GET /api/analytics.

Write the complex SQL grouping queries to calculate peakHours and popularStations from the bicycle_history table.

👨‍💻 Developer B (Jhirick): API Routing & CRUD Controllers

[x] Step 1: Register New Routes (api.js)

Update worker-api/routes/api.js to include the new Dashboard endpoints.

Crucial: Import Dev A's authMiddleware and apply it to all /api/admin/* routes to secure them.

[x] Step 2: Build Admin Operations (adminController.js)

Implement POST /api/admin/login (check username/password against process.env and return the token).

Implement CRUD endpoints: GET / POST /api/admin/members, POST /api/admin/bicycles, POST /api/admin/locations, and POST /api/admin/locations/toggle.

[x] Step 3: Build Safe Public Getters (bikeController.js)

Implement GET /api/bicycles. Security Check: Query only bicycle_code and new_location (DO NOT select combination_lock).

Implement GET /api/locations (fetch locations and their is_disabled status).

Implement GET /api/history/:bicycleCode to feed the dashboard's history table.

🚀 Final Verification (Dashboard)

Public Test: Run curl http://localhost:3001/api/bicycles and verify combination locks are completely hidden.

Security Test: Try to fetch http://localhost:3001/api/admin/members without logging in. It must fail (401).

UI Test: Open http://localhost:3001/ in the browser, log in via the settings gear icon, and verify the history and charts populate correctly.