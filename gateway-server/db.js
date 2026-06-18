// gateway-server/db.js

// Import the promise-based mysql2 library
const mysql = require('mysql2/promise');

// Establish a connection pool to the hardware database
const smsdPool = mysql.createPool({
    host: '192.168.1.10',
    user: 'upbs2024',
    password: 'upbs2024',
    database: 'smsd',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export the pool for use across the application
module.exports = smsdPool;
