const db = require('../db');

// GET /api/analytics?month=YYYY-MM  (defaults to current month)
const getAnalytics = async (req, res) => {
    try {
        // Determine target month (default to current month)
        let period = req.query.period || 'month';
        let year, month, targetMonth;

        if (req.query.year && req.query.period === 'year') {
            year = Number(req.query.year);
            month = null;
            period = 'year';
            targetMonth = `${year}`;
        } else if (req.query.year && req.query.month_num) {
            year = Number(req.query.year);
            month = Number(req.query.month_num);
            period = 'month';
            targetMonth = `${year}-${String(month).padStart(2, '0')}`;
        } else if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) {
            [year, month] = req.query.month.split('-').map(Number);
            period = 'month';
            targetMonth = req.query.month;
        } else if (req.query.month && /^\d{4}$/.test(req.query.month)) {
            year = Number(req.query.month);
            month = null;
            period = 'year';
            targetMonth = req.query.month;
        } else {
            const now = new Date();
            const phtNow = new Date(now.getTime() + (8 * 3600 * 1000));
            year = phtNow.getUTCFullYear();
            month = phtNow.getUTCMonth() + 1;
            period = 'month';
            targetMonth = `${year}-${String(month).padStart(2, '0')}`;
        }

        // --- Overall (All-Time) Queries ---
        // 1. Peak usage hours (overall, shifted to PHT +8)
        const overallPeakHoursQuery = `
            SELECT HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) AS hour, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
            GROUP BY HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR))
            ORDER BY hour ASC
        `;
        const [overallPeakHours] = await db.upbsPool.query(overallPeakHoursQuery);

        // 2. Popular stations (overall)
        const overallPopularStationsQuery = `
            SELECT bh.new_location AS station, COUNT(*) AS count
            FROM bicycle_history bh
            JOIN locations l ON l.location_name = bh.new_location AND l.is_active = 1
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
            GROUP BY bh.new_location
            ORDER BY count DESC
        `;
        const [overallPopularStations] = await db.upbsPool.query(overallPopularStationsQuery);

        // --- Periodic Queries (Filtered to month or year) ---
        let peakHoursQuery, popularStationsQuery, queryParams;
        if (period === 'year') {
            peakHoursQuery = `
                SELECT HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) AS hour, COUNT(*) AS count
                FROM bicycle_history bh
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
                JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
                WHERE YEAR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ?
                GROUP BY HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR))
                ORDER BY hour ASC
            `;
            popularStationsQuery = `
                SELECT bh.new_location AS station, COUNT(*) AS count
                FROM bicycle_history bh
                JOIN locations l ON l.location_name = bh.new_location AND l.is_active = 1
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
                JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
                WHERE YEAR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ?
                GROUP BY bh.new_location
                ORDER BY count DESC
            `;
            queryParams = [year];
        } else {
            peakHoursQuery = `
                SELECT HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) AS hour, COUNT(*) AS count
                FROM bicycle_history bh
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
                JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
                WHERE YEAR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ? AND MONTH(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ?
                GROUP BY HOUR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR))
                ORDER BY hour ASC
            `;
            popularStationsQuery = `
                SELECT bh.new_location AS station, COUNT(*) AS count
                FROM bicycle_history bh
                JOIN locations l ON l.location_name = bh.new_location AND l.is_active = 1
                JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
                JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
                WHERE YEAR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ? AND MONTH(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) = ?
                GROUP BY bh.new_location
                ORDER BY count DESC
            `;
            queryParams = [year, month];
        }
        const [peakHours] = await db.upbsPool.query(peakHoursQuery, queryParams);
        const [popularStations] = await db.upbsPool.query(popularStationsQuery, queryParams);

        // 5. Available years and months
        const availableYearsQuery = `
            SELECT DISTINCT YEAR(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR)) AS year
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
            ORDER BY year DESC
        `;
        const [availableYearsRows] = await db.upbsPool.query(availableYearsQuery);
        let availableYears = availableYearsRows.map(r => r.year).filter(Boolean);
        if (availableYears.length === 0) availableYears = [year];

        const availableMonthsQuery = `
            SELECT DISTINCT DATE_FORMAT(DATE_ADD(bh.borrowed_at, INTERVAL 8 HOUR), '%Y-%m') AS month
            FROM bicycle_history bh
            JOIN bicycle_codes bc ON bc.bicycle_code = bh.bicycle_code AND bc.is_active = 1
            JOIN members m ON m.phone_number = bh.borrower_phone AND m.is_active = 1
            ORDER BY month DESC
        `;
        const [availableMonthsRows] = await db.upbsPool.query(availableMonthsQuery);
        const availableMonths = availableMonthsRows.map(r => r.month);

        return res.json({
            success: true,
            period,
            year,
            month: targetMonth,
            month_num: month,
            overallPeakHours,
            overallPopularStations,
            peakHours,
            popularStations,
            availableYears,
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
