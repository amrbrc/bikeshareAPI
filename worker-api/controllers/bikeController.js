const db = require('../db');

// POST /api/search
const search = async (req, res) => {
    const { smsSender, bicycleCode, messageId } = req.body;

    if (!smsSender || !bicycleCode || !messageId) {
        return res.status(400).json({ error: 'smsSender, bicycleCode, and messageId are required' });
    }

    try {
        // 1. Retrieve member information (must be active)
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Check if the query is a location/building name instead of a bike code
        const [locationRows] = await db.upbsPool.query(
            "SELECT location_name FROM locations WHERE location_name = ? AND is_active = 1",
            [bicycleCode]
        );

        let replyMessage = "";

        if (locationRows.length > 0) {
            // It is a building search! Fetch all active and enabled bikes at this location
            const [bikes] = await db.upbsPool.query(
                "SELECT bicycle_code, condition_status FROM bicycle_codes WHERE new_location = ? AND is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL)",
                [bicycleCode]
            );

            if (bikes.length === 0) {
                replyMessage = `There are no bicycles available at ${bicycleCode.toUpperCase()} at the moment.`;
            } else {
                const list = bikes.map(b => `${b.bicycle_code} (${b.condition_status})`).join(', ');
                replyMessage = `Bicycles currently at ${bicycleCode.toUpperCase()}: ${list}.`;
            }

            // Log search building request
            const logQuery = `
                INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
                VALUES (?, ?, ?, ?, NOW(), ?, ?)
            `;
            await db.upbsPool.query(logQuery, [
                lastname,
                firstname,
                phone_number,
                smsSender,
                'Search Bldg Request',
                messageId
            ]);
        } else {
            // It is a bike code search! Retrieve the location of the bicycle
            const locationQuery = `
                SELECT new_location
                FROM bicycle_codes
                WHERE bicycle_code = ? AND is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL)
            `;
            const [locationRecords] = await db.upbsPool.query(locationQuery, [bicycleCode]);

            if (locationRecords.length === 0) {
                replyMessage = `Bicycle or station code "${bicycleCode}" not found.`;
            } else {
                const newLocation = locationRecords[0].new_location;
                replyMessage = `At the moment, the current location of ${bicycleCode} is at ${newLocation}.`;
            }

            // Log the search request
            const logQuery = `
                INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
                VALUES (?, ?, ?, ?, NOW(), ?, ?)
            `;
            await db.upbsPool.query(logQuery, [
                lastname,
                firstname,
                phone_number,
                smsSender,
                'Search Request',
                messageId
            ]);
        }

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in search controller:', err);
        res.status(500).json({ error: 'Database error processing search request' });
    }
};

// POST /api/search-all
const searchAll = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
    }

    try {
        // 1. Check if the sender is a registered member (for logging purposes)
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        let userLogInfo = { lastname: null, firstname: null, phone_number: null };
        if (memberRecords.length > 0) {
            userLogInfo = memberRecords[0];
        }

        // 2. Query to fetch bicycle locations
        const bicycleQuery = "SELECT bicycle_code, new_location, previous_location FROM bicycle_codes WHERE is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL)";
        const [bicycles] = await db.upbsPool.query(bicycleQuery);

        let replyMessage = "";
        if (bicycles.length === 0) {
            replyMessage = "No bicycles available at the moment.";
        } else {
            const locationList = bicycles.map(bike => {
                const location = bike.new_location || bike.previous_location;
                return `Bike ${bike.bicycle_code} is at ${location}`;
            }).join('\n');
            replyMessage = `All Bicycles Locations:\n${locationList}`;
        }

        // 3. Log the search-all request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await db.upbsPool.query(logQuery, [
            userLogInfo.lastname,
            userLogInfo.firstname,
            userLogInfo.phone_number,
            smsSender,
            'Search All',
            messageId
        ]);

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in searchAll controller:', err);
        res.status(500).json({ error: 'Database error processing search-all request' });
    }
};

