const db = require('../db');

/**
 * GET /api/gateway/outbound
 * Fetches all pending outbound SMS messages.
 */
const getPendingSms = async (req, res) => {
    try {
        const [rows] = await db.upbsPool.query(
            "SELECT id, phone_number, message FROM outbound_sms WHERE status = 'pending' ORDER BY id ASC"
        );
        return res.json({ success: true, smsList: rows });
    } catch (err) {
        console.error("Error fetching pending SMS:", err.message);
        return res.status(500).json({ error: "Database error fetching outbound queue" });
    }
};

/**
 * POST /api/gateway/outbound/:id/sent
 * Marks an outbound SMS message as successfully sent.
 */
const markSmsSent = async (req, res) => {
    const { id } = req.params;
    try {
        await db.upbsPool.query(
            "UPDATE outbound_sms SET status = 'sent', sent_at = NOW() WHERE id = ?",
            [id]
        );
        return res.json({ success: true });
    } catch (err) {
        console.error(`Error marking SMS ${id} as sent:`, err.message);
        return res.status(500).json({ error: "Database error updating SMS status" });
    }
};

module.exports = { getPendingSms, markSmsSent };
