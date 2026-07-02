const db = require('../db');

// Helper to send messages back to the user via Meta's Send API using built-in fetch
async function sendFbMessage(recipientPsid, messageText) {
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
        console.error('[FB Bot] Missing FB_PAGE_ACCESS_TOKEN environment variable.');
        return;
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient: { id: recipientPsid },
                message: { text: messageText }
            })
        });
        const result = await response.json();
        if (result.error) {
            console.error('[FB Bot] Send API error:', result.error);
        } else {
            console.log(`[FB Bot] Message sent to PSID ${recipientPsid}: "${messageText.substring(0, 30)}..."`);
        }
    } catch (err) {
        console.error('[FB Bot] Fetch error calling Send API:', err);
    }
}

// GET /api/webhook/facebook - Webhook verification
const verifyWebhook = (req, res) => {
    const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'upbs_secure_webhook_2026';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[FB Webhook] Verification successful!');
            return res.status(200).send(challenge);
        } else {
            console.warn('[FB Webhook] Verification failed. Invalid verify token.');
            return res.sendStatus(403);
        }
    }
    return res.sendStatus(400);
};

// POST /api/webhook/facebook - Incoming message handler
const handleWebhookEvent = async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        // Iterate over each entry - there may be multiple if batched
        for (const entry of body.entry) {
            if (!entry.messaging) continue;

            for (const webhookEvent of entry.messaging) {
                const senderPsid = webhookEvent.sender.id;

                // 1. Handle standard message events (text, attachments)
                if (webhookEvent.message) {
                    const message = webhookEvent.message;
                    if (message.text || message.attachments) {
                        try {
                            await processIncomingMessage(senderPsid, message);
                        } catch (err) {
                            console.error('[FB Bot] Error processing message:', err);
                            await sendFbMessage(senderPsid, 'Sorry, there was a system error processing your request. Please try again later.');
                        }
                    }
                }

                // 2. Handle postback events (Get Started, Ice Breakers, button clicks)
                if (webhookEvent.postback) {
                    const payload = webhookEvent.postback.payload;
                    if (payload) {
                        // Map the payload to text commands so it feeds into the existing state machine
                        const simulatedMessage = { text: payload };
                        try {
                            await processIncomingMessage(senderPsid, simulatedMessage);
                        } catch (err) {
                            console.error('[FB Bot] Error processing postback:', err);
                            await sendFbMessage(senderPsid, 'Sorry, there was a system error processing your request. Please try again later.');
                        }
                    }
                }
            }
        }
        return res.status(200).send('EVENT_RECEIVED');
    } else {
        return res.sendStatus(404);
    }
};

