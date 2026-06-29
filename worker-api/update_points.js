require('dotenv').config();
const db = require('./db');

async function update() {
    try {
        await db.upbsPool.query(`UPDATE system_settings SET setting_value = '5' WHERE setting_name = 'honesty_reward'`);
        await db.upbsPool.query(`UPDATE system_settings SET setting_value = '10' WHERE setting_name = 'consistent_rider_reward'`);
        await db.upbsPool.query(`UPDATE system_settings SET setting_value = '15' WHERE setting_name = 'reward_honest_report'`);
        await db.upbsPool.query(`UPDATE system_settings SET setting_value = '30' WHERE setting_name = 'reward_community_volunteer'`);
        console.log("Points updated successfully in DB.");
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
update();
