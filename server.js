const db = require('./db');
const { spawn } = require('child_process');


// ========================= Function for: search [bike code] =========================
/**
 * Helper function to retrieve and send the current location of a bicycle
 * @param {string} smsSender - The sender's phone number
 * @param {string} bicycleCode - The bicycle code to retrieve location for
 * @param {number} messageId - The ID of the message
 * @param {object} smsdConn - Connection to smsd database
 * @param {object} upbsConn - Connection to upbs database
 */
async function searchBicycle(smsSender, bicycleCode, messageId, smsdConn, upbsConn) {
    try {
        // Retrieve member information
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ?
        `;
        const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            const noMemberReply = `Sorry. You are not registered with UP Bike Share.`;
            await sendReply(smsSender, noMemberReply, messageId, smsdConn);
            return;
        }

        // Correctly retrieve lastname, firstname, and phone_number from the database
        const { lastname, firstname, phone_number } = memberRecords[0];

        // Retrieve the location of the bicycle
        const locationQuery = `
            SELECT new_location
            FROM bicycle_codes
            WHERE bicycle_code = ?
        `;
        const locationRecords = await upbsConn.query(locationQuery, [bicycleCode]);

        if (locationRecords.length === 0) {
            const noBicycleReply = `Bicycle code ${bicycleCode} not found.`;
            await sendReply(smsSender, noBicycleReply, messageId, smsdConn);
            return;
        }

        const newLocation = locationRecords[0].new_location;
        const replyMessage = `At the moment, the current location of ${bicycleCode} is at ${newLocation}.`;
        await sendReply(smsSender, replyMessage, messageId, smsdConn);
        
        // Log the search request with member info
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await upbsConn.query(logQuery, [
            lastname,
            firstname,
            phone_number,  // Ensure phone_number is logged
            smsSender,
            'Search Request',
            messageId
        ]);

    } catch (err) {
        console.error('Error retrieving bicycle location:', err);
        const errorReply = "Error retrieving bicycle location. Please try again later.";
        await sendReply(smsSender, errorReply, messageId, smsdConn);
    }
}
// ========================= End of searchBicycle =========================


// Helper function to validate location
async function validateLocation(location, upbsConn) {
    try {
        const locationQuery = "SELECT * FROM locations WHERE location_name = ?";
        const result = await upbsConn.query(locationQuery, [location]);
        return result.length > 0;
    } catch (err) {
        console.error('Error validating location:', err);
        return false;
    }
}

// Helper function to mark a message as processed
async function markAsProcessed(smsdConn, messageId) {
    try {
        const updateInboxQuery = "UPDATE inbox SET Processed = 'true' WHERE ID = ?";
        await smsdConn.query(updateInboxQuery, [messageId]);
        console.log(`Message ID ${messageId} marked as processed.`);
    } catch (err) {
        console.error('Error marking message as processed:', err);
    }
}

// Handle invalid command
async function handleInvalidCommand(smsSender, messageId, smsdConn) {
    try {
        const checkInvalidCommandQuery = "SELECT * FROM invalid_command_senders WHERE phone_number = ? AND message_id = ?";
        const existingInvalidCommand = await db.upbsPool.query(checkInvalidCommandQuery, [smsSender, messageId]);

        if (existingInvalidCommand.length === 0) {
            const invalidCommandReply = 'Invalid Command. Send "bikeshare help" for list of available commands.';
            await sendReply(smsSender, invalidCommandReply, messageId, smsdConn);

            const insertInvalidCommandQuery = "INSERT INTO invalid_command_senders (phone_number, message_id) VALUES (?, ?)";
            await db.upbsPool.query(insertInvalidCommandQuery, [smsSender, messageId]);
        }
    } catch (err) {
        console.error('Error in handleInvalidCommand:', err);
    }
}

// Handle non-registered sender for borrowing
async function handleNonRegisteredSender(smsSender, messageId, smsdConn) {
    try {
        const checkNonRegisteredQuery = "SELECT * FROM non_registered_senders WHERE phone_number = ? AND message_id = ?";
        const existingNonRegistered = await db.upbsPool.query(checkNonRegisteredQuery, [smsSender, messageId]);

        if (existingNonRegistered.length === 0) {
            const nonRegisteredReply = "Sorry, you are not registered with UP Bike Share.";
            await sendReply(smsSender, nonRegisteredReply, messageId, smsdConn);

            const insertNonRegisteredQuery = "INSERT INTO non_registered_senders (phone_number, message_id) VALUES (?, ?)";
            await db.upbsPool.query(insertNonRegisteredQuery, [smsSender, messageId]);
        } else {
            console.log(`Sender ${smsSender} already received a reply for message ID ${messageId}`);
        }
    } catch (err) {
        console.error('Error in handleNonRegisteredSender:', err);
    }
}

// Function to send a reply via Gammu
async function sendReply(smsSender, message, messageId, smsdConn) {
    const gammu = spawn('gammu-smsd-inject', ['TEXT', `${smsSender}`, '-text', message]);

    gammu.stdout.on('data', function (data) {
        console.log(`Gammu STDOUT: ${data.toString()}`);
    });

    gammu.stderr.on('data', function (err) {
        console.error(`Gammu STDERR: ${err.toString()}`);
    });

    gammu.on('close', async function (code) {
        console.log(`Gammu process exited with code ${code} for Sender: ${smsSender}`);

        if (smsdConn && messageId) {
            try {
                const updateInboxQuery = "UPDATE inbox SET Processed = 'true' WHERE ID = ?";
                await smsdConn.query(updateInboxQuery, [messageId]);
                console.log(`Message ID ${messageId} marked as processed.`);
            } catch (err) {
                console.error('Error updating inbox after Gammu reply:', err);
            }
        }
    });
}

// Function to log messages to Logs table
async function logMessage(user, smsSender, messageId, requestType, upbsConn) {
    const logQuery = `
        INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
        VALUES (?, ?, ?, ?, NOW(), ?, ?)
    `;
    try {
        await upbsConn.query(logQuery, [
            user.lastname || null,
            user.firstname || null,
            user.phone_number || null,
            smsSender,
            requestType,
            messageId
        ]);
        console.log('Message logged successfully.');
    } catch (err) {
        console.error('Error inserting into Logs:', err);
    }
}



// ========================= Function for: usage [bike code]=========================
/**
 * Helper function to retrieve and send bicycle usage history
 * @param {string} smsSender - The sender's phone number
 * @param {string} bicycleCode - The bicycle code to retrieve history for
 * @param {number} messageId - The ID of the message
 * @param {object} smsdConn - Connection to smsd database
 * @param {object} upbsConn - Connection to upbs database
 */
async function sendBicycleUsage(smsSender, bicycleCode, messageId, smsdConn, upbsConn) {
    try {
        // Retrieve member information
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ?
        `;
        const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            const noMemberReply = `Sorry, you are not registered with UP Bike Share.`;
            await sendReply(smsSender, noMemberReply, messageId, smsdConn);
            return;
        }

        // Destructure member info
        const { lastname, firstname, phone_number } = memberRecords[0];

        // Retrieve bicycle usage history
        const historyQuery = `
            SELECT previous_location, new_location, borrowed_by, borrowed_at
            FROM bicycle_history
            WHERE bicycle_code = ?
            ORDER BY borrowed_at DESC
            LIMIT 1
        `;
        const historyRecords = await upbsConn.query(historyQuery, [bicycleCode]);

        if (historyRecords.length === 0) {
            const noHistoryReply = `No usage history found for bicycle code ${bicycleCode}.`;
            await sendReply(smsSender, noHistoryReply, messageId, smsdConn);
            return;
        }

        // Format the history into a readable message
        let historyMessage = `Usage History for Bicycle ${bicycleCode}:\n`;
        historyRecords.forEach((record, index) => {
            const borrowedAt = new Date(record.borrowed_at).toLocaleString(); // Format the date and time
            historyMessage += `${index + 1}. From: ${record.previous_location} To: ${record.new_location} | By: ${record.borrowed_by} | At: ${borrowedAt}\n`;
        });

        // Ensure the message does not exceed typical SMS character limits (160 characters)
        if (historyMessage.length > 160) {
            // Split into multiple messages if necessary
            const messages = [];
            let currentMessage = '';
            historyRecords.forEach((record, index) => {
                const borrowedAt = new Date(record.borrowed_at).toLocaleString();
                const entry = `${index + 1}. From: ${record.previous_location} To: ${record.new_location} | By: ${record.borrowed_by} | At: ${borrowedAt}\n`;
                if ((currentMessage + entry).length > 160) {
                    messages.push(currentMessage);
                    currentMessage = entry;
                } else {
                    currentMessage += entry;
                }
            });
            if (currentMessage) messages.push(currentMessage);

            for (const msg of messages) {
                await sendReply(smsSender, msg, messageId, smsdConn);
            }
        } else {
            await sendReply(smsSender, historyMessage, messageId, smsdConn);
        }

        // Log the usage request with member info
        const logQuery = `
            INSERT INTO Logs (LastName, FirstName, MobileNumber, SenderNumber, DateTime, Request, MessageID) 
            VALUES (?, ?, ?, ?, NOW(), ?, ?)
        `;
        await upbsConn.query(logQuery, [
            lastname,
            firstname,
            phone_number,
            smsSender,
            'Usage Request',
            messageId
        ]);

    } catch (err) {
        console.error('Error retrieving bicycle usage history:', err);
        const errorReply = "Error retrieving bicycle usage history. Please try again later.";
        await sendReply(smsSender, errorReply, messageId, smsdConn);
    }
}
// ========================= End of sendBicycleUsage =========================



