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

module.exports = {
    login,
    checkMember
};

