const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];

    if (token !== 'admin-logged-in-token') {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    next();
};

module.exports = authMiddleware;
