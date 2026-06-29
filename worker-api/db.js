const mysql = require('mysql2/promise');

const upbsPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'upbs2024',
    password: process.env.DB_PASSWORD || 'upbs2024',
    database: 'upbs',
    connectionLimit: 10
});


async function runMigrations() {
    try {
        await upbsPool.query("ALTER TABLE members ADD COLUMN leaderboard_points INT DEFAULT 0");
        console.log("[DB] Added leaderboard_points column to members.");
        await upbsPool.query("UPDATE members SET leaderboard_points = trust_points WHERE leaderboard_points = 0");
    } catch(e) {
        if(e.code !== 'ER_DUP_FIELDNAME') console.error("[DB] Migration error:", e.message);
    }
    try {
        await upbsPool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value VARCHAR(255)
            )
        `);
        const lastReset = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await upbsPool.query("INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('leaderboard_last_reset', ?)", [lastReset]);
    } catch(e) {
        console.error("[DB] Migration error settings:", e.message);
    }
}
runMigrations();

module.exports = { upbsPool };