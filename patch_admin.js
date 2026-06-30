const fs = require('fs');
let content = fs.readFileSync('worker-api/controllers/adminController.js', 'utf8');

// 1. Modify getMembers to include is_active and remove WHERE is_active = 1
content = content.replace(
    /SELECT firstname, lastname, phone_number, trust_points, points_frozen FROM members WHERE \(is_active = 1 OR is_active IS NULL\) ORDER BY lastname ASC, firstname ASC/,
    "SELECT firstname, lastname, phone_number, trust_points, points_frozen, is_active FROM members ORDER BY is_active DESC, lastname ASC, firstname ASC"
);

// 2. Modify searchMember to include is_active and remove AND is_active = 1
content = content.replace(
    /SELECT firstname, lastname, phone_number, trust_points, points_frozen \n            FROM members \n            WHERE \(phone_number LIKE \? OR lastname LIKE \?\) AND \(is_active = 1 OR is_active IS NULL\)/,
    "SELECT firstname, lastname, phone_number, trust_points, points_frozen, is_active \\n            FROM members \\n            WHERE (phone_number LIKE ? OR lastname LIKE ?) ORDER BY is_active DESC"
);

// 3. Add activateMember function
const activateMemberFunc = `
// POST /api/admin/activate-member
const activateMember = async (req, res) => {
    const { phone_number } = req.body;
    if (!phone_number) {
        return res.status(400).json({ success: false, error: 'phone_number is required' });
    }

    try {
        const [result] = await db.upbsPool.query(
            "UPDATE members SET is_active = 1 WHERE phone_number = ?",
            [phone_number]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Member not found' });
        }

        return res.json({ success: true, message: 'Member successfully reactivated!' });
    } catch (err) {
        console.error('Error in activateMember controller:', err);
        return res.status(500).json({ success: false, error: 'Database error reactivating member' });
    }
};
`;

content = content.replace(
    "// POST /api/admin/delete-bike",
    activateMemberFunc + "\n// POST /api/admin/delete-bike"
);

content = content.replace(
    "deleteMember,",
    "deleteMember,\n    activateMember,"
);

fs.writeFileSync('worker-api/controllers/adminController.js', content);
