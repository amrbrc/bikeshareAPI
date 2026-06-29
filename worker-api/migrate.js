require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log("Checking members table...");
        await db.upbsPool.query("ALTER TABLE members ADD COLUMN leaderboard_points INT DEFAULT 0");
        console.log("Added leaderboard_points.");
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column leaderboard_points already exists.");
        } else {
            console.error("Error adding column:", e.message);
        }
    }

    try {
        await db.upbsPool.query("UPDATE members SET leaderboard_points = trust_points WHERE leaderboard_points = 0");
        console.log("Initialized leaderboard_points.");
    } catch(e) {
        console.error(e);
    }

    try {
        await db.upbsPool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(50) PRIMARY KEY,
                setting_value VARCHAR(255)
            )
        `);
        console.log("Created app_settings table.");
        
        const lastReset = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await db.upbsPool.query("INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('leaderboard_last_reset', ?)", [lastReset]);
        console.log("Initialized reset date.");

    } catch(e) {
        console.error("Error creating settings table:", e.message);
    }
    process.exit();
}
migrate();
