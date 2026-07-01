const jwt = require('jsonwebtoken');
const db = require('../db');

const login = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ success: false, error: 'phone_number is required' });
    }

    try {
        const [rows] = await db.upbsPool.query(
            'SELECT * FROM members WHERE phone_number = ? AND is_active = 1',
            [phone_number]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Phone number is not registered or is inactive' });
        }

        const user = rows[0];
        // Generate JWT token containing phone_number and role
        const token = jwt.sign(
            { phone_number: user.phone_number, role: user.role || 'student' },
            process.env.JWT_SECRET || 'upbs-super-secret-key-2026',
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            token,
            role: user.role || 'student',
            user: {
                firstname: user.firstname,
                lastname: user.lastname,
                phone_number: user.phone_number,
                role: user.role || 'student',
                trust_points: user.trust_points
            }
        });
    } catch (err) {
        console.error('Error in member login:', err);
        return res.status(500).json({ success: false, error: 'Database error during login authentication' });
    }
};

const checkMember = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required' });
    }

    try {
        const [rows] = await db.upbsPool.query(
            'SELECT * FROM members WHERE phone_number = ? AND is_active = 1',
            [phone_number]
        );

        if (rows.length > 0) {
            res.json({ registered: true, user: rows[0] });
        } else {
            res.json({ registered: false, user: null });
        }
    } catch (err) {
        console.error('Error in checkMember:', err);
        res.status(500).json({ error: 'Database error checking member registration status' });
    }
};

const getStudentDashboard = async (req, res) => {
    // req.admin comes from authMiddleware
    const phone_number = req.admin ? req.admin.phone_number : null;

    if (!phone_number) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        // 1. Get Trust Score and basic info
        const [memberRows] = await db.upbsPool.query(
            'SELECT firstname, lastname, trust_points FROM members WHERE phone_number = ? AND is_active = 1',
            [phone_number]
        );

        if (memberRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Member not found' });
        }

        const member = memberRows[0];
        const fullName = `${member.firstname} ${member.lastname}`;

        // 2. Get Active Ride (if any)
        const [activeRideRows] = await db.upbsPool.query(
            `SELECT bh.borrowed_at, bh.bicycle_code 
             FROM bicycle_history bh
             JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code
             WHERE bh.borrowed_by = ? 
               AND bh.done_text_received = 0 
               AND bc.condition_status = 'Borrowed'
             LIMIT 1`,
            [fullName]
        );

        const activeRide = activeRideRows.length > 0 ? {
            bicycle_code: activeRideRows[0].bicycle_code,
            borrowed_at: activeRideRows[0].borrowed_at
        } : null;

        // 3. Get Recent Ride Log (last 5)
        const [rideLogRows] = await db.upbsPool.query(
            `SELECT borrowed_at as date, bicycle_code as bike, 
                    CONCAT(previous_location, ' → ', new_location) as route 
             FROM bicycle_history 
             WHERE borrowed_by = ? 
             ORDER BY borrowed_at DESC 
             LIMIT 5`,
            [fullName]
        );

        // 4. Get Last SMS Transaction (from user's inbox only)
        const phoneSuffix = phone_number.substring(1);
        let lastSms = null;

        const isCloudDB = process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com');
        if (!isCloudDB) {
            try {
                const [inboxRows] = await db.upbsPool.query(
                    `SELECT TextDecoded, ReceivingDateTime 
                     FROM smsd.inbox 
                     WHERE SenderNumber LIKE ? 
                     ORDER BY ReceivingDateTime DESC 
                     LIMIT 1`,
                    [`%${phoneSuffix}`]
                );

                if (inboxRows.length > 0) {
                    lastSms = {
                        user_text: inboxRows[0].TextDecoded,
                        date: inboxRows[0].ReceivingDateTime
                    };
                }
            } catch (e) {
                console.error("Error fetching from smsd.inbox:", e.message);
            }
        }

        // 5. Fetch Wall of Honor data (Honest Returns and helpful Logs)
        let wallOfHonor = [];
        try {
            // Fetch recent honest logs from Logs table
            const [logRows] = await db.upbsPool.query(
                `SELECT FirstName, LastName, SenderNumber as phone, DateTime as date, Request as type
                 FROM Logs
                 WHERE Request IN ('Broken Report', 'Delivered for Repair', 'Missing Report', 'Conflict Report Reward', 'Neutral Report Reward')
                 ORDER BY DateTime DESC
                 LIMIT 15`
            );

            // Fetch recent honest returns from bicycle_history
            const [historyRows] = await db.upbsPool.query(
                `SELECT borrowed_by as name, borrower_phone as phone, borrowed_at as date, 'Honest Return' as type, bicycle_code as bike
                 FROM bicycle_history
                 WHERE condition_confirmed = 1 AND (reported_condition = 'Good' OR reported_condition IS NULL)
                 ORDER BY borrowed_at DESC
                 LIMIT 15`
            );

            const honors = [];
            const maskPhone = (phone) => {
                if (!phone) return "09XX-***-XXXX";
                const clean = phone.replace(/\D/g, '');
                let display = clean;
                if (clean.startsWith('63')) {
                    display = '0' + clean.substring(2);
                }
                if (display.length === 11) {
                    return `${display.substring(0, 4)}-***-${display.substring(7)}`;
                }
                if (display.length > 4) {
                    return display.substring(0, 4) + "-***-" + display.substring(display.length - 4);
                }
                return "09XX-***-XXXX";
            };

            logRows.forEach(row => {
                let action = "";
                let points = "";
                let isPositive = true;

                if (row.type === 'Broken Report') {
                    action = "Reported a broken bike.";
                    points = "+5 pts!";
                } else if (row.type === 'Missing Report') {
                    action = "Reported a missing bike.";
                    points = "+10 pts!";
                } else if (row.type === 'Delivered for Repair') {
                    action = "Delivered a bike to the hub for repair.";
                    points = "Helpful Deed";
                } else if (row.type === 'Conflict Report Reward' || row.type === 'Neutral Report Reward') {
                    action = "Rewarded for an honest report.";
                    points = "+5 pts!";
                }

                honors.push({
                    phone: maskPhone(row.phone),
                    action: action,
                    points: points,
                    date: row.date,
                    isPositive: isPositive
                });
            });

            historyRows.forEach(row => {
                honors.push({
                    phone: maskPhone(row.phone),
                    action: `Returned Bike ${row.bike || ''} in good condition.`,
                    points: "+1 pt!",
                    date: row.date,
                    isPositive: true
                });
            });

            // Sort by date descending and take top 10
            wallOfHonor = honors
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10);

        } catch (e) {
            console.error("Error fetching Wall of Honor data:", e.message);
        }

        return res.json({
            success: true,
            data: {
                trustScore: member.trust_points,
                activeRide: activeRide,
                rideLog: rideLogRows,
                lastSms: lastSms,
                wallOfHonor: wallOfHonor
            }
        });

    } catch (err) {
        console.error('Error fetching student dashboard data:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching dashboard data' });
    }
};


