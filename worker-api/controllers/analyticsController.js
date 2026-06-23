const db = require('../db');

// GET /api/analytics
const getAnalytics = async (req, res) => {
    try {
        // Query to get peak usage hours
        const peakHoursQuery = `
            SELECT HOUR(borrowed_at) AS hour, COUNT(*) AS count
            FROM bicycle_history
            GROUP BY HOUR(borrowed_at)
            ORDER BY hour ASC
        `;
        const [peakHours] = await db.upbsPool.query(peakHoursQuery);

        // Query to get popular stations (based on destination of trips)
        const popularStationsQuery = `
            SELECT new_location AS station, COUNT(*) AS count
            FROM bicycle_history
            GROUP BY new_location
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
