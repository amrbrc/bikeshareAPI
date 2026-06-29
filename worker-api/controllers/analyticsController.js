const db = require('../db');

// GET /api/analytics?month=YYYY-MM  (defaults to current month)
const getAnalytics = async (req, res) => {
    try {
        // Determine target month (default to current month)
        let targetMonth = req.query.month;
        let year, month;

        if (targetMonth && /^\d{4}-\d{2}$/.test(targetMonth)) {
            [year, month] = targetMonth.split('-').map(Number);
        } else {
            const now = new Date();
            year = now.getFullYear();
            month = now.getMonth() + 1; // JS months are 0-indexed
            targetMonth = `${year}-${String(month).padStart(2, '0')}`;
        }

        // Query peak usage hours filtered to the target month
        const peakHoursQuery = `
            SELECT HOUR(bh.borrowed_at) AS hour, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON ((bh.borrower_phone IS NOT NULL AND m.phone_number = bh.borrower_phone) OR (bh.borrower_phone IS NULL AND CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by)) AND m.is_active = 1
            WHERE YEAR(bh.borrowed_at) = ? AND MONTH(bh.borrowed_at) = ?
            GROUP BY HOUR(bh.borrowed_at)
            ORDER BY hour ASC
        `;
        const [peakHours] = await db.upbsPool.query(peakHoursQuery, [year, month]);

        // Query popular stations filtered to the target month
        const popularStationsQuery = `
            SELECT bh.new_location AS station, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN locations l ON l.location_name = bh.new_location AND l.is_active = 1
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON ((bh.borrower_phone IS NOT NULL AND m.phone_number = bh.borrower_phone) OR (bh.borrower_phone IS NULL AND CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by)) AND m.is_active = 1
            WHERE YEAR(bh.borrowed_at) = ? AND MONTH(bh.borrowed_at) = ?
            GROUP BY bh.new_location
            ORDER BY count DESC
        `;
        const [popularStations] = await db.upbsPool.query(popularStationsQuery, [year, month]);

        // Query all distinct months that have ride data (for the history dropdown)
        const availableMonthsQuery = `
            SELECT DISTINCT DATE_FORMAT(bh.borrowed_at, '%Y-%m') AS month
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON ((bh.borrower_phone IS NOT NULL AND m.phone_number = bh.borrower_phone) OR (bh.borrower_phone IS NULL AND CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by)) AND m.is_active = 1
            ORDER BY month DESC
        `;
        const [availableMonthsRows] = await db.upbsPool.query(availableMonthsQuery);
        const availableMonths = availableMonthsRows.map(r => r.month);

        return res.json({
            success: true,
            month: targetMonth,
            peakHours,
            popularStations,
            availableMonths
        });

    } catch (err) {
        console.error('Error in getAnalytics controller:', err);
        return res.status(500).json({
            success: false,
            error: 'Database error processing analytics data'
        });
    }
};

module.exports = {
    getAnalytics
};
