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
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry, you must be a registered UP Bike Share member to use this service.' });
        }

        const { lastname, firstname, phone_number } = memberRecords[0];

        const msg1 = `UPBS Help (1/2):\nFlow: Borrow-Done-Report\n- [bike] [from] to [to] (e.g. 1 eee to vinzons)\n- done [bike]\n- [bike] good/broken/missing/delivered`;
        const msg2 = `UPBS Help (2/2):\nOther commands:\n- points\n- locations\n- search [bike]\n- search all\n- usage [bike]\n- how`;

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

        return res.json({ replies: [msg1, msg2] });

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
            WHERE phone_number = ? AND is_active = 1
        `;
        const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            return res.json({ reply: 'Sorry, you must be a registered UP Bike Share member to use this service.' });
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
