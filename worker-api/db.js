const mysql = require('mysql2/promise');

const poolConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'upbs2024',
    password: process.env.DB_PASSWORD || 'upbs2024',
    database: process.env.DB_NAME || 'upbs',
    connectionLimit: 10
};

// Automatically enable SSL if connecting to an Aiven database or if DB_SSL is set
if (process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' || (process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com'))) {
    poolConfig.ssl = { rejectUnauthorized: false };
    console.log("[DB] SSL connection enabled for database pool.");
}

const upbsPool = mysql.createPool(poolConfig);


async function runMigrations() {
    try {
        await upbsPool.query("ALTER TABLE members ADD COLUMN leaderboard_points INT DEFAULT 100");
        console.log("[DB] Added leaderboard_points column to members.");
    } catch(e) {
        if(e.code !== 'ER_DUP_FIELDNAME') console.error("[DB] Migration error:", e.message);
    }
    try {
        await upbsPool.query("ALTER TABLE members ALTER leaderboard_points SET DEFAULT 100");
        // Fix bugged members who registered while default was 0 and earned small points
        await upbsPool.query("UPDATE members SET leaderboard_points = trust_points WHERE leaderboard_points < 20 AND trust_points >= 100 AND is_active = 1");
        await upbsPool.query("UPDATE members SET leaderboard_points = trust_points WHERE leaderboard_points = 0");
    } catch (e) {
        console.error("[DB] Migration fix error:", e.message);
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
    try {
        await upbsPool.query(`
            CREATE TABLE IF NOT EXISTS outbound_sms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sent_at DATETIME DEFAULT NULL
            )
        `);
        console.log("[DB] Ensured outbound_sms queue table exists.");
    } catch(e) {
        console.error("[DB] Migration error outbound_sms:", e.message);
    }
    try {
        await upbsPool.query(`
            INSERT IGNORE INTO system_settings (setting_name, setting_value, description)
            VALUES ('reward_delivered_bike', '5', 'Points rewarded to a user who delivers a broken bike to a maintenance hub.')
        `);
        console.log("[DB] Ensured reward_delivered_bike setting exists.");
    } catch(e) {
        console.error("[DB] Migration error reward_delivered_bike setting:", e.message);
    }
    try {
        await upbsPool.query("ALTER TABLE bicycle_codes ADD COLUMN dispute_image_url VARCHAR(512) DEFAULT NULL");
        console.log("[DB] Added dispute_image_url column to bicycle_codes.");
    } catch(e) {
        if(e.code !== 'ER_DUP_FIELDNAME') console.error("[DB] Migration error dispute_image_url (bicycle_codes):", e.message);
    }
    try {
        await upbsPool.query("ALTER TABLE bicycle_history ADD COLUMN dispute_image_url VARCHAR(512) DEFAULT NULL");
        console.log("[DB] Added dispute_image_url column to bicycle_history.");
    } catch(e) {
        if(e.code !== 'ER_DUP_FIELDNAME') console.error("[DB] Migration error dispute_image_url (bicycle_history):", e.message);
    }
    try {
        await upbsPool.query(`
            CREATE TABLE IF NOT EXISTS fb_bot_sessions (
                psid VARCHAR(100) PRIMARY KEY,
                phone_number VARCHAR(20) DEFAULT NULL,
                bot_state VARCHAR(50) NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("[DB] Ensured fb_bot_sessions table exists.");
    } catch(e) {
        console.error("[DB] Migration error fb_bot_sessions table:", e.message);
    }
}
runMigrations();

module.exports = { upbsPool };