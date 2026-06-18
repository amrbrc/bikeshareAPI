const db = require('../db');

const checkMember = async (req, res) => {
    const { phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ error: 'phone_number is required' });
    }

    try {
        const [rows] = await db.upbsPool.query(
            'SELECT * FROM members WHERE phone_number = ?',
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
    checkMember
};