// Main function to check inbox and process SMS
async function checkInbox() {
    let smsdConn;
    try {
        smsdConn = await db.smsdPool.getConnection();
        const rows = await smsdConn.query("SELECT * FROM inbox WHERE Processed='false'");

        for (const row of rows) {
            const smsSender = row.SenderNumber;
            const smsMessageRaw = row.TextDecoded;

            if (!smsMessageRaw) {
                console.error(`Empty message received from Sender: ${smsSender}, Message ID: ${row.ID}`);
                await markAsProcessed(smsdConn, row.ID);
                continue;
            }

            const smsMessage = smsMessageRaw.trim().toLowerCase(); // Normalize the message
            console.log(`Sender: ${smsSender}`);
            console.log(`Message: ${smsMessage}`);

            // Initialize variables for logging
            let requestType = '';
            let user = null;

            // Connect to upbs database to check for registered member
            let upbsConn;
            try {
                upbsConn = await db.upbsPool.getConnection();
                const memberQuery = "SELECT * FROM members WHERE phone_number = ?";
                const members = await upbsConn.query(memberQuery, [smsSender]);

                if (members.length > 0) {
                    // Sender is a registered member
                    user = members[0];
                }
            } catch (err) {
                console.error('Error fetching member details:', err);
            }


// ========================= Condition for: "search all" =========================
const searchMatch = smsMessage.match(/^search\s+(\w+)$/i);
if (searchMatch && smsMessage !== 'search all') {
    const bicycleCode = searchMatch[1].toLowerCase();

    console.log(`Search Command Received for Bicycle Code: ${bicycleCode}`);

    // Check if the sender is a registered member
    const memberQuery = `
        SELECT lastname, firstname, phone_number
        FROM members
        WHERE phone_number = ?
    `;
    const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

    if (memberRecords.length === 0) {
        const noMemberReply = `Sorry. You are not registered with UP Bike Share.`;
        await sendReply(smsSender, noMemberReply, row.ID, smsdConn); // Reply to sender
        await markAsProcessed(smsdConn, row.ID); // Mark the message as processed
        if (upbsConn) upbsConn.release();
        continue; // Skip further processing after handling this
    }

    // Call the search function to find the bicycle location
    await searchBicycle(smsSender, bicycleCode, row.ID, smsdConn, upbsConn);

    // Mark inbox as processed
    await markAsProcessed(smsdConn, row.ID);
    if (upbsConn) upbsConn.release();
    continue; // Skip further processing after handling search command
}

// ========================= End of the "search all" condition =========================



// ========================= Function for: "bikeshare help" command =========================
if (smsMessage === 'bikeshare help') {
    const instructions = 'Commands: 1. bike code <from> to <destination> | 2. locations | 3. usage [bike code] | 4. search [bldg] | 5. search [bike code] | 6. search all';

    // Check if the sender is a registered member
    const memberQuery = `
        SELECT lastname, firstname, phone_number
        FROM members
        WHERE phone_number = ?
    `;
    const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

    if (memberRecords.length === 0) {
        const noMemberReply = `Sorry. You are not registered with UP Bike Share.`;
        await sendReply(smsSender, noMemberReply, row.ID, smsdConn); // Reply to sender
        await markAsProcessed(smsdConn, row.ID); // Mark the message as processed
        if (upbsConn) upbsConn.release();
        continue; // Skip further processing
    }

    // If the sender is a registered member, proceed with help instructions
    await sendReply(smsSender, instructions, row.ID, smsdConn);
    const requestType = 'Bikeshare help';

    // Log the 'help' request with member details
    const { lastname, firstname, phone_number } = memberRecords[0];
    await logMessage({ lastname, firstname, phone_number }, smsSender, row.ID, requestType, upbsConn);

    // Mark as processed and release the connection
    await markAsProcessed(smsdConn, row.ID);
    if (upbsConn) upbsConn.release();
    continue; // Skip further processing for 'bikeshare help' command
}

// ========================= End of the "bikeshare help" command =========================


// ========================= Function for: "how" command =========================
if (smsMessage === 'how') {
    // Check if the sender is a registered member
    const memberQuery = `
        SELECT lastname, firstname, phone_number
        FROM members
        WHERE phone_number = ?
    `;
    const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

    if (memberRecords.length === 0) {
        const noMemberReply = `Sorry. You are not registered with UP Bike Share.`;
        await sendReply(smsSender, noMemberReply, row.ID, smsdConn); // Reply to sender
        await markAsProcessed(smsdConn, row.ID); // Mark the message as processed
        if (upbsConn) upbsConn.release();
        continue; // Skip further processing
    }

    // If the sender is a registered member, proceed with sending instructions
    const instructions = 'Use the format: <bicycle_code> <previous_location> to <new_location>. Example: 1 eee to vinzons';
    await sendReply(smsSender, instructions, row.ID, smsdConn);
    const requestType = 'How to Borrow';

    // Log the 'how' request with member details
    const { lastname, firstname, phone_number } = memberRecords[0];
    await logMessage({ lastname, firstname, phone_number }, smsSender, row.ID, requestType, upbsConn);

    // Mark as processed and release the connection
    await markAsProcessed(smsdConn, row.ID);
    if (upbsConn) upbsConn.release();
    continue; // Skip further processing for 'how' command
}

// ========================= End of the "how" command =========================


// ========================= Function for: "search all" command =========================
if (smsMessage === 'search all') {
    try {
        const bicycleQuery = "SELECT bicycle_code, new_location, previous_location FROM bicycle_codes"; // Query to fetch bicycle_code, new_location, and previous_location
        const bicycles = await upbsConn.query(bicycleQuery);

        if (bicycles.length === 0) {
            const noBicyclesReply = "No bicycles available at the moment.";
            await sendReply(smsSender, noBicyclesReply, row.ID, smsdConn);
        } else {
            const locationList = bicycles.map(bike => {
                // Use new_location if available, otherwise fall back to previous_location
                const location = bike.new_location || bike.previous_location;
                return `Bike ${bike.bicycle_code} is at ${location}`;
            }).join('\n');
            const replyMessage = `All Bicycles Locations:\n${locationList}`;
            await sendReply(smsSender, replyMessage, row.ID, smsdConn);
        }

        requestType = 'Search All';
        // Log the 'search all' request
        if (user) {
            await logMessage(user, smsSender, row.ID, requestType, upbsConn);
        } else {
            // If user is not registered, log without user details
            await logMessage({ lastname: null, firstname: null, phone_number: null }, smsSender, row.ID, requestType, upbsConn);
        }

    } catch (err) {
        console.error('Error fetching locations:', err);
        const errorReply = "Error fetching bicycle locations. Please try again later.";
        await sendReply(smsSender, errorReply, row.ID, smsdConn);
    } finally {
        if (upbsConn) upbsConn.release();
    }
    await markAsProcessed(smsdConn, row.ID);
    continue; // Skip further processing for 'search all' command
}

// ========================= End of the "search all" command =========================



// Check if the message is 'locations' to return available locations
if (smsMessage === 'locations') {
    try {
        // Check if the sender is a registered member
        const memberQuery = `
            SELECT lastname, firstname, phone_number
            FROM members
            WHERE phone_number = ?
        `;
        const memberRecords = await upbsConn.query(memberQuery, [smsSender]);

        if (memberRecords.length === 0) {
            const noMemberReply = `Sorry. You are not registered with UP Bike Share.`;
            await sendReply(smsSender, noMemberReply, row.ID, smsdConn); // Reply to sender
            await markAsProcessed(smsdConn, row.ID); // Mark the message as processed
            if (upbsConn) upbsConn.release();
            continue; // Skip further processing
        }

        // If the sender is a registered member, proceed with sending available locations
        const locationQuery = "SELECT location_name FROM locations";
        const locations = await upbsConn.query(locationQuery);

        if (locations.length === 0) {
            const noLocationsReply = "No locations available at the moment.";
            await sendReply(smsSender, noLocationsReply, row.ID, smsdConn);
        } else {
            const locationList = locations.map(loc => loc.location_name).join(', ');
            const replyMessage = `Available locations: ${locationList}`;
            await sendReply(smsSender, replyMessage, row.ID, smsdConn);
        }

        // Log the 'locations' request with member details
        const { lastname, firstname, phone_number } = memberRecords[0];
        requestType = 'Locations';
        await logMessage({ lastname, firstname, phone_number }, smsSender, row.ID, requestType, upbsConn);

    } catch (err) {
        console.error('Error fetching locations:', err);
        const errorReply = "Error fetching locations. Please try again later.";
        await sendReply(smsSender, errorReply, row.ID, smsdConn);
    } finally {
        if (upbsConn) upbsConn.release();
    }

    await markAsProcessed(smsdConn, row.ID);
    continue; // Skip further processing for 'locations' command
}




            // ========================= New Command Handling: usage [bicycle_code] =========================
            // Check if the message starts with 'usage' command
            const usageMatch = smsMessage.match(/^usage\s+(\w+)$/i);
            if (usageMatch) {
                const bicycleCode = usageMatch[1].toLowerCase();

                console.log(`Usage Command Received for Bicycle Code: ${bicycleCode}`);

                // Validate Bicycle Code
                let bicycles = [];
                try {
                    bicycles = await upbsConn.query("SELECT * FROM bicycle_codes WHERE bicycle_code = ?", [bicycleCode]);
                } catch (err) {
                    console.error('Error fetching bicycle details:', err);
                }

                if (bicycles.length > 0) {
                    // Bicycle code is valid, retrieve and send usage history
                    await sendBicycleUsage(smsSender, bicycleCode, row.ID, smsdConn, upbsConn);
                } else {
                    // Invalid bicycle code
                    const invalidBicycleReply = `Invalid bicycle code ${bicycleCode}. Please check and try again.`;
                    await sendReply(smsSender, invalidBicycleReply, row.ID, smsdConn);
                }

                // Mark inbox as processed
                await markAsProcessed(smsdConn, row.ID);
                if (upbsConn) upbsConn.release();
                continue; // Skip further processing after handling usage command
            }
            // ========================= End of usage Command Handling =========================

            // Handle borrowing command
            if (user) {
                const borrowMatch = smsMessage.match(/^(\w+)\s+(\w+)\s+to\s+(\w+)$/i);
                if (borrowMatch) {
                    const bicycleCode = borrowMatch[1].toLowerCase(); // Ensure consistency
                    const fromLocation = borrowMatch[2].toLowerCase();
                    const toLocation = borrowMatch[3].toLowerCase();

                    console.log(`Parsed Borrow Command - Bicycle Code: ${bicycleCode}, From: ${fromLocation}, To: ${toLocation}`);

                    // Validate Bicycle Code
                    let bicycles = [];
                    try {
                        bicycles = await upbsConn.query("SELECT * FROM bicycle_codes WHERE bicycle_code = ?", [bicycleCode]);
                    } catch (err) {
                        console.error('Error fetching bicycle details:', err);
                    }

                    if (bicycles.length > 0) {
                        const bicycle = bicycles[0];

                        // Validate 'from' and 'to' locations
                        const validFrom = await validateLocation(fromLocation, upbsConn);
                        const validTo = await validateLocation(toLocation, upbsConn);

                        if (!validFrom || !validTo) {
                            const invalidLocationReply = `Invalid location(s). Please check your 'from' and 'to' locations.`;
                            await sendReply(smsSender, invalidLocationReply, row.ID, smsdConn);
                            await markAsProcessed(smsdConn, row.ID);
                            if (upbsConn) upbsConn.release();
                            continue;
                        }

                        // Start a database transaction for atomicity
                        try {
                            await upbsConn.beginTransaction();

                            // Update bicycle locations
                            const updateBicycleQuery = `
                                UPDATE bicycle_codes 
                                SET previous_location = ?, new_location = ? 
                                WHERE bicycle_code = ?
                            `;
                            await upbsConn.query(updateBicycleQuery, [fromLocation, toLocation, bicycleCode]);

                            // Insert into bicycle_history
                            const insertHistoryQuery = `
                                INSERT INTO bicycle_history (bicycle_code, previous_location, new_location, borrowed_by)
                                VALUES (?, ?, ?, ?)
                            `;
                            await upbsConn.query(insertHistoryQuery, [
                                bicycleCode,
                                fromLocation,
                                toLocation,
                                `${user.firstname} ${user.lastname}` // Assuming you have user's first and last name
                            ]);

                            // Send the combination lock and location update to the sender
                            const replyMessage = `Hi ${user.firstname} ${user.lastname}! The lock code for bicycle${bicycle.bicycle_code} is ${bicycle.combination_lock}. You may proceed to ${toLocation}. Please don't forget to lock the bike at your destination. Have a safe ride.`;
                            await sendReply(smsSender, replyMessage, row.ID, smsdConn);

                            // Insert into Logs
                            requestType = 'Borrowing';
                            await logMessage(user, smsSender, row.ID, requestType, upbsConn);

                            // Commit the transaction
                            await upbsConn.commit();

                        } catch (err) {
                            // Rollback in case of error
                            try {
                                await upbsConn.rollback();
                            } catch (rollbackErr) {
                                console.error('Error during rollback:', rollbackErr);
                            }
                            console.error('Error during transaction:', err);
                            const transactionErrorReply = "An error occurred while processing your request. Please try again later.";
                            await sendReply(smsSender, transactionErrorReply, row.ID, smsdConn);
                            if (upbsConn) upbsConn.release();
                            await markAsProcessed(smsdConn, row.ID);
                            continue;
                        }

                    } else {
                        // Invalid bicycle code
                        await handleInvalidCommand(smsSender, row.ID, smsdConn);
                        requestType = 'Invalid Command';
                        await logMessage(user, smsSender, row.ID, requestType, upbsConn);
                    }

                    // Mark inbox as processed
                    await markAsProcessed(smsdConn, row.ID);

                    console.log(`Replied to Sender: ${smsSender}`);
                    if (upbsConn) upbsConn.release();
                    continue; // Skip further processing after handling borrow command
                }
            }

            // Existing command handling (e.g., other commands in 'commands' table)
            if (user) {
                const commandQuery = "SELECT * FROM commands WHERE command_code = ?";
                let commands = [];
                try {
                    commands = await upbsConn.query(commandQuery, [smsMessage]);
                } catch (err) {
                    console.error('Error fetching commands:', err);
                }

                if (commands.length > 0) {
                    // Handle other commands as per existing logic
                    // For simplicity, assuming no other commands need handling beyond 'how' and 'locations'.
                    // If there are other commands, implement their handling logic here.
                } else {
                    // Command is invalid
                    await handleInvalidCommand(smsSender, row.ID, smsdConn);
                    requestType = 'Invalid Command';
                    await logMessage(user, smsSender, row.ID, requestType, upbsConn);
                }
            } else {
                // Sender is not a registered member
                await handleNonRegisteredSender(smsSender, row.ID, smsdConn);
                // Log the non-registered sender request
                await logMessage({ lastname: null, firstname: null, phone_number: null }, smsSender, row.ID, 'Non-Registered', upbsConn);
            }

            if (upbsConn) upbsConn.release();
        }

    } catch (err) {
        console.error('Error in checkInbox:', err);
    } finally {
        if (smsdConn) smsdConn.release();
    }
}

// ========================= End of checkInbox Function =========================

// ========================= Schedule the inbox checking =========================
setInterval(checkInbox, 200);
// ========================= End of Schedule =========================
