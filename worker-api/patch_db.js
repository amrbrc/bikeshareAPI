const db = require('./db.js');

async function patch() {
    console.log("Connecting to database...");
    const pool = db.upbsPool;
    try {
        await pool.query("ALTER TABLE members ALTER leaderboard_points SET DEFAULT 100");
        console.log("Successfully changed default value of leaderboard_points to 100.");
        
        const [rows] = await pool.query("SELECT * FROM members WHERE leaderboard_points < 20 AND trust_points >= 100 AND is_active = 1");
        if (rows.length > 0) {
            console.log(`Found ${rows.length} members with bugged leaderboard points. Fixing...`);
            for (let member of rows) {
                // Approximate their true leaderboard points by setting it equal to their trust points.
                await pool.query("UPDATE members SET leaderboard_points = trust_points WHERE id = ?", [member.id]);
                console.log(`Fixed member ${member.firstname} ${member.lastname}`);
            }
        }
    } catch (err) {
        console.error("Failed to alter table:", err);
    } finally {
        process.exit(0);
    }
}

patch();
