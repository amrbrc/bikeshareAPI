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
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.GATEWAY_API_KEY || 'upbs-gateway-secret-api-key-2026'
            },
            body: JSON.stringify({ phoneNumber, message: text })
        });
        if (!response.ok) {
            console.error(`[Cron] Gateway returned status ${response.status} when sending SMS to ${phoneNumber}`);
            return false;
        } else {
            console.log(`[Cron] SMS successfully sent to ${phoneNumber}`);
            return true;
        }
    } catch (err) {
        console.error(`[Cron] Failed to send SMS to ${phoneNumber}:`, err);
        return false;
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
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code
                WHERE bh.done_text_received = 0 
                  AND bh.condition_confirmed = 0
                  AND bc.condition_status = 'Borrowed'
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

                console.log(`[Cron Debug] Row ID: ${row.id}, Bike: ${row.bicycle_code}, borrowed_at: ${row.borrowed_at}, borrowHours: ${borrowHours}`);

                if (row.reminder_4h_sent === 0 && borrowHours >= 4) {
                    // Send 4-Hour Reminder
                    const text = `Reminder: You have 2 hours left on Bike ${row.bicycle_code}. Please return it to a station soon. Remember to text 'done ${row.bicycle_code}' when finished.`;
                    const success = await sendSMS(row.phone_number, text);
                    if (success) {
                        await db.upbsPool.query(
                            'UPDATE bicycle_history SET reminder_1h_sent = 1, reminder_4h_sent = 1 WHERE id = ?',
                            [row.id]
                        );
                    }
                } else if (row.reminder_1h_sent === 0 && borrowHours >= 1) {
                    // Send 1-Hour Reminder
                    const text = `Hope you're enjoying the ride! Remember to text 'done ${row.bicycle_code}' when finished.`;
                    const success = await sendSMS(row.phone_number, text);
                    if (success) {
                        await db.upbsPool.query(
                            'UPDATE bicycle_history SET reminder_1h_sent = 1 WHERE id = ?',
                            [row.id]
                        );
                    }
                }
            }
        } catch (err) {
            console.error('[Cron] Error in 1H/4H reminders job:', err);
        }
    });
};

