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
        return res.status(500).json({ error: "Database error fetching outbound queue", details: err.message, stack: err.stack });
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

/**
 * GET /api/gateway/debug-db
 * Runs a simple test query to verify the database pool connection status and returns errors if any.
 */
const debugDb = async (req, res) => {
    try {
        const [rows] = await db.upbsPool.query("SELECT 1 as test");
        return res.json({ success: true, message: "Database connection successful", data: rows });
    } catch (err) {
        console.error("Database debug connection failed:", err.message);
        return res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
};

/**
 * GET /api/gateway/test-notifications
 * Triggers a test notification (Discord & Email) to verify config values live on Render.
 */
const testNotifications = async (req, res) => {
    try {
        const notificationService = require('../services/notificationService');
        const studentName = 'Amer Talastasin (Test)';
        const phoneNumber = '+639615580206';
        const bikeCode = '99';
        const imageUrl = 'https://raw.githubusercontent.com/amrbrc/bikeshareAPI/main/dashboard/icons/icon-192.png';

        await notificationService.sendDiscordNotification(studentName, phoneNumber, bikeCode, imageUrl);

        return res.json({ success: true, message: "Test notifications dispatched to Discord." });
    } catch (err) {
        console.error("Test notifications failed:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { getPendingSms, markSmsSent, debugDb, testNotifications };