// POST /api/locations
const locations = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
    }

    try {
        // 1. Retrieve member information (required)
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Fetch active locations
        const locationQuery = "SELECT location_name FROM locations WHERE is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL)";
        const [locations] = await db.upbsPool.query(locationQuery);

        let replyMessage = "";
        if (locations.length === 0) {
            replyMessage = "No locations available at the moment.";
        } else {
            const locationList = locations.map(loc => loc.location_name).join(', ');
            replyMessage = `Available locations: ${locationList}`;
        }

        // 3. Log the locations request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await db.upbsPool.query(logQuery, [
            lastname,
            firstname,
            phone_number,
            smsSender,
            'Locations',
            messageId
        ]);

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in locations controller:', err);
        res.status(500).json({ error: 'Database error processing locations request' });
    }
};

// POST /api/usage
const usage = async (req, res) => {
    const { smsSender, bicycleCode, messageId } = req.body;

    if (!smsSender || !bicycleCode || !messageId) {
        return res.status(400).json({ error: 'smsSender, bicycleCode, and messageId are required' });
    }

    try {
        // 1. Retrieve member information (required)
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ replies: ['Sorry, you are not registered with UP Bike Share.'] });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Validate Bicycle Code
        const bikeQuery = "SELECT * FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1";
        const [bicycles] = await db.upbsPool.query(bikeQuery, [bicycleCode]);

        if (bicycles.length === 0) {
            return res.json({ replies: [`Invalid bicycle code ${bicycleCode}. Please check and try again.`] });
        }

        // 3. Retrieve bicycle usage history
        const historyQuery = `
            SELECT previous_location, new_location, borrowed_by, borrowed_at
            FROM bicycle_history
            WHERE bicycle_code = ?
            ORDER BY borrowed_at DESC
            LIMIT 1
        `;
        const [historyRecords] = await db.upbsPool.query(historyQuery, [bicycleCode]);

        if (historyRecords.length === 0) {
            return res.json({ replies: [`No usage history found for bicycle code ${bicycleCode}.`] });
        }

        // 4. Format history message and split if it exceeds 160 characters
        let historyMessage = `Usage History for Bicycle ${bicycleCode}:\n`;
        historyRecords.forEach((record, index) => {
            const borrowedAt = new Date(record.borrowed_at).toLocaleString();
            historyMessage += `${index + 1}. From: ${record.previous_location} To: ${record.new_location} | By: ${record.borrowed_by} | At: ${borrowedAt}\n`;
        });

        const replies = [];
        if (historyMessage.length > 160) {
            let currentMessage = '';
            historyRecords.forEach((record, index) => {
                const borrowedAt = new Date(record.borrowed_at).toLocaleString();
                const entry = `${index + 1}. From: ${record.previous_location} To: ${record.new_location} | By: ${record.borrowed_by} | At: ${borrowedAt}\n`;
                if ((currentMessage + entry).length > 160) {
                    replies.push(currentMessage);
                    currentMessage = entry;
                } else {
                    currentMessage += entry;
                }
            });
            if (currentMessage) replies.push(currentMessage);
        } else {
            replies.push(historyMessage);
        }

        // 5. Log the usage request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await db.upbsPool.query(logQuery, [
            lastname,
            firstname,
            phone_number,
            smsSender,
            'Usage Request',
            messageId
        ]);

        return res.json({ replies });

    } catch (err) {
        console.error('Error in usage controller:', err);
        res.status(500).json({ error: 'Database error processing usage request' });
    }
};