const getLeaderboards = async (req, res) => {
    const phone_number = req.admin ? req.admin.phone_number : null;

    try {
        // 1. Bi-Weekly Reset Check
        const [settingsRows] = await db.upbsPool.query(
            "SELECT setting_value FROM app_settings WHERE setting_key = 'leaderboard_last_reset'"
        );

        let lastResetDate = new Date();
        if (settingsRows.length > 0) {
            lastResetDate = new Date(settingsRows[0].setting_value);
            const now = new Date();
            const diffTime = Math.abs(now - lastResetDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 14) {
                // Perform Reset (Base Carryover)
                await db.upbsPool.query("UPDATE members SET leaderboard_points = trust_points");

                // Update Reset Date
                const newReset = new Date().toISOString().slice(0, 19).replace('T', ' ');
                await db.upbsPool.query("UPDATE app_settings SET setting_value = ? WHERE setting_key = 'leaderboard_last_reset'", [newReset]);
                console.log("[Leaderboards] Performed bi-weekly reset!");
            }
        }

        // 2. Top Trusted Riders
        const [topTrustedRiders] = await db.upbsPool.query(
            'SELECT firstname, lastname, phone_number, leaderboard_points as score FROM members WHERE is_active = 1 ORDER BY leaderboard_points DESC, lastname ASC, firstname ASC LIMIT 10'
        );

        // 3. Top Active Riders (This Week)
        const [topActiveRiders] = await db.upbsPool.query(`
            SELECT m.firstname, m.lastname, m.phone_number, COUNT(bh.id) AS score 
            FROM members m 
            JOIN bicycle_history bh ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by 
            WHERE bh.borrowed_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) AND m.is_active = 1 
            GROUP BY m.phone_number, m.firstname, m.lastname 
            ORDER BY score DESC, m.lastname ASC, m.firstname ASC 
            LIMIT 8
        `);

        // 4. Most Active Hubs (This Month)
        const [topHubs] = await db.upbsPool.query(`
            SELECT previous_location AS name, COUNT(id) AS score 
            FROM bicycle_history 
            WHERE borrowed_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) 
            GROUP BY previous_location 
            ORDER BY score DESC, name ASC 
            LIMIT 8
        `);

        // 5. Current User Ranks
        let userTrustedRank = 0;
        let userTrustedScore = 0;
        let userActiveRank = 0;
        let userActiveScore = 0;
        let userFullName = "";

        if (phone_number) {
            const [memberRows] = await db.upbsPool.query('SELECT firstname, lastname, leaderboard_points FROM members WHERE phone_number = ?', [phone_number]);
            if (memberRows.length > 0) {
                const member = memberRows[0];
                userFullName = `${member.firstname} ${member.lastname}`;
                userTrustedScore = member.leaderboard_points;

                const [trustedRankRows] = await db.upbsPool.query(
                    'SELECT COUNT(*) + 1 as `rank` FROM members WHERE leaderboard_points > ? AND is_active = 1',
                    [userTrustedScore]
                );
                userTrustedRank = trustedRankRows[0].rank;

                const [activeScoreRows] = await db.upbsPool.query(
                    "SELECT COUNT(id) as score FROM bicycle_history WHERE borrowed_by = ? AND borrowed_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)",
                    [userFullName]
                );
                userActiveScore = activeScoreRows[0].score;

                const [activeRankRows] = await db.upbsPool.query(`
                    SELECT COUNT(*) + 1 as \`rank\` FROM (
                        SELECT COUNT(bh.id) as ride_count 
                        FROM members m 
                        JOIN bicycle_history bh ON CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by 
                        WHERE bh.borrowed_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK) AND m.is_active = 1 
                        GROUP BY m.phone_number 
                        HAVING ride_count > ?
                    ) as subquery
                `, [userActiveScore]);
                userActiveRank = activeRankRows[0].rank;
            }
        }

        return res.json({
            success: true,
            data: {
                topTrustedRiders,
                topActiveRiders,
                topHubs,
                currentUser: {
                    fullName: userFullName,
                    trustedRank: userTrustedRank,
                    trustedScore: userTrustedScore,
                    activeRank: userActiveRank,
                    activeScore: userActiveScore
                }
            }
        });

    } catch (err) {
        console.error('Error fetching leaderboards:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching leaderboards' });
    }
};

module.exports = {
    login,
    checkMember,
    getStudentDashboard,
    getLeaderboards
};