async function processIncomingMessage(psid, message) {
    const rawText = message.text ? message.text.trim() : '';
    const upperText = rawText.toUpperCase();

    // 1. Check if the user wants to reset or start over
    if (upperText === 'RESET' || upperText === 'START' || upperText === 'HELLO' || upperText === 'HI') {
        await db.upbsPool.query(
            'INSERT INTO fb_bot_sessions (psid, bot_state) VALUES (?, ?) ON DUPLICATE KEY UPDATE bot_state = ?, phone_number = NULL',
            [psid, 'AWAITING_PHONE', 'AWAITING_PHONE']
        );
        await sendFbMessage(
            psid,
            'Welcome to the UP Bikeshare Dispute Appeal Bot! 🚲\n\nTo begin, please reply with your registered phone number (e.g. +639XXXXXXXXX or 09XXXXXXXXX) to verify your account.'
        );
        return;
    }

    // 2. Fetch or initialize the user's session
    const [sessions] = await db.upbsPool.query('SELECT * FROM fb_bot_sessions WHERE psid = ?', [psid]);
    
    let session;
    if (sessions.length === 0) {
        // Create new session
        await db.upbsPool.query('INSERT INTO fb_bot_sessions (psid, bot_state) VALUES (?, ?)', [psid, 'AWAITING_PHONE']);
        session = { psid, bot_state: 'AWAITING_PHONE', phone_number: null };
        await sendFbMessage(
            psid,
            'Welcome to the UP Bikeshare Dispute Appeal Bot! 🚲\n\nTo begin, please reply with your registered phone number (e.g. +639XXXXXXXXX or 09XXXXXXXXX) to verify your account.'
        );
        return;
    } else {
        session = sessions[0];
    }

    // 3. State Machine logic
    if (session.bot_state === 'AWAITING_PHONE') {
        // We expect a phone number input
        if (!rawText) {
            await sendFbMessage(psid, 'Please enter your registered phone number to verify your account.');
            return;
        }

        // Normalize phone number
        let normalizedPhone = rawText;
        if (normalizedPhone.startsWith('09') && normalizedPhone.length === 11) {
            normalizedPhone = '+63' + normalizedPhone.substring(1);
        } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
            normalizedPhone = '+63' + normalizedPhone;
        } else if (normalizedPhone.startsWith('639') && normalizedPhone.length === 12) {
            normalizedPhone = '+' + normalizedPhone;
        }

        // Validate member exists and is active
        const [members] = await db.upbsPool.query(
            'SELECT firstname, lastname, phone_number, points_frozen FROM members WHERE phone_number = ? AND is_active = 1',
            [normalizedPhone]
        );

        if (members.length === 0) {
            await sendFbMessage(psid, `We couldn't find a registered member with the phone number "${rawText}". Please make sure you typed it correctly.`);
            return;
        }

        const member = members[0];

        if (member.points_frozen !== 1) {
            await sendFbMessage(
                psid,
                `Hello ${member.firstname}! Your account (associated with ${normalizedPhone}) is currently in good standing (not frozen). You do not need to file an appeal. If you have any questions, feel free to contact us!`
            );
            return;
        }

        // Find the disputed bicycle code and the last trip of this member
        const [disputes] = await db.upbsPool.query(
            `SELECT bc.bicycle_code, bh.id AS history_id
             FROM bicycle_codes bc
             JOIN bicycle_history bh ON bc.bicycle_code = bh.bicycle_code
             WHERE bc.condition_status = 'Disputed' 
               AND (bh.borrower_phone = ? OR bh.borrowed_by = ?)
             ORDER BY bh.borrowed_at DESC LIMIT 1`,
            [normalizedPhone, `${member.firstname} ${member.lastname}`]
        );

        if (disputes.length === 0) {
            await sendFbMessage(
                psid,
                `Hello ${member.firstname}. Your points are frozen, but we couldn't automatically locate an active dispute ticket for your last trip. Please contact page administrators directly for manual resolution.`
            );
            return;
        }

        const dispute = disputes[0];

        // Save phone number and transit state to AWAITING_PHOTO
        await db.upbsPool.query(
            'UPDATE fb_bot_sessions SET phone_number = ?, bot_state = ? WHERE psid = ?',
            [normalizedPhone, 'AWAITING_PHOTO', psid]
        );

        await sendFbMessage(
            psid,
            `Account verified: ${member.firstname} ${member.lastname}.\n\nWe found a pending dispute on Bike #${dispute.bicycle_code}.\n\nPlease upload/send a clear photo of the bike showing its condition and lock to support your appeal. (Or if you prefer, you may also visit the UP Bikeshare Admin Hub to settle in person.)`
        );

    } else if (session.bot_state === 'AWAITING_PHOTO') {
        // We expect an image attachment
        let imageUrl = null;
        if (message.attachments && message.attachments.length > 0) {
            const imageAttachment = message.attachments.find(att => att.type === 'image');
            if (imageAttachment && imageAttachment.payload && imageAttachment.payload.url) {
                imageUrl = imageAttachment.payload.url;
            }
        }

        if (!imageUrl) {
            await sendFbMessage(psid, 'To appeal, please upload/send a photo of the bicycle. Note: If you want to restart verification, reply with "RESET".');
            return;
        }

        // Look up member and their active dispute
        const [members] = await db.upbsPool.query(
            'SELECT firstname, lastname FROM members WHERE phone_number = ? AND is_active = 1',
            [session.phone_number]
        );

        if (members.length === 0) {
            await sendFbMessage(psid, 'Session error: Member record not found. Please reply "RESET" to verify again.');
            return;
        }

        const member = members[0];

        const [disputes] = await db.upbsPool.query(
            `SELECT bc.bicycle_code, bh.id AS history_id
             FROM bicycle_codes bc
             JOIN bicycle_history bh ON bc.bicycle_code = bh.bicycle_code
             WHERE bc.condition_status = 'Disputed' 
               AND (bh.borrower_phone = ? OR bh.borrowed_by = ?)
             ORDER BY bh.borrowed_at DESC LIMIT 1`,
            [session.phone_number, `${member.firstname} ${member.lastname}`]
        );

        if (disputes.length === 0) {
            await sendFbMessage(psid, 'We could not find an active dispute ticket for your account anymore. It might have already been resolved. Type "RESET" to check again.');
            return;
        }

        const dispute = disputes[0];

        // Save image URL to both the bike code and history record
        await db.upbsPool.query('UPDATE bicycle_codes SET dispute_image_url = ? WHERE bicycle_code = ?', [imageUrl, dispute.bicycle_code]);
        await db.upbsPool.query('UPDATE bicycle_history SET dispute_image_url = ? WHERE id = ?', [imageUrl, dispute.history_id]);

        // Mark session as COMPLETED
        await db.upbsPool.query('UPDATE fb_bot_sessions SET bot_state = ? WHERE psid = ?', ['COMPLETED', psid]);

        await sendFbMessage(
            psid,
            `Thank you! Your dispute appeal photo has been successfully uploaded and linked to Bike #${dispute.bicycle_code}.\n\nOur administrators will review the evidence shortly. You will receive an SMS notification once a decision is made.`
        );

    } else if (session.bot_state === 'COMPLETED') {
        await sendFbMessage(
            psid,
            'Your appeal photo has already been submitted and is pending administrator review. If you need to submit a new photo, please reply with "RESET" to start over.'
        );
    }
}

module.exports = {
    verifyWebhook,
    handleWebhookEvent
};