// POST /api/borrow
const borrow = async (req, res) => {
    const { smsSender, bicycleCode, fromLocation, toLocation, messageId } = req.body;

    if (!smsSender || !bicycleCode || !fromLocation || !toLocation || !messageId) {
        return res.status(400).json({ error: 'smsSender, bicycleCode, fromLocation, toLocation, and messageId are required' });
    }

    // Acquire a dedicated connection for the transaction
    let upbsConn;
    try {
        upbsConn = await db.upbsPool.getConnection();
    } catch (dbErr) {
        console.error('Failed to acquire database connection:', dbErr);
        return res.status(500).json({ error: 'Database connection failed' });
    }

    try {
        // 4. Start the database transaction (Moved here for concurrency safety)
        await upbsConn.beginTransaction();

        // 1. Retrieve member information (required)
        const memberQuery = `
            SELECT lastname, firstname, phone_number, trust_points, points_frozen
            FROM members
            WHERE phone_number = ? AND is_active = 1
            FOR UPDATE
        `;
        const [memberRecords] = await upbsConn.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            await upbsConn.rollback();
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const user = memberRecords[0];

        // Apply Gatekeeper checks for member trust points and frozen status
        if (user.trust_points < 50) {
            await upbsConn.rollback();
            return res.json({ reply: "Account suspended." });
        }

        if (user.points_frozen == 1 || user.points_frozen === true || user.points_frozen === 'true') {
            await upbsConn.rollback();
            return res.json({ reply: "Account frozen due to dispute." });
        }

        // 2. Validate Bicycle Code
        const bikeQuery = "SELECT * FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL) FOR UPDATE";
        const [bicycles] = await upbsConn.query(bikeQuery, [bicycleCode]);

        if (bicycles.length === 0) {
            await upbsConn.rollback();
            return res.json({ invalidBicycle: true });
        }

        const bicycle = bicycles[0];

        // Apply Gatekeeper check for bicycle condition
        if (bicycle.condition_status !== 'Good') {
            await upbsConn.rollback();
            return res.json({ reply: "Bike unavailable." });
        }

        // Helper function for location validation inside the handler
        const validateLoc = async (loc) => {
            const [rows] = await upbsConn.query("SELECT * FROM locations WHERE location_name = ? AND is_active = 1 AND (is_disabled = 0 OR is_disabled IS NULL)", [loc]);
            return rows.length > 0;
        };

        // 3. Validate 'from' and 'to' locations
        const validFrom = await validateLoc(fromLocation);
        const validTo = await validateLoc(toLocation);

        if (!validFrom || !validTo) {
            await upbsConn.rollback();
            return res.json({ reply: "One or both locations are invalid, offline, or unavailable at the moment." });
        }

        // Update bicycle location and set condition_status to 'Borrowed'
        const updateBicycleQuery = `
            UPDATE bicycle_codes 
            SET previous_location = ?, new_location = ?, condition_status = 'Borrowed' 
            WHERE bicycle_code = ?
        `;
        await upbsConn.query(updateBicycleQuery, [fromLocation, toLocation, bicycleCode]);

        // Insert into bicycle_history
        const insertHistoryQuery = `
            INSERT INTO bicycle_history (bicycle_code, previous_location, new_location, borrowed_by)
            VALUES (?, ?, ?, ?)
        `;
        await upbsConn.query(insertHistoryQuery, [
            bicycleCode,
            fromLocation,
            toLocation,
            `${user.firstname} ${user.lastname}`
        ]);

        // Formulate the combination lock reply
        const replyMessage = `Hi ${user.firstname} ${user.lastname}! The lock code for bicycle ${bicycle.bicycle_code} is ${bicycle.combination_lock}. You may proceed to ${toLocation}. Please don't forget to lock the bike at your destination and confirm it by replying 'DONE ${bicycleCode}' at this number. Have a safe ride!`;

        // Log the borrowing request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await upbsConn.query(logQuery, [
            user.lastname,
            user.firstname,
            user.phone_number,
            smsSender,
            'Borrowing',
            messageId
        ]);

        // Commit transaction
        await upbsConn.commit();

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error during transaction inside borrow controller:', err);
        // Rollback transaction in case of any SQL/database error
        try {
            await upbsConn.rollback();
        } catch (rollbackErr) {
            console.error('Error during transaction rollback:', rollbackErr);
        }
        res.status(500).json({ error: 'Database transaction error processing borrowing request' });
    } finally {
        // Always release connection back to the pool
        if (upbsConn) {
            upbsConn.release();
        }
    }
};

