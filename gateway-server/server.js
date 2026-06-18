// gateway-server/server.js

// Import required dependencies
const db = require('./db');
const axios = require('axios');
const { spawn } = require('child_process');

// Main polling function to check for new SMS messages
async function pollInbox() {
    try {
        // We want to select all columns (*) from the 'inbox' table 
        // ONLY where the message hasn't been processed yet.
        const [rows] = await db.query("SELECT * FROM inbox WHERE Processed='false'");

        for (const message of rows) {

            // Extract the sender's phone number and the decoded text from Gammu
            const phoneNumber = message.SenderNumber;
            const rawText = message.TextDecoded;

            // Normalize the input text to ensure reliable command matching
            const command = rawText.trim().toLowerCase();

            console.log(`Processing command '${command}' from ${phoneNumber}...`);

            try {
                // Verify user registration status with the Worker API before proceeding
                const checkResponse = await axios.post('http://localhost:3001/api/members/check', {
                    phone_number: phoneNumber
                });

                let endpoint = ''; // Stores the resolved Worker API route

                if (checkResponse.data.isRegistered) {
                    // Route matched commands to the corresponding Worker API endpoints
                    switch (command) {
                        case 'search': endpoint = '/search'; break;
                        case 'help': endpoint = '/help'; break;
                        case 'how': endpoint = '/how'; break;
                        case 'search all': endpoint = '/search-all'; break;
                        case 'locations': endpoint = '/locations'; break;
                        case 'usage': endpoint = '/usage'; break;
                        case 'borrow': endpoint = '/borrow'; break;
                        default: endpoint = '/invalid-command';
                    }
                } else {
                    // If they are not registered, route them here
                    endpoint = '/non-registered';
                }

                console.log(`Routing ${phoneNumber} to Worker API: ${endpoint}`);


                // Send the command to Worker API
                const workerResponse = await axios.post(`http://localhost:3001${endpoint}`, {
                    phone_number: phoneNumber,
                    command: command
                });

                // Extract the generated reply from the Worker API response
                const replyMessage = workerResponse.data.message || "Request processed successfully.";

                // Trigger Gammu hardware to dispatch the SMS reply
                await sendReply(phoneNumber, replyMessage);

                // Mark the message as processed in the database to prevent duplicate handling
                await db.query("UPDATE inbox SET Processed='true' WHERE ID=?", [message.ID]);
                console.log(`Message ${message.ID} marked as processed!`);


            } catch (apiError) {
                console.error(`Worker API is down or failed for ${phoneNumber}. We will try again later!`);
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
    return new Promise((resolve, reject) => {
        console.log(`Sending SMS to ${phoneNumber}: "${text}"`);

        // This runs the actual terminal command to the modem
        const gammu = spawn('gammu-smsd-inject', ['TEXT', phoneNumber, '-text', text]);

        gammu.on('close', (code) => {
            if (code === 0) {
                console.log(`SMS successfully sent to ${phoneNumber}`);
                resolve();
            } else {
                reject(new Error(`Gammu failed to send. Exit code ${code}`));
            }
        });
    });
}
