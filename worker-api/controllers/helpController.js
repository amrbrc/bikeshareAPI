const db = require('../db');

// POST /api/help
const help = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
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
        const replyMessage = 'Cmds: 1. <bike> <from> to <dest> | 2. locations | 3. search <bike/bldg> | 4. done <bike> | 5. good/broken/missing <bike> | 6. points';

        // 2. Log the help request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await db.upbsPool.query(logQuery, [
            lastname,
            firstname,
            phone_number,
            smsSender,
            'Bikeshare help',
            messageId
        ]);

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in help controller:', err);
        res.status(500).json({ error: 'Database error processing help request' });
    }
};

// POST /api/how
const how = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
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
        const replyMessage = 'Use the format: <bicycle_code> <previous_location> to <new_location>. Example: 1 eee to vinzons';

        // 2. Log the how request
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await db.upbsPool.query(logQuery, [
            lastname,
            firstname,
            phone_number,
            smsSender,
            'How to Borrow',
            messageId
        ]);

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in how controller:', err);
        res.status(500).json({ error: 'Database error processing how request' });
    }
};

module.exports = {
    help,
    how
};
