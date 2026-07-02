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

// Main Event Handler Function (POST)
const handleWebhookEvent = async (req, res) => {
    const body = req.body;

    // Check if this is an event from a page subscription
    if (body.object === 'page') {
        
        // Iterate over the messages (Facebook can send them in batches)
        body.entry.forEach(function(entry) {
            if (!entry.messaging) return;
            
            entry.messaging.forEach(function(webhook_event) {
                console.log("📩 --- NEW MESSAGE RECEIVED FROM FACEBOOK --- 📩");
                console.log("Sender ID (PSID):", webhook_event.sender.id);
                
                if (webhook_event.message) {
                    if (webhook_event.message.text) {
                        console.log("Message Text:", webhook_event.message.text);
                    }
                    if (webhook_event.message.attachments) {
                        console.log("Message Attachments:", JSON.stringify(webhook_event.message.attachments, null, 2));
                    }
                }
            });
        });

        // ALWAYS return a '200 OK' response to let Facebook know you got it
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
};

module.exports = { 
    verifyWebhook, 
    handleWebhookEvent 
};
