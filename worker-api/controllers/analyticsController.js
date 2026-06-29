const db = require('../db');

// GET /api/analytics
const getAnalytics = async (req, res) => {
    try {
        // Query to get peak usage hours for active bikes and active members
        const peakHoursQuery = `
            SELECT HOUR(bh.borrowed_at) AS hour, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON ((bh.borrower_phone IS NOT NULL AND m.phone_number = bh.borrower_phone) OR (bh.borrower_phone IS NULL AND CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by)) AND m.is_active = 1
            GROUP BY HOUR(bh.borrowed_at)
            ORDER BY hour ASC
        `;
        const [peakHours] = await db.upbsPool.query(peakHoursQuery);

        // Query to get popular stations (based on destination of trips) for active locations, bikes, and members
        const popularStationsQuery = `
            SELECT bh.new_location AS station, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN locations l ON l.location_name = bh.new_location AND l.is_active = 1
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON ((bh.borrower_phone IS NOT NULL AND m.phone_number = bh.borrower_phone) OR (bh.borrower_phone IS NULL AND CONCAT(m.firstname, ' ', m.lastname) = bh.borrowed_by)) AND m.is_active = 1
            GROUP BY bh.new_location
            ORDER BY count DESC
        `;
        const [popularStations] = await db.upbsPool.query(popularStationsQuery);

        return res.json({
            success: true,
            peakHours,
            popularStations
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
