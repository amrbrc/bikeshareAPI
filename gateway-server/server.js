// gateway-server/server.js

// Import required dependencies
const db = require('./db');
const axios = require('axios');
const { spawn } = require('child_process');

const WORKER_URL = process.env.WORKER_URL || 'http://localhost:3001';

// Main polling function to check for new SMS messages
async function pollInbox() {
    try {
        // Select all columns from 'inbox' where Processed is 'false'
        const [rows] = await db.query("SELECT * FROM inbox WHERE Processed='false'");

        for (const message of rows) {
            const smsSender = message.SenderNumber;
            const rawText = message.TextDecoded;
            const messageId = message.ID;

            if (!rawText) {
                console.error(`Empty message received from Sender: ${smsSender}, Message ID: ${messageId}`);
                await db.query("UPDATE inbox SET Processed='true' WHERE ID=?", [messageId]);
                continue;
            }

            const smsMessage = rawText.trim().toLowerCase();
            console.log(`Processing command '${smsMessage}' from ${smsSender} (ID: ${messageId})...`);

            try {
                // 1. Verify user registration status with the Worker API before proceeding
                const checkResponse = await axios.post(`${WORKER_URL}/api/members/check`, {
                    phone_number: smsSender
                });

                const isRegistered = checkResponse.data.registered;

                if (!isRegistered) {
                    console.log(`Sender ${smsSender} is not registered. Routing to non-registered fallback.`);
                    // Send to non-registered fallback
                    const workerResponse = await axios.post(`${WORKER_URL}/api/non-registered`, {
                        smsSender,
                        messageId
                    });
                    const replyMessage = workerResponse.data.reply || "Sorry, you are not registered with UP Bike Share.";
                    await sendReply(smsSender, replyMessage);
                    await db.query("UPDATE inbox SET Processed='true' WHERE ID=?", [messageId]);
                    continue;
                }

                // 2. Parse command using regex and route to correct endpoints
                let endpoint = '';
                let payload = { smsSender, messageId };

                // Match regexes (mimicking monolith logic)
                const searchMatch = smsMessage.match(/^search\s+(\w+)$/i);
                const usageMatch = smsMessage.match(/^usage\s+(\w+)$/i);
                const borrowMatch = smsMessage.match(/^(\w+)\s+(\w+)\s+to\s+(\w+)$/i);

                if (smsMessage === 'search all') {
                    endpoint = '/api/search-all';
                } else if (searchMatch) {
                    endpoint = '/api/search';
                    payload.bicycleCode = searchMatch[1].toLowerCase();
                } else if (smsMessage === 'bikeshare help') {
                    endpoint = '/api/help';
                } else if (smsMessage === 'how') {
                    endpoint = '/api/how';
                } else if (smsMessage === 'locations') {
                    endpoint = '/api/locations';
                } else if (usageMatch) {
                    endpoint = '/api/usage';
                    payload.bicycleCode = usageMatch[1].toLowerCase();
                } else if (borrowMatch) {
                    endpoint = '/api/borrow';
                    payload.bicycleCode = borrowMatch[1].toLowerCase();
                    payload.fromLocation = borrowMatch[2].toLowerCase();
                    payload.toLocation = borrowMatch[3].toLowerCase();
                } else {
                    endpoint = '/api/invalid-command';
                }

                console.log(`Routing command to Worker API: ${endpoint} with payload:`, payload);

                // 3. Send payload to Worker API
                const workerResponse = await axios.post(`${WORKER_URL}${endpoint}`, payload);

                // 4. Extract reply/replies and send
                if (endpoint === '/api/borrow' && workerResponse.data.invalidBicycle) {
                    // Fallback to invalid command
                    console.log(`Borrow failed (invalid bicycle). Routing to invalid-command fallback.`);
                    const fallbackResponse = await axios.post(`${WORKER_URL}/api/invalid-command`, {
                        smsSender,
                        messageId
                    });
                    const replyMessage = fallbackResponse.data.reply || 'Invalid Command. Send "bikeshare help" for list of available commands.';
                    await sendReply(smsSender, replyMessage);
                } else if (endpoint === '/api/usage') {
                    // Usage endpoint returns `{ replies: [...] }`
                    const replies = workerResponse.data.replies || [];
                    for (const reply of replies) {
                        await sendReply(smsSender, reply);
                    }
                } else {
                    // Other endpoints return `{ reply: "..." }`
                    const replyMessage = workerResponse.data.reply || "Request processed successfully.";
                    await sendReply(smsSender, replyMessage);
                }

                // 5. Mark the message as processed in the database
                await db.query("UPDATE inbox SET Processed='true' WHERE ID=?", [messageId]);
                console.log(`Message ${messageId} marked as processed!`);

            } catch (apiError) {
                console.error(`Worker API error or failed for ${smsSender}:`, apiError.message);
                // We do NOT mark the message as processed, so the loop will try again later!
            }
        }
    } catch (error) {
        console.error("Database polling error:", error);
    }
}

// Initialize the server polling loop (runs every 200 milliseconds)
console.log("Gateway Server started. Polling for messages...");
setInterval(pollInbox, 200);

// Helper function to send SMS via Gammu hardware
function sendReply(phoneNumber, text) {
    return new Promise((resolve) => {
        console.log(`Sending SMS to ${phoneNumber}: "${text}"`);

        // This runs the actual terminal command to the modem
        const gammu = spawn('gammu-smsd-inject', ['TEXT', phoneNumber, '-text', text]);

        gammu.on('close', (code) => {
            if (code === 0) {
                console.log(`SMS successfully sent to ${phoneNumber}`);
            } else {
                console.error(`Gammu failed to send. Exit code ${code}`);
            }
            resolve(); // Always resolve to avoid blocking the queue indefinitely
        });
    });
}
