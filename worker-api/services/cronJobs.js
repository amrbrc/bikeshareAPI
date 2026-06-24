// worker-api/services/cronJobs.js
const cron = require('node-cron');
const db = require('../db');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

// Helper function to send SMS via the Gateway API
async function sendSMS(phoneNumber, text) {
    try {
        console.log(`[Cron] Sending SMS to ${phoneNumber}: "${text}"`);
        const response = await fetch(`${GATEWAY_URL}/api/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, message: text })
        });
        if (!response.ok) {
            console.error(`[Cron] Gateway returned status ${response.status} when sending SMS to ${phoneNumber}`);
        } else {
            console.log(`[Cron] SMS successfully sent to ${phoneNumber}`);
        }
    } catch (err) {
        console.error(`[Cron] Failed to send SMS to ${phoneNumber}:`, err);
    }
}

// Job 1 (Every 10 mins): 1-Hour & 4-Hour active borrow reminders
const startBorrowRemindersJob = () => {
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Cron] Running 1-Hour and 4-Hour borrow reminders check...');
        try {
            // Find active borrowings that need reminders
            const query = `
                SELECT bh.id, bh.bicycle_code, bh.borrowed_by, bh.borrowed_at, 
                       bh.reminder_1h_sent, bh.reminder_4h_sent,
                       m.phone_number
                FROM bicycle_history bh
                JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                WHERE bh.done_text_received = 0 
                  AND bh.condition_confirmed = 0
                  AND (
                      (bh.reminder_1h_sent = 0 AND bh.borrowed_at < NOW() - INTERVAL 1 HOUR)
                      OR 
                      (bh.reminder_4h_sent = 0 AND bh.borrowed_at < NOW() - INTERVAL 4 HOUR)
                  )
            `;
            const [records] = await db.upbsPool.query(query);

            for (const row of records) {
                const borrowTimeMs = Date.now() - new Date(row.borrowed_at).getTime();
                const borrowHours = borrowTimeMs / (1000 * 60 * 60);

                if (row.reminder_4h_sent === 0 && borrowHours >= 4) {
                    // Send 4-Hour Reminder
                    const text = `Reminder: You have 2 hours left on Bike ${row.bicycle_code}. Please return it to a station soon. Remember to text 'done ${row.bicycle_code}' when finished.`;
                    await sendSMS(row.phone_number, text);
                    await db.upbsPool.query(
                        'UPDATE bicycle_history SET reminder_1h_sent = 1, reminder_4h_sent = 1 WHERE id = ?',
                        [row.id]
                    );
                } else if (row.reminder_1h_sent === 0 && borrowHours >= 1) {
                    // Send 1-Hour Reminder
                    const text = `Hope you're enjoying the ride! Remember to text 'done ${row.bicycle_code}' when finished.`;
                    await sendSMS(row.phone_number, text);
                    await db.upbsPool.query(
                        'UPDATE bicycle_history SET reminder_1h_sent = 1 WHERE id = ?',
                        [row.id]
                    );
                }
            }
        } catch (err) {
            console.error('[Cron] Error in 1H/4H reminders job:', err);
        }
    });
};

// Job 2 (Every 2 mins): 5-Minute Pending_Status handshake photo proof reminder
const startHandshakeReminderJob = () => {
    cron.schedule('*/2 * * * *', async () => {
        console.log('[Cron] Running 5-Minute Pending return handshake check...');
        try {
            // Find records in Pending_Status (done_text_received = 1, condition_confirmed = 0)
            // that are older than 5 minutes and haven't had a reminder sent yet
            const query = `
                SELECT bh.id, bh.bicycle_code, bh.borrowed_by, bh.pending_status_time,
                       m.phone_number
                FROM bicycle_history bh
                JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                WHERE bh.done_text_received = 1 
                  AND bh.condition_confirmed = 0
                  AND bh.reminder_pending_sent = 0
                  AND bh.pending_status_time < NOW() - INTERVAL 5 MINUTE
            `;
            const [records] = await db.upbsPool.query(query);

            for (const row of records) {
                const text = `Reminder: Please confirm the condition of Bike ${row.bicycle_code}. Reply '${row.bicycle_code} GOOD' or '${row.bicycle_code} BROKEN' and take a photo of the bike at the rack as proof.`;
                await sendSMS(row.phone_number, text);
                await db.upbsPool.query(
                    'UPDATE bicycle_history SET reminder_pending_sent = 1 WHERE id = ?',
                    [row.id]
                );
            }
        } catch (err) {
            console.error('[Cron] Error in handshake reminder job:', err);
        }
    });
};

// Job 3 (Hourly): 48-Hour Unrepaired Damage grace period countdown
const startUnrepairedDamageJob = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('[Cron] Running 48-Hour Unrepaired Damage check...');
        try {
            // Query for broken bikes older than 48 hours without penalty applied
            const query = `
                SELECT bicycle_code, broken_reported_at
                FROM bicycle_codes
                WHERE condition_status = 'Broken'
                  AND broken_reported_at < NOW() - INTERVAL 48 HOUR
                  AND penalty_applied = 0
            `;
            const [brokenBikes] = await db.upbsPool.query(query);

            for (const bike of brokenBikes) {
                // Find the member who reported it broken (the last borrower in history)
                const borrowerQuery = `
                    SELECT bh.id AS history_id, bh.borrowed_by, m.phone_number, m.trust_points
                    FROM bicycle_history bh
                    JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                    WHERE bh.bicycle_code = ?
                    ORDER BY bh.borrowed_at DESC
                    LIMIT 1
                `;
                const [members] = await db.upbsPool.query(borrowerQuery, [bike.bicycle_code]);

                if (members.length > 0) {
                    const member = members[0];
                    console.log(`[Cron] Applying 48h penalty for Bike ${bike.bicycle_code} to ${member.borrowed_by}`);

                    // Deduct 20 points
                    await db.upbsPool.query(
                        'UPDATE members SET trust_points = GREATEST(0, trust_points - 20) WHERE phone_number = ?',
                        [member.phone_number]
                    );

                    // Mark penalty as applied
                    await db.upbsPool.query(
                        'UPDATE bicycle_codes SET penalty_applied = 1 WHERE bicycle_code = ?',
                        [bike.bicycle_code]
                    );

                    // Send SMS notification
                    const text = `ALERT: The 48-hour grace period to repair Bike ${bike.bicycle_code} has expired. A -20 demerit has been applied to your account.`;
                    await sendSMS(member.phone_number, text);
                } else {
                    console.warn(`[Cron] Could not find reporter member for broken Bike ${bike.bicycle_code}`);
                }
            }
        } catch (err) {
            console.error('[Cron] Error in unrepaired damage job:', err);
        }
    });
};

// Initialize all cron jobs
const initCronJobs = () => {
    console.log('[Cron] Initializing background timer tasks...');
    startBorrowRemindersJob();
    startHandshakeReminderJob();
    startUnrepairedDamageJob();
};

module.exports = { initCronJobs };
