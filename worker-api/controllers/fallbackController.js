const db = require('../db');

// POST /api/invalid-command
const invalidCommand = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
    }

    try {
        // 1. Check if this invalid command attempt has already been logged for this message ID
        const checkQuery = "SELECT * FROM invalid_command_senders WHERE phone_number = ? AND message_id = ?";
        const [existing] = await db.upbsPool.query(checkQuery, [smsSender, messageId]);

        const replyMessage = 'Invalid Command. Send "bikeshare help" for list of available commands.';

        if (existing.length === 0) {
            // Log it in invalid_command_senders
            const insertQuery = "INSERT INTO invalid_command_senders (phone_number, message_id) VALUES (?, ?)";
            await db.upbsPool.query(insertQuery, [smsSender, messageId]);

            // Retrieve member details if they exist (to populate Logs properly)
            const memberQuery = "SELECT lastname, firstname, phone_number FROM members WHERE phone_number = ?";
            const [memberRecords] = await db.upbsPool.query(memberQuery, [smsSender]);

            let userLogInfo = { lastname: null, firstname: null, phone_number: null };
            if (memberRecords.length > 0) {
                userLogInfo = memberRecords[0];
            }

            // Log request in Logs table
            const logQuery = `
                INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
                VALUES (?, ?, ?, ?, NOW(), ?, ?)
            `;
            await db.upbsPool.query(logQuery, [
                userLogInfo.lastname,
                userLogInfo.firstname,
                userLogInfo.phone_number,
                smsSender,
                'Invalid Command',
                messageId
            ]);
        }

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in invalidCommand controller:', err);
        res.status(500).json({ error: 'Database error processing invalid command' });
    }
};

// POST /api/non-registered
const nonRegistered = async (req, res) => {
    const { smsSender, messageId } = req.body;

    if (!smsSender || !messageId) {
        return res.status(400).json({ error: 'smsSender and messageId are required' });
    }

    try {
        // 1. Check if this non-registered attempt has already been logged for this message ID
        const checkQuery = "SELECT * FROM non_registered_senders WHERE phone_number = ? AND message_id = ?";
        const [existing] = await db.upbsPool.query(checkQuery, [smsSender, messageId]);

        const replyMessage = "Sorry, you are not registered with UP Bike Share.";

        if (existing.length === 0) {
            // Log it in non_registered_senders
            const insertQuery = "INSERT INTO non_registered_senders (phone_number, message_id) VALUES (?, ?)";
            await db.upbsPool.query(insertQuery, [smsSender, messageId]);

            // Log request in Logs table (since non-registered, name and phone fields are null)
            const logQuery = `
                INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
                VALUES (NULL, NULL, NULL, ?, NOW(), ?, ?)
            `;
            await db.upbsPool.query(logQuery, [
                smsSender,
                'Non-Registered',
                messageId
            ]);
        }

        return res.json({ reply: replyMessage });

    } catch (err) {
        console.error('Error in nonRegistered controller:', err);
        res.status(500).json({ error: 'Database error processing non-registered sender log' });
    }
};

module.exports = {
    invalidCommand,
    nonRegistered
};
