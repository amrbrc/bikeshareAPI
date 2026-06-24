const db = require('../db');

// POST /api/admin/login
const login = async (req, res) => {
    const { username, password } = req.body;

    const envUsername = process.env.ADMIN_USERNAME || 'admin';
    const envPassword = process.env.ADMIN_PASSWORD || 'upbsadmin2026';

    if (username === envUsername && password === envPassword) {
        return res.json({ success: true, token: 'admin-logged-in-token' });
    } else {
        return res.status(401).json({ success: false, error: 'Invalid username or password' });
    }
};

// GET /api/admin/members
const getMembers = async (req, res) => {
    try {
        const [rows] = await db.upbsPool.query('SELECT firstname, lastname, phone_number, trust_points, points_frozen FROM members ORDER BY lastname ASC, firstname ASC');
        return res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error in getMembers controller:', err);
        return res.status(500).json({ success: false, error: 'Database error fetching members list' });
    }
};

// POST /api/admin/members
const addMember = async (req, res) => {
    const { firstname, lastname, phone_number } = req.body;

    if (!firstname || !lastname || !phone_number) {
        return res.status(400).json({ success: false, error: 'firstname, lastname, and phone_number are required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM members WHERE phone_number = ?', [phone_number]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Phone number already registered' });
        }

        await db.upbsPool.query(
            'INSERT INTO members (firstname, lastname, phone_number) VALUES (?, ?, ?)',
            [firstname, lastname, phone_number]
        );

        return res.json({ success: true, message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error in addMember controller:', err);
        return res.status(500).json({ success: false, error: 'Database error registering user' });
    }
};

// POST /api/admin/bicycles
const addBicycle = async (req, res) => {
    const { bicycle_code, combination_lock, initial_location } = req.body;

    if (!bicycle_code || !combination_lock || !initial_location) {
        return res.status(400).json({ success: false, error: 'bicycle_code, combination_lock, and initial_location are required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM bicycle_codes WHERE bicycle_code = ?', [bicycle_code]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Bicycle code already exists' });
        }

        await db.upbsPool.query(
            'INSERT INTO bicycle_codes (bicycle_code, combination_lock, previous_location, new_location) VALUES (?, ?, ?, ?)',
            [bicycle_code, combination_lock, initial_location, initial_location]
        );

        return res.json({ success: true, message: 'Bicycle successfully added!' });
    } catch (err) {
        console.error('Error in addBicycle controller:', err);
        return res.status(500).json({ success: false, error: 'Database error adding bicycle' });
    }
};

// POST /api/admin/locations
const addLocation = async (req, res) => {
    const { location_name } = req.body;

    if (!location_name) {
        return res.status(400).json({ success: false, error: 'location_name is required' });
    }

    try {
        const [existing] = await db.upbsPool.query('SELECT * FROM locations WHERE location_name = ?', [location_name]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Location name already exists' });
        }

        await db.upbsPool.query(
            'INSERT INTO locations (location_name, is_disabled) VALUES (?, 0)',
            [location_name]
        );

        return res.json({ success: true, message: 'Station successfully added!' });
    } catch (err) {
        console.error('Error in addLocation controller:', err);
        return res.status(500).json({ success: false, error: 'Database error adding location' });
    }
};

// POST /api/admin/locations/toggle
const toggleLocation = async (req, res) => {
    const { location_name, is_disabled } = req.body;

    if (!location_name || is_disabled === undefined) {
        return res.status(400).json({ success: false, error: 'location_name and is_disabled are required' });
    }

    try {
        const val = is_disabled ? 1 : 0;
        const [result] = await db.upbsPool.query(
            'UPDATE locations SET is_disabled = ? WHERE location_name = ?',
            [val, location_name]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('Error in toggleLocation controller:', err);
        return res.status(500).json({ success: false, error: 'Database error toggling location status' });
    }
};

// POST /api/admin/resolve-dispute
const resolveDispute = async (req, res) => {
    const { phone_number, verdict, bicycle_code } = req.body;

    if (!phone_number || !verdict || !bicycle_code) {
        return res.status(400).json({ success: false, error: 'phone_number, verdict, and bicycle_code are required' });
    }

    try {
        if (verdict === 'guilty') {
            await db.upbsPool.query("UPDATE members SET points_frozen = 0, trust_points = trust_points - 30 WHERE phone_number = ?", [phone_number]);
            await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Broken' WHERE bicycle_code = ?", [bicycle_code]);
        } else if (verdict === 'innocent') {
            await db.upbsPool.query("UPDATE members SET points_frozen = 0 WHERE phone_number = ?", [phone_number]);
            await db.upbsPool.query("UPDATE bicycle_codes SET condition_status = 'Good' WHERE bicycle_code = ?", [bicycle_code]);
        }
        return res.json({ success: true, message: `Dispute resolved as ${verdict}.` });
    } catch (err) {
        console.error('Error resolving dispute:', err);
        return res.status(500).json({ success: false, error: 'Database error' });
    }
};

module.exports = {
    login,
    getMembers,
    addMember,
    addBicycle,
    addLocation,
    toggleLocation,
    resolveDispute
};
