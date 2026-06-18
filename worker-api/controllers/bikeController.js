const db = require('../db');

// POST /api/search
const search = async (req, res) => {
    const { smsSender, bicycleCode, messageId } = req.body;

    if (!smsSender || !bicycleCode || !messageId) {
        return res.status(400).json({ error: 'smsSender, bicycleCode, and messageId are required' });
    }

    try {
        // 1. Retrieve member information
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ?
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Retrieve the location of the bicycle
        const locationQuery = `
            SELECT new_location
            FROM bicycle_codes
            WHERE bicycle_code = ?
        `;
        const [locationRecords] = await db.upbsPool.query(locationQuery, [bicycleCode]);

        if (locationRecords.length === 0) {
            return res.json({ reply: `Bicycle code ${bicycleCode} not found.` });
        }

        const newLocation = locationRecords[0].new_location;
        const replyMessage = `At the moment, the current location of ${bicycleCode} is at ${newLocation}.`;

        // 3. Log the search request
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
            WHERE phone_number = ?
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        let userLogInfo = { lastname: null, firstname: null, phone_number: null };
        if (memberRecords.length > 0) {
            userLogInfo = memberRecords[0];
        }

        // 2. Query to fetch bicycle locations
        const bicycleQuery = "SELECT bicycle_code, new_location, previous_location FROM bicycle_codes";
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
            WHERE phone_number = ?
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Fetch active locations
        const locationQuery = "SELECT location_name FROM locations";
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
            WHERE phone_number = ?
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ replies: ['Sorry, you are not registered with UP Bike Share.'] });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        // 2. Validate Bicycle Code
        const bikeQuery = "SELECT * FROM bicycle_codes WHERE bicycle_code = ?";
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
        // 1. Retrieve member information (required)
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ?
        `;
        const [memberRecords] = await upbsConn.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry. You are not registered with UP Bike Share.' });
        }

        const user = memberRecords[0];

        // 2. Validate Bicycle Code
        const bikeQuery = "SELECT * FROM bicycle_codes WHERE bicycle_code = ?";
        const [bicycles] = await upbsConn.query(bikeQuery, [bicycleCode]);

        if (bicycles.length === 0) {
            return res.json({ invalidBicycle: true });
        }

        const bicycle = bicycles[0];

        // Helper function for location validation inside the handler
        const validateLoc = async (loc) => {
            const [rows] = await upbsConn.query("SELECT * FROM locations WHERE location_name = ?", [loc]);
            return rows.length > 0;
        };

        // 3. Validate 'from' and 'to' locations
        const validFrom = await validateLoc(fromLocation);
        const validTo = await validateLoc(toLocation);

        if (!validFrom || !validTo) {
            return res.json({ reply: "Invalid location(s). Please check your 'from' and 'to' locations." });
        }

        // 4. Start the database transaction
        await upbsConn.beginTransaction();

        // Update bicycle location
        const updateBicycleQuery = `
            UPDATE bicycle_codes 
            SET previous_location = ?, new_location = ? 
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
        const replyMessage = `Hi ${user.firstname} ${user.lastname}! The lock code for bicycle ${bicycle.bicycle_code} is ${bicycle.combination_lock}. You may proceed to ${toLocation}. Please don't forget to lock the bike at your destination. Have a safe ride.`;

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

module.exports = {
    search,
    searchAll,
    locations,
    usage,
    borrow
};
