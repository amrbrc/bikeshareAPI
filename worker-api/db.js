const mysql = require('mysql2/promise');

const upbsPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'upbs2024',
    password: process.env.DB_PASSWORD || 'upbs2024',
    database: 'upbs',
    connectionLimit: 10
});

module.exports = { upbsPool };