const getBicycles = async (req, res) => {
    try {
        const [rows] = await db.upbsPool.query('SELECT bicycle_code, new_location, previous_location, condition_status, is_disabled FROM bicycle_codes WHERE is_active = 1');
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error in getBicycles:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching bicycles' });
    }
};

const getLocations = async (req, res) => {
    try {
        // Include is_active = 1 AND is_active IS NULL just in case old records were created without the flag
        const [rows] = await db.upbsPool.query('SELECT location_name, is_disabled, latitude, longitude FROM locations WHERE is_active = 1 OR is_active IS NULL');
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error in getLocations:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching locations' });
    }
};

const getHistory = async (req, res) => {
    const { bicycleCode } = req.params;
    try {
        const [rows] = await db.upbsPool.query(
            'SELECT previous_location, new_location, borrowed_by, borrowed_at FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC',
            [bicycleCode]
        );
        return res.json(rows);
    } catch (err) {
        console.error('Error in getHistory:', err);
        return res.status(500).json({ error: 'Database error fetching bicycle history' });
    }
};

const done = async (req, res) => {
    const { smsSender, bicycleCode } = req.body;
    try {
        const [member] = await db.upbsPool.query("SELECT firstname, lastname FROM members WHERE phone_number = ? AND is_active = 1", [smsSender]);
        if (member.length === 0) {
            return res.json({ reply: "Sorry, you must be a registered UP Bike Share member to use this service." });
        }
        const currentUserName = `${member[0].firstname} ${member[0].lastname}`;

        const [bike] = await db.upbsPool.query("SELECT condition_status FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1", [bicycleCode]);
        if (bike.length === 0) {
            return res.json({ reply: `Bike ${bicycleCode} not found.` });
        }

        if (bike[0].condition_status !== 'Borrowed' && bike[0].condition_status !== 'Pending_Status') {
            return res.json({ reply: `Bike ${bicycleCode} is not currently borrowed.` });
        }

        const [history] = await db.upbsPool.query(
            "SELECT id, borrowed_by FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC LIMIT 1",
            [bicycleCode]
        );

        if (history.length === 0 || history[0].borrowed_by !== currentUserName) {
            return res.json({ reply: `You do not have an active borrow for Bike ${bicycleCode}.` });
        }

        await db.upbsPool.query(
            "UPDATE bicycle_history SET done_text_received = 1, pending_status_time = NOW() WHERE id = ?",
            [history[0].id]
        );

        await db.upbsPool.query(
            "UPDATE bicycle_codes SET condition_status = 'Pending_Status' WHERE bicycle_code = ?",
            [bicycleCode]
        );

        return res.json({ reply: `Trip for Bike ${bicycleCode} ended. Is the bike in Good or Broken condition? Reply '${bicycleCode} GOOD' or '${bicycleCode} BROKEN'. Please take a photo of the bike at the rack as proof.` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error processing done request' });
    }
};

const good = async (req, res) => {
    const { smsSender, bicycleCode } = req.body;
    try {
        const [member] = await db.upbsPool.query("SELECT firstname, lastname FROM members WHERE phone_number = ? AND is_active = 1", [smsSender]);
        if (member.length === 0) {
            return res.json({ reply: "Sorry, you must be a registered UP Bike Share member to use this service." });
        }
        const currentUserName = `${member[0].firstname} ${member[0].lastname}`;

        const [bike] = await db.upbsPool.query("SELECT condition_status FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1", [bicycleCode]);

        if (bike.length === 0 || bike[0].condition_status !== 'Pending_Status') {
            return res.json({ reply: `Bike ${bicycleCode} is not awaiting a condition check.` });
        }

        const [history] = await db.upbsPool.query("SELECT id, borrowed_by FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC LIMIT 1", [bicycleCode]);

        if (history.length === 0 || history[0].borrowed_by !== currentUserName) {
            return res.json({ reply: `You are not the borrower of Bike ${bicycleCode} awaiting confirmation.` });
        }

        await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Good' WHERE bicycle_code = ?", [bicycleCode]);
        await db.upbsPool.query("UPDATE bicycle_history SET condition_confirmed = 1 WHERE id = ?", [history[0].id]);

        // Reward previous user for being honest (ceiling of 120 points)
        await db.upbsPool.query("UPDATE members SET trust_points = LEAST(120, CAST(trust_points AS SIGNED) + 1) WHERE CONCAT(firstname, ' ', lastname) = ?", [history[0].borrowed_by]);

        return res.json({ reply: `Thank you! Bike ${bicycleCode} condition confirmed as Good.` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
};

const broken = async (req, res) => {
    const { smsSender, bicycleCode } = req.body;
    let upbsConn;
    try {
        upbsConn = await db.upbsPool.getConnection();
    } catch (dbErr) {
        console.error('Failed to acquire database connection for broken:', dbErr);
        return res.status(500).json({ error: 'Database connection failed' });
    }

    try {
        await upbsConn.beginTransaction();

        const [member] = await upbsConn.query("SELECT firstname, lastname, phone_number FROM members WHERE phone_number = ? AND is_active = 1", [smsSender]);
        if (member.length === 0) {
            await upbsConn.rollback();
            return res.json({ reply: "Sorry, you must be a registered UP Bike Share member to use this service." });
        }
        const currentUserName = `${member[0].firstname} ${member[0].lastname}`;

        const [bike] = await upbsConn.query("SELECT condition_status FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1", [bicycleCode]);
        if (bike.length === 0) {
            await upbsConn.rollback();
            return res.json({ reply: "Bike not found." });
        }

        if (bike[0].condition_status === 'Disputed') {
            await upbsConn.rollback();
            return res.json({ reply: `Bike ${bicycleCode} is already disputed for admin review.` });
        }
        if (bike[0].condition_status === 'Broken') {
            await upbsConn.rollback();
            return res.json({ reply: `Bike ${bicycleCode} is already reported broken and undergoing repairs.` });
        }

        const [history] = await upbsConn.query("SELECT id, borrowed_by FROM bicycle_history WHERE bicycle_code = ? ORDER BY borrowed_at DESC LIMIT 2", [bicycleCode]);

        // Determine if this is the immediate user or the next user
        let isImmediateUser = history.length > 0 && history[0].borrowed_by === currentUserName;

        if (isImmediateUser) {
            // Immediate user reporting broken (Honesty Policy)
            await upbsConn.query(
                "UPDATE bicycle_codes SET condition_status = 'Broken', broken_reported_at = NOW(), penalty_applied = 0 WHERE bicycle_code = ?",
                [bicycleCode]
            );

            await upbsConn.query(
                "UPDATE bicycle_history SET done_text_received = 1, condition_confirmed = 1 WHERE id = ?",
                [history[0].id]
            );

            await upbsConn.query(
                "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                [member[0].lastname, member[0].firstname, member[0].phone_number, smsSender, 'Broken Report']
            );

            await upbsConn.commit();
            return res.json({ reply: `Bike ${bicycleCode} marked broken. Please repair it within 48 hours to avoid penalty. Reply '${bicycleCode} fixed' when done.` });
        } else {
            // If the bike is currently actively borrowed by another user, outsiders cannot dispute it.
            if (bike[0].condition_status === 'Borrowed') {
                await upbsConn.rollback();
                return res.json({ reply: `Bike ${bicycleCode} is currently checked out by another member.` });
            }

            // Conflict! Next user is reporting it broken after previous user said Good.
            await upbsConn.query(
                "UPDATE bicycle_codes SET condition_status = 'Disputed', dispute_reported_by = ? WHERE bicycle_code = ?",
                [smsSender, bicycleCode]
            );

            // Reward Reporter (Next User) with a ceiling of 120 points
            await upbsConn.query("UPDATE members SET trust_points = LEAST(120, CAST(trust_points AS SIGNED) + 5) WHERE phone_number = ?", [smsSender]);

            await upbsConn.query(
                "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                [member[0].lastname, member[0].firstname, member[0].phone_number, smsSender, 'Broken Report']
            );

            // Freeze Previous User
            if (history.length > 0) {
                // Get previous user's phone number
                const [prevMember] = await upbsConn.query("SELECT phone_number FROM members WHERE CONCAT(firstname, ' ', lastname) = ?", [history[0].borrowed_by]);
                if (prevMember.length > 0) {
                    await upbsConn.query("UPDATE members SET points_frozen = 1 WHERE phone_number = ?", [prevMember[0].phone_number]);

                    // Alert the previous user using the new Gateway /api/sms/send endpoint using global fetch
                    try {
                        const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
                        await fetch(`${gatewayUrl}/api/sms/send`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026'
                            },
                            body: JSON.stringify({
                                phoneNumber: prevMember[0].phone_number,
                                message: `ALERT: Bike ${bicycleCode} was reported broken by the next user. Your points are frozen pending admin dispute resolution. You cannot borrow any bike until this is settled.`
                            })
                        });
                    } catch (e) { console.error("Failed to send dispute alert", e.message); }
                }
            }

            await upbsConn.commit();
            return res.json({ reply: `Thank you for reporting. You've earned +5 Trust Points. Bike ${bicycleCode} is marked as Disputed for admin review.` });
        }
    } catch (err) {
        console.error('Error during transaction inside broken controller:', err);
        try {
            await upbsConn.rollback();
        } catch (rollbackErr) {
            console.error('Error during transaction rollback:', rollbackErr);
        }
        return res.status(500).json({ error: 'Database transaction error' });
    } finally {
        if (upbsConn) {
            upbsConn.release();
        }
    }
};

const fixed = async (req, res) => {
    const { smsSender, bicycleCode } = req.body;
    try {
        const [member] = await db.upbsPool.query("SELECT firstname, lastname, phone_number FROM members WHERE phone_number = ? AND is_active = 1", [smsSender]);
        if (member.length === 0) {
            return res.json({ reply: "Sorry, you must be a registered UP Bike Share member to use this service." });
        }

        const [bike] = await db.upbsPool.query("SELECT condition_status FROM bicycle_codes WHERE bicycle_code = ? AND is_active = 1", [bicycleCode]);
        if (bike.length === 0) {
            return res.json({ reply: `Bike ${bicycleCode} not found.` });
        }
        if (bike[0].condition_status === 'Disputed') {
            return res.json({ reply: `Bike ${bicycleCode} is currently disputed and can only be resolved by an administrator.` });
        }

        await db.upbsPool.query(
            "UPDATE bicycle_codes SET condition_status = 'Good', broken_reported_at = NULL, penalty_applied = 0, dispute_reported_by = NULL WHERE bicycle_code = ?",
            [bicycleCode]
        );

        await db.upbsPool.query(
            "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
            [member[0].lastname, member[0].firstname, member[0].phone_number, smsSender, 'Fixed Report']
        );

        return res.json({ reply: `Thank you! Bike ${bicycleCode} has been marked as fixed and is ready to be used.` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
};

// Handle points command
const points = async (req, res) => {
    const { smsSender } = req.body;

    try {
        const [memberData] = await db.upbsPool.query('SELECT trust_points FROM members WHERE phone_number = ?', [smsSender]);

        if (memberData.length === 0) {
            return res.json({ reply: "Sorry, you are not registered with UP Bike Share." });
        }

        const trustPoints = memberData[0].trust_points;
        return res.json({ reply: `Your current UP Bike Share trust points: ${trustPoints}. Keep it up!` });

    } catch (err) {
        console.error('Error in points controller:', err);
        return res.json({ reply: "An error occurred while fetching your points." });
    }
};

module.exports = {
    search,
    searchAll,
    locations,
    usage,
    borrow,
    getBicycles,
    getLocations,
    getHistory,
    done,
    good,
    broken,
    fixed,
    points
};
