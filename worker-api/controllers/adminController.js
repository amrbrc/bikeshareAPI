const jwt = require('jsonwebtoken');
const db = require('../db');

// POST /api/admin/login
const login = async (req, res) => {
    const { username, password } = req.body;

    const envUsername = process.env.ADMIN_USERNAME || 'admin';
    const envPassword = process.env.ADMIN_PASSWORD || 'upbsadmin2026';

    if (username === envUsername && password === envPassword) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'upbs-super-secret-key-2026', { expiresIn: '24h' });
        return res.json({ success: true, token });
    } else {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
};

// GET /api/admin/members
const getMembers = async (req, res) => {
    try {
        const [rows] = await db.upbsPool.query('SELECT firstname, lastname, phone_number, trust_points, points_frozen FROM members WHERE (is_active = 1 OR is_active IS NULL) ORDER BY lastname ASC, firstname ASC');
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error in getMembers controller:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching members list' });
    }
};

// POST /api/admin/members
const addMember = async (req, res) => {
    const { firstname, lastname, phone_number } = req.body;

    if (!firstname || !lastname || !phone_number) {
        return res.status(400).json({ success: false, error: 'firstname, lastname, and phone_number are required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM members WHERE phone_number = ?', [phone_number]);
        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

        if (existing.length > 0) {
            const member = existing[0];
            if (member.is_active === 0 || member.is_active === false) {
                await db.upbsPool.query(
                    'UPDATE members SET firstname = ?, lastname = ?, is_active = 1, trust_points = 100, points_frozen = 0 WHERE phone_number = ?',
                    [firstname, lastname, phone_number]
                );

                return res.json({ success: true, message: 'User account re-activated and updated successfully!' });
            }
            return res.status(400).json({ success: false, error: 'Phone number already registered' });
        }

        await db.upbsPool.query(
            'INSERT INTO members (firstname, lastname, phone_number) VALUES (?, ?, ?)',
            [firstname, lastname, phone_number]
        );

        try {
            await fetch(`${gatewayUrl}/api/sms/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                body: JSON.stringify({
                    phoneNumber: phone_number,
                    message: `Welcome to UP Bike Share! You are now registered and can start borrowing bikes.`
                })
            });
        } catch (e) {}

        return res.json({ success: true, message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error in addMember controller:', err);
        return res.status(500).json({ success: false, error: 'Database error registering user' });
    }
};

// POST /api/admin/bicycles
const addBicycle = async (req, res) => {
    const { bicycle_code, combination_lock, initial_location } = req.body;

    if (!bicycle_code || !combination_lock || !initial_location) {
        return res.status(400).json({ success: false, error: 'bicycle_code, combination_lock, and initial_location are required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM bicycle_codes WHERE bicycle_code = ?', [bicycle_code]);
        if (existing.length > 0) {
            const bike = existing[0];
            if (bike.is_active === 0 || bike.is_active === false) {
                await db.upbsPool.query(
                    'UPDATE bicycle_codes SET combination_lock = ?, previous_location = ?, new_location = ?, is_active = 1, condition_status = "Good", is_disabled = 0 WHERE bicycle_code = ?',
                    [combination_lock, initial_location, initial_location, bicycle_code]
                );
                return res.json({ success: true, message: 'Bicycle re-activated and updated successfully!' });
            }
            return res.status(400).json({ success: false, error: 'Bicycle code already exists' });
        }

        await db.upbsPool.query(
            'INSERT INTO bicycle_codes (bicycle_code, combination_lock, previous_location, new_location) VALUES (?, ?, ?, ?)',
            [bicycle_code, combination_lock, initial_location, initial_location]
        );

        return res.json({ success: true, message: 'Bicycle successfully added!' });
    } catch (err) {
        console.error('Error in addBicycle controller:', err);
        return res.status(500).json({ success: false, error: 'Database error adding bicycle' });
    }
};

// POST /api/admin/locations
const addLocation = async (req, res) => {
    const { location_name, latitude, longitude } = req.body;

    if (!location_name || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, error: 'location_name, latitude, and longitude are required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM locations WHERE location_name = ?', [location_name]);
        if (existing.length > 0) {
            const loc = existing[0];
            if (loc.is_active === 0 || loc.is_active === false) {
                await db.upbsPool.query(
                    'UPDATE locations SET is_active = 1, is_disabled = 0, latitude = ?, longitude = ? WHERE location_name = ?',
                    [latitude, longitude, location_name]
                );
                return res.json({ success: true, message: 'Station re-activated successfully!' });
            }
            return res.status(400).json({ success: false, error: 'Location name already exists' });
        }

        await db.upbsPool.query(
            'INSERT INTO locations (location_name, is_active, is_disabled, latitude, longitude) VALUES (?, 1, 0, ?, ?)',
            [location_name, latitude, longitude]
        );

        return res.json({ success: true, message: 'Station successfully added!' });
    } catch (err) {
        console.error('Error in addLocation controller:', err);
        return res.status(500).json({ success: false, error: 'Database error adding location' });
    }
};

// POST /api/admin/locations/toggle
const toggleLocation = async (req, res) => {
    const { location_name, is_disabled } = req.body;

    if (!location_name || is_disabled === undefined) {
        return res.status(400).json({ success: false, error: 'location_name and is_disabled are required' });
    }

    try {
        const val = is_disabled ? 1 : 0;
        const [result] = await db.upbsPool.query(
            'UPDATE locations SET is_disabled = ? WHERE location_name = ?',
            [val, location_name]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Error in toggleLocation controller:', err);
        return res.status(500).json({ success: false, error: 'Database error toggling location status' });
    }
};

// POST /api/admin/resolve-dispute
const resolveDispute = async (req, res) => {
    const { phone_number, verdict, bicycle_code } = req.body;

    if (!phone_number || !verdict || !bicycle_code) {
        return res.status(400).json({ success: false, error: 'phone_number, verdict, and bicycle_code are required' });
    }

    try {
        // Retrieve the dispute_reported_by phone number from bicycle_codes
        const [bike] = await db.upbsPool.query("SELECT dispute_reported_by, condition_status FROM bicycle_codes WHERE bicycle_code = ?", [bicycle_code]);
        const reporterPhone = bike.length > 0 ? bike[0].dispute_reported_by : null;
        const conditionStatus = bike.length > 0 ? bike[0].condition_status : 'Broken';

        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';

        // Retrieve reporter's actual name if available
        let reporterLastName = 'System';
        let reporterFirstName = 'Dispute Resolution';
        if (reporterPhone) {
            const [reporterRows] = await db.upbsPool.query("SELECT firstname, lastname FROM members WHERE phone_number = ?", [reporterPhone]);
            if (reporterRows.length > 0) {
                reporterLastName = reporterRows[0].lastname;
                reporterFirstName = reporterRows[0].firstname;
            }
        }

        if (verdict === 'guilty') {
            if (conditionStatus === 'Missing') {
                await db.upbsPool.query("UPDATE members SET points_frozen = 0, trust_points = GREATEST(0, CAST(trust_points AS SIGNED) - 50) WHERE phone_number = ?", [phone_number]);
                await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Missing', dispute_reported_by = NULL WHERE bicycle_code = ?", [bicycle_code]);
            } else {
                await db.upbsPool.query("UPDATE members SET points_frozen = 0, trust_points = GREATEST(0, CAST(trust_points AS SIGNED) - 15) WHERE phone_number = ?", [phone_number]);
                await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Broken', dispute_reported_by = NULL, broken_reported_at = NOW(), penalty_applied = 0 WHERE bicycle_code = ?", [bicycle_code]);
            }

            // Text the borrower that they are guilty
            try {
                const deduction = conditionStatus === 'Missing' ? 50 : 15;
                const offense = conditionStatus === 'Missing' ? 'losing' : 'damaging';
                const repairWarning = conditionStatus === 'Missing' ? '' : ' You have 48 hours to repair it before an additional 10-point penalty is applied.';
                await fetch(`${gatewayUrl}/api/sms/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                    body: JSON.stringify({
                        phoneNumber: phone_number,
                        message: `You have been proven guilty of ${offense} a bike. ${deduction} points were deducted from your trust points.${repairWarning}`
                    })
                });
            } catch (e) {
                console.error("Failed to send guilty SMS reply:", e.message);
            }

            // Reward and text the reporter
            if (reporterPhone) {
                // Reward the reporter with +5 points (ceiling 120)
                await db.upbsPool.query("UPDATE members SET trust_points = LEAST(120, CAST(trust_points AS SIGNED) + 5) WHERE phone_number = ?", [reporterPhone]);

                // Log the reward
                await db.upbsPool.query(
                    "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                    [reporterLastName, reporterFirstName, reporterPhone, reporterPhone, 'Conflict Report Reward']
                );

                try {
                    await fetch(`${gatewayUrl}/api/sms/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                        body: JSON.stringify({
                            phoneNumber: reporterPhone,
                            message: `The dispute you reported has been resolved. The previous user was penalized. You have earned +5 trust points. Thank you for keeping our bikes safe!`
                        })
                    });
                } catch (e) {
                    console.error("Failed to send guilty SMS to reporter:", e.message);
                }
            }

        } else if (verdict === 'innocent') {
            await db.upbsPool.query("UPDATE members SET points_frozen = 0 WHERE phone_number = ?", [phone_number]);
            await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Good', dispute_reported_by = NULL WHERE bicycle_code = ?", [bicycle_code]);

            // Text the borrower that they are innocent
            try {
                await fetch(`${gatewayUrl}/api/sms/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                    body: JSON.stringify({
                        phoneNumber: phone_number,
                        message: `The dispute has been resolved in your favor (Innocent). No trust points were deducted from your account.`
                    })
                });
            } catch (e) {
                console.error("Failed to send innocent SMS reply:", e.message);
            }

            if (reporterPhone) {
                // Penalize the false reporter with a -5 points demerit
                await db.upbsPool.query("UPDATE members SET trust_points = GREATEST(0, CAST(trust_points AS SIGNED) - 5) WHERE phone_number = ?", [reporterPhone]);

                // Log the false report penalty
                await db.upbsPool.query(
                    "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                    [reporterLastName, reporterFirstName, reporterPhone, reporterPhone, 'False Report Penalty']
                );

                // Text the false reporter about their points deduction
                try {
                    await fetch(`${gatewayUrl}/api/sms/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                        body: JSON.stringify({
                            phoneNumber: reporterPhone,
                            message: `Your recent missing or damage report was found to be false. A 5-point penalty has been applied to your trust points.`
                        })
                    });
                } catch (e) {
                    console.error("Failed to send false report SMS reply:", e.message);
                }
            }
        } else if (verdict === 'neutral') {
            await db.upbsPool.query("UPDATE members SET points_frozen = 0 WHERE phone_number = ?", [phone_number]);
            
            if (conditionStatus === 'Missing') {
                await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Good', dispute_reported_by = NULL WHERE bicycle_code = ?", [bicycle_code]);
            } else {
                await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Broken', dispute_reported_by = NULL, broken_reported_at = NOW(), penalty_applied = 0 WHERE bicycle_code = ?", [bicycle_code]);
            }
            
            // Text the borrower
            try {
                const neutralMsg = conditionStatus === 'Missing' ? 
                    `The dispute has been resolved neutrally. The missing bike was found, and no points were deducted from your account.` :
                    `The dispute has been resolved neutrally (external damage). The bike is broken, but no points were deducted from your account.`;
                
                await fetch(`${gatewayUrl}/api/sms/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                    body: JSON.stringify({
                        phoneNumber: phone_number,
                        message: neutralMsg
                    })
                });
            } catch (e) {
                console.error("Failed to send neutral SMS to borrower:", e.message);
            }

            // Text the reporter
            if (reporterPhone) {
                // Reward the reporter with +5 points for correctly identifying a broken bike (ceiling 120)
                await db.upbsPool.query("UPDATE members SET trust_points = LEAST(120, CAST(trust_points AS SIGNED) + 5) WHERE phone_number = ?", [reporterPhone]);

                // Log the reward
                await db.upbsPool.query(
                    "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                    [reporterLastName, reporterFirstName, reporterPhone, reporterPhone, 'Neutral Report Reward']
                );

                try {
                    await fetch(`${gatewayUrl}/api/sms/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026' },
                        body: JSON.stringify({
                            phoneNumber: reporterPhone,
                            message: `The dispute you reported has been resolved neutrally (external damage). You have earned +5 trust points for accurately reporting the broken bike. Thank you!`
                        })
                    });
                } catch (e) {
                    console.error("Failed to send neutral SMS to reporter:", e.message);
                }
            }
        }
        return res.json({ success: true, message: `Dispute resolved as ${verdict}.` });
    } catch (err) {
        console.error('Error resolving dispute:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

// GET /api/admin/search/bicycles
const searchBicycles = async (req, res) => {
    const query = req.query.q || '';
    try {
        let sql = "SELECT * FROM bicycle_codes WHERE (is_active = 1 OR is_active IS NULL)";
        let params = [];
        if (query.trim() !== '') {
            sql += " AND bicycle_code LIKE ?";
            params.push(`%${query.trim()}%`);
        }
        sql += " LIMIT 50";
        const [rows] = await db.upbsPool.query(sql, params);
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

// GET /api/admin/search/members
const searchMembers = async (req, res) => {
    const query = req.query.q || '';
    try {
        const [rows] = await db.upbsPool.query(
            "SELECT firstname, lastname, phone_number, trust_points, points_frozen FROM members WHERE (phone_number LIKE ? OR firstname LIKE ? OR lastname LIKE ?) AND (is_active = 1 OR is_active IS NULL) LIMIT 50",
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

const overrideBicycle = async (req, res) => {
    const { bicycle_code, combination_lock, condition_status } = req.body;

    if (!combination_lock && !condition_status) {
        return res.status(400).json({ success: false, error: 'At least one field (combination_lock or condition_status) is required' });
    }

    try {
        let updateQuery = "UPDATE bicycle_codes SET ";
        let params = [];
        if (combination_lock) { updateQuery += "combination_lock = ?, "; params.push(combination_lock); }
        if (condition_status) { updateQuery += "condition_status = ?, "; params.push(condition_status); }
        updateQuery = updateQuery.slice(0, -2) + " WHERE bicycle_code = ? AND (is_active = 1 OR is_active IS NULL)";
        params.push(bicycle_code);

        await db.upbsPool.query(updateQuery, params);
        return res.json({ success: true, message: 'Bicycle successfully updated.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

// GET /api/admin/maintenance
const getMaintenanceQueue = async (req, res) => {
    try {
        const query = `
            SELECT b.bicycle_code, b.new_location, b.condition_status,
                   (SELECT m.phone_number 
                    FROM bicycle_history bh 
                    JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by 
                    WHERE bh.bicycle_code = b.bicycle_code 
                    ORDER BY bh.borrowed_at DESC 
                    LIMIT 1) AS last_user_phone
            FROM bicycle_codes b
            WHERE b.condition_status IN ('Broken', 'Missing', 'Disputed') 
              AND (b.is_active = 1 OR b.is_active IS NULL)
        `;
        const [rows] = await db.upbsPool.query(query);
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

// GET /api/admin/honesty
const getHonestyLogs = async (req, res) => {
    try {
        const query = `
            SELECT FirstName, LastName, MobileNumber, SenderNumber, DateTime, Request, MessageID
            FROM Logs
            WHERE Request IN ('Broken Report', 'Fixed Report', 'Missing Report', 'False Report Penalty')
            ORDER BY DateTime DESC
            LIMIT 100
        `;
        const [rows] = await db.upbsPool.query(query);
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

// GET /api/admin/search-bike
const searchBike = async (req, res) => {
    const { bicycleCode } = req.query;
    if (!bicycleCode) {
        return res.status(400).json({ success: false, error: 'bicycleCode query parameter is required' });
    }

    try {
        // 1. Get the bicycle details (filtering for active ones)
        const [bikes] = await db.upbsPool.query(
            "SELECT bicycle_code, combination_lock, condition_status FROM bicycle_codes WHERE bicycle_code = ? AND (is_active = 1 OR is_active IS NULL)",
            [bicycleCode]
        );

        if (bikes.length === 0) {
            return res.status(404).json({ success: false, error: 'Bicycle not found or is inactive' });
        }

        const bike = bikes[0];

        // 2. Get the last 10 trips in history for this bike
        const [history] = await db.upbsPool.query(
            "SELECT id, previous_location, new_location, borrowed_by, borrowed_at, done_text_received, condition_confirmed, pending_status_time FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC LIMIT 10",
            [bicycleCode]
        );

        // 3. Determine if there is a running active borrow on the bike (done_text_received = 0)
        let activeBorrow = null;
        if (history.length > 0 && history[0].done_text_received === 0) {
            activeBorrow = {
                borrowed_by: history[0].borrowed_by,
                borrowed_at: history[0].borrowed_at
            };
        }

        return res.json({
            success: true,
            data: {
                bicycle_code: bike.bicycle_code,
                combination_lock: bike.combination_lock,
                condition_status: bike.condition_status,
                active_borrow: activeBorrow,
                history: history
            }
        });
    } catch (err) {
        console.error('Error in searchBike controller:', err);
        return res.status(500).json({ success: false, error: 'Database error searching bicycle' });
    }
};

// GET /api/admin/search-member
const searchMember = async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ success: false, error: 'query parameter is required' });
    }

    try {
        const sql = `
            SELECT firstname, lastname, phone_number, trust_points, points_frozen 
            FROM members 
            WHERE (phone_number LIKE ? OR lastname LIKE ?) AND (is_active = 1 OR is_active IS NULL)
            LIMIT 20
        `;
        const wildcard = `%${query}%`;
        const [rows] = await db.upbsPool.query(sql, [wildcard, wildcard]);

        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error in searchMember controller:', err);
        return res.status(500).json({ success: false, error: 'Database error searching members' });
    }
};

// POST /api/admin/override-points
const overridePoints = async (req, res) => {
    const { phone_number, trust_points } = req.body;
    if (!phone_number || trust_points === undefined) {
        return res.status(400).json({ success: false, error: 'phone_number and trust_points are required' });
    }

    try {
        let clampedPoints = Math.max(0, Math.min(120, Number(trust_points)));
        const [result] = await db.upbsPool.query(
            "UPDATE members SET trust_points = ? WHERE phone_number = ? AND (is_active = 1 OR is_active IS NULL)",
            [clampedPoints, phone_number]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Member not found or is inactive' });
        }

        return res.json({ success: true, message: 'Trust points updated successfully!' });
    } catch (err) {
        console.error('Error in overridePoints controller:', err);
        return res.status(500).json({ success: false, error: 'Database error overriding points' });
    }
};

// POST /api/admin/override-bike
const overrideBike = async (req, res) => {
    const { bicycle_code, combination_lock, condition_status } = req.body;
    if (!bicycle_code || !combination_lock || !condition_status) {
        return res.status(400).json({ success: false, error: 'bicycle_code, combination_lock, and condition_status are required' });
    }

    try {
        const [result] = await db.upbsPool.query(
            "UPDATE bicycle_codes SET combination_lock = ?, condition_status = ? WHERE bicycle_code = ? AND (is_active = 1 OR is_active IS NULL)",
            [combination_lock, condition_status, bicycle_code]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Bicycle not found or is inactive' });
        }

        return res.json({ success: true, message: 'Bicycle override settings applied!' });
    } catch (err) {
        console.error('Error in overrideBike controller:', err);
        return res.status(500).json({ success: false, error: 'Database error overriding bicycle settings' });
    }
};

// POST /api/admin/delete-member
const deleteMember = async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number) {
        return res.status(400).json({ success: false, error: 'phone_number is required' });
    }

    try {
        const [result] = await db.upbsPool.query(
            "UPDATE members SET is_active = 0 WHERE phone_number = ?",
            [phone_number]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Member not found' });
        }

        return res.json({ success: true, message: 'Member successfully deactivated (soft-deleted)!' });
    } catch (err) {
        console.error('Error in deleteMember controller:', err);
        return res.status(500).json({ success: false, error: 'Database error deleting member' });
    }
};

// POST /api/admin/delete-bike
const deleteBike = async (req, res) => {
    const { bicycle_code } = req.body;
    if (!bicycle_code) {
        return res.status(400).json({ success: false, error: 'bicycle_code is required' });
    }

    try {
        const [result] = await db.upbsPool.query(
            "UPDATE bicycle_codes SET is_active = 0 WHERE bicycle_code = ?",
            [bicycle_code]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Bicycle not found' });
        }

        return res.json({ success: true, message: 'Bicycle successfully deactivated (soft-deleted)!' });
    } catch (err) {
        console.error('Error in deleteBike controller:', err);
        return res.status(500).json({ success: false, error: 'Database error deleting bicycle' });
    }
};

// POST /api/admin/delete-location (Also handles DELETE /api/admin/locations/:name)
const deleteLocation = async (req, res) => {
    const location_name = req.body.location_name || req.params.name;
    if (!location_name) {
        return res.status(400).json({ success: false, error: 'location_name is required' });
    }

    try {
        const [result] = await db.upbsPool.query(
            "UPDATE locations SET is_active = 0 WHERE location_name = ?",
            [location_name]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Location/Station not found' });
        }

        return res.json({ success: true, message: 'Location/Station successfully deactivated (soft-deleted)!' });
    } catch (err) {
        console.error('Error in deleteLocation controller:', err);
        return res.status(500).json({ success: false, error: 'Database error deleting location' });
    }
};

// GET /api/admin/reports
const getReports = async (req, res) => {
    try {
        // 1. Maintenance Queue: active bikes in Broken, Missing, or Disputed condition
        const queueQuery = `
            SELECT b.bicycle_code, b.new_location, b.condition_status,
                   (SELECT m.phone_number 
                    FROM bicycle_history bh 
                    JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by 
                    WHERE bh.bicycle_code = b.bicycle_code 
                    ORDER BY bh.borrowed_at DESC 
                    LIMIT 1) AS last_user_phone
            FROM bicycle_codes b
            WHERE b.condition_status IN ('Broken', 'Missing', 'Disputed') AND b.is_active = 1
        `;
        const [maintenanceQueue] = await db.upbsPool.query(queueQuery);

        // 2. Honesty Logs: entries in Logs table where Request matches reports
        const logsQuery = `
            SELECT LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID
            FROM Logs
            WHERE Request IN ('Broken Report', 'Fixed Report', 'Missing Report')
            ORDER BY DateTime DESC
            LIMIT 100
        `;
        const [honestyLogs] = await db.upbsPool.query(logsQuery);

        return res.json({
            success: true,
            data: {
                maintenanceQueue,
                honestyLogs
            }
        });
    } catch (err) {
        console.error('Error in getReports controller:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching reports' });
    }
};
// POST /api/admin/bicycles/toggle
const toggleBike = async (req, res) => {
    const { bicycle_code, is_disabled } = req.body;

    if (!bicycle_code || is_disabled === undefined) {
        return res.status(400).json({ success: false, error: 'bicycle_code and is_disabled are required' });
    }

    try {
        const val = is_disabled ? 1 : 0;
        const [result] = await db.upbsPool.query(
            'UPDATE bicycle_codes SET is_disabled = ? WHERE bicycle_code = ?',
            [val, bicycle_code]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Bicycle not found' });
        }

        return res.json({ success: true, message: `Bicycle successfully ${val ? 'disabled' : 'enabled'}.` });
    } catch (err) {
        console.error('Error in toggleBike controller:', err);
        return res.status(500).json({ success: false, error: 'Database error toggling bicycle status' });
    }
};

module.exports = {
    login,
    toggleBike,
    getMembers,
    addMember,
    addBicycle,
    addLocation,
    toggleLocation,
    resolveDispute,
    searchBike,
    searchMember,
    overridePoints,
    overrideBike,
    deleteMember,
    deleteBike,
    deleteLocation,
    getReports,
    searchBicycles,
    searchMembers,
    overrideBicycle,
    getMaintenanceQueue,
    getHonestyLogs
};
