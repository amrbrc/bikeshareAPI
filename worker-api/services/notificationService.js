/**
 * Sends a rich embed notification to a Discord channel via webhook.
 */
async function sendDiscordNotification(studentName, phoneNumber, bikeCode, imageUrl) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('[Notification] DISCORD_WEBHOOK_URL not configured. Skipping Discord alert.');
        return;
    }

    const payload = {
        embeds: [{
            title: "🔔 New Dispute Appeal Submitted",
            color: 8065299, // Crimson/maroon tone
            fields: [
                { name: "Student Name", value: studentName, inline: true },
                { name: "Phone Number", value: phoneNumber, inline: true },
                { name: "Bicycle Code", value: `Bike #${bikeCode}`, inline: true }
            ],
            image: { url: imageUrl },
            description: `A student has submitted an appeal photo for their frozen account. Please review and resolve this dispute in the UP Bikeshare Admin Dashboard.`,
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.error(`[Notification] Discord webhook returned status ${res.status}`);
        } else {
            console.log(`[Notification] Discord webhook alert sent successfully for Bike #${bikeCode}`);
        }
    } catch (err) {
        console.error('[Notification] Failed to send Discord webhook:', err.message);
    }
}

/**
 * Sends a notification when a bike is disputed (before the photo is uploaded).
 */
async function sendDisputeCreatedNotification(bikeCode, reporterName, reporterPhone, frozenName, frozenPhone) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log('[Notification] DISCORD_WEBHOOK_URL not configured. Skipping Discord warning.');
        return;
    }

    const payload = {
        embeds: [{
            title: "⚠️ New Dispute Flagged",
            color: 16753920, // Orange warning color
            fields: [
                { name: "Bicycle Code", value: `Bike #${bikeCode}`, inline: true },
                { name: "Reported By (Next Rider)", value: `${reporterName} (${reporterPhone})`, inline: true },
                { name: "Frozen Account (Prev Rider)", value: `${frozenName ? `${frozenName} (${frozenPhone})` : frozenPhone}`, inline: true }
            ],
            description: `Bike #${bikeCode} has been reported broken by the next user. The previous borrower's account has been frozen pending a Messenger appeal photo.`,
            timestamp: new Date().toISOString()
        }]
    };

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            console.error(`[Notification] Discord warning returned status ${res.status}`);
        } else {
            console.log(`[Notification] Discord dispute warning sent for Bike #${bikeCode}`);
        }
    } catch (err) {
        console.error('[Notification] Failed to send Discord warning:', err.message);
    }
}

module.exports = { sendDiscordNotification, sendDisputeCreatedNotification };