// Job 1.5 (Every 10 mins): 6-Hour Timeout Penalty
const startSixHourPenaltyJob = () => {
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Cron] Running 6-Hour borrow limit check...');
        try {
            // Find active borrowings that exceed 6 hours and haven't been penalized yet
            const query = `
                SELECT bh.id, bh.bicycle_code, bh.borrowed_by, bh.borrowed_at, 
                       m.phone_number
                FROM bicycle_history bh
                JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code
                WHERE bh.done_text_received = 0 
                  AND bc.condition_status = 'Borrowed'
                  AND bh.borrowed_at < NOW() - INTERVAL 6 HOUR
                  AND (bh.last_penalty_time IS NULL OR bh.last_penalty_time < NOW() - INTERVAL 1 HOUR)
            `;
            const [records] = await db.upbsPool.query(query);

            for (const row of records) {
                console.log(`[Cron] Applying 6-hour penalty for Bike ${row.bicycle_code} to ${row.borrowed_by}`);

                // Deduct 5 points
                await db.upbsPool.query(
                    'UPDATE members SET trust_points = GREATEST(0, CAST(trust_points AS SIGNED) - 5) WHERE phone_number = ?',
                    [row.phone_number]
                );

                // Log the penalty
                await db.upbsPool.query(
                    "INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request) VALUES (?, ?, ?, ?, NOW(), ?)",
                    ['System', 'Cron Jobs', row.phone_number, row.phone_number, '6-Hour Penalty Applied']
                );

                // Mark penalty timestamp
                await db.upbsPool.query(
                    'UPDATE bicycle_history SET last_penalty_time = NOW() WHERE id = ?',
                    [row.id]
                );

                const text = `ALERT: You have exceeded the borrow time limit for Bike ${row.bicycle_code}. A -5 point penalty has been applied. You will continue to lose 5 points EVERY HOUR until the bike is returned.`;
                await sendSMS(row.phone_number, text);
            }
        } catch (err) {
            console.error('[Cron] Error in 6H penalty job:', err);
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
                       m.phone_number, bh.reminder_pending_sent, bc.condition_status
                FROM bicycle_history bh
                JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code
                WHERE bh.done_text_received = 1 
                  AND bh.condition_confirmed = 0
                  AND (bh.reminder_pending_sent = 0 OR bh.reminder_pending_sent IS NULL)
                  AND bc.condition_status = 'Pending_Status'
                  AND bh.pending_status_time < NOW() - INTERVAL 5 MINUTE
            `;
            const [records] = await db.upbsPool.query(query);

            for (const row of records) {
                console.log(`[Cron] Sending handshake reminder for Bike ${row.bicycle_code}`);
                const text = `Reminder: Please confirm the condition of Bike ${row.bicycle_code}. Reply 'GOOD ${row.bicycle_code}' or 'BROKEN ${row.bicycle_code}' and take a photo of the bike at the rack as proof.`;
                const success = await sendSMS(row.phone_number, text);
                if (success) {
                    await db.upbsPool.query(
                        'UPDATE bicycle_history SET reminder_pending_sent = 1 WHERE id = ?',
                        [row.id]
                    );
                }
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
            const query = `
                SELECT bicycle_code, broken_reported_at
                FROM bicycle_codes
                WHERE condition_status = 'Broken'
                  AND broken_reported_at < NOW() - INTERVAL 48 HOUR
                  AND penalty_applied = 0
            `;
            const [brokenBikes] = await db.upbsPool.query(query);

            for (const bike of brokenBikes) {
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
                    console.log(`[Cron] Applying penalty for Bike ${bike.bicycle_code} to ${member.borrowed_by}`);

                    await db.upbsPool.query(
                        'UPDATE members SET trust_points = GREATEST(0, CAST(trust_points AS SIGNED) - 10) WHERE phone_number = ?',
                        [member.phone_number]
                    );

                    await db.upbsPool.query(
                        'UPDATE bicycle_codes SET penalty_applied = 1 WHERE bicycle_code = ?',
                        [bike.bicycle_code]
                    );

                    const text = `ALERT: The 48-hour grace period to repair Bike ${bike.bicycle_code} has expired. A -10 demerit has been applied to your account.`;
                    await sendSMS(member.phone_number, text);
                }
            }
        } catch (err) {
            console.error('[Cron] Error in unrepaired damage job:', err);
        }
    });
};

// Job 4: 24-Hour Repair Warning Reminder
const start24hReminderJob = () => {
    cron.schedule('0 * * * *', async () => {
        console.log('[Cron] Running 24-Hour Repair Warning check...');
        try {
            const query = `
                SELECT bicycle_code, broken_reported_at
                FROM bicycle_codes
                WHERE condition_status = 'Broken'
                  AND broken_reported_at < NOW() - INTERVAL 24 HOUR
                  AND reminder_24h_sent = 0
            `;
            const [brokenBikes] = await db.upbsPool.query(query);

            for (const bike of brokenBikes) {
                const borrowerQuery = `
                    SELECT bh.id AS history_id, bh.borrowed_by, m.phone_number
                    FROM bicycle_history bh
                    JOIN members m ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by
                    WHERE bh.bicycle_code = ?
                    ORDER BY bh.borrowed_at DESC
                    LIMIT 1
                `;
                const [members] = await db.upbsPool.query(borrowerQuery, [bike.bicycle_code]);

                if (members.length > 0) {
                    const member = members[0];
                    console.log(`[Cron] Sending 24h repair warning for Bike ${bike.bicycle_code}`);

                    const text = `REMINDER: You have 24 hours left to repair Bike ${bike.bicycle_code} before a -10 demerit is applied to your account.`;
                    const success = await sendSMS(member.phone_number, text);

                    if (success) {
                        await db.upbsPool.query(
                            'UPDATE bicycle_codes SET reminder_24h_sent = 1 WHERE bicycle_code = ?',
                            [bike.bicycle_code]
                        );
                    }
                }
            }
        } catch (err) {
            console.error('[Cron] Error in 24h reminder job:', err);
        }
    });
};

const initCronJobs = () => {
    console.log('[Cron] Initializing background timer tasks...');
    startBorrowRemindersJob();
    startSixHourPenaltyJob();
    startHandshakeReminderJob();
    startUnrepairedDamageJob();
    start24hReminderJob();
};

module.exports = { initCronJobs };
