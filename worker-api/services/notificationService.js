const nodemailer = require('nodemailer');

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
 * Sends an HTML email alert to the admin inbox via SMTP.
 */
async function sendEmailNotification(studentName, phoneNumber, bikeCode, imageUrl) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_TO } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_TO) {
        console.log('[Notification] SMTP credentials are not fully configured. Skipping email alert.');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT) || 587,
            secure: Number(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 10000
        });

        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #7b1113; border-bottom: 2px solid #7b1113; padding-bottom: 8px; margin-top: 0;">🔔 Dispute Appeal Submitted</h2>
                <p>Hello Admin Team,</p>
                <p>A new dispute appeal has been submitted for audit review:</p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <tr>
                        <td style="padding: 6px; font-weight: bold; width: 140px; border-bottom: 1px solid #eee;">Student Name:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #eee;">${studentName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #eee;">Phone Number:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #eee;">${phoneNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 6px; font-weight: bold; border-bottom: 1px solid #eee;">Bicycle:</td>
                        <td style="padding: 6px; border-bottom: 1px solid #eee;">Bike #${bikeCode}</td>
                    </tr>
                </table>
                <p><strong>Appeal Photo:</strong></p>
                <div style="margin-bottom: 20px;">
                    <a href="${imageUrl}" target="_blank">
                        <img src="${imageUrl}" style="max-width: 100%; max-height: 250px; border: 1px solid #ccc; border-radius: 6px; object-fit: cover;" alt="Appeal proof" />
                    </a>
                </div>
                <p style="margin-top: 20px;">
                    <a href="https://upbs-worker.onrender.com/admin-dashboard.html" style="background-color: #7b1113; color: white; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Open Admin Dashboard</a>
                </p>
            </div>
        `;

        await transporter.sendMail({
            from: `"UP Bikeshare System" <${SMTP_USER}>`,
            to: SMTP_TO,
            subject: `🔔 New Dispute Appeal: Bike #${bikeCode} by ${studentName}`,
            html: htmlContent
        });
        console.log(`[Notification] Admin email alert sent successfully to ${SMTP_TO}`);
    } catch (err) {
        console.error('[Notification] Failed to send email alert:', err.message);
    }
}

module.exports = { sendDiscordNotification, sendEmailNotification };
