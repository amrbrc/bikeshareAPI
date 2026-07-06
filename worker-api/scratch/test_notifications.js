// worker-api/scratch/test_notifications.js
const path = require('path');
// Load the environment variables from worker-api/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const notificationService = require('../services/notificationService');

async function runTest() {
    console.log('--- Initiating Notification Service Test ---');
    console.log(`[Config Check] DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? 'Configured' : 'NOT Configured'}`);
    console.log(`[Config Check] SMTP_HOST: ${process.env.SMTP_HOST || 'NOT Configured'}`);
    console.log(`[Config Check] SMTP_USER: ${process.env.SMTP_USER || 'NOT Configured'}`);
    console.log(`[Config Check] SMTP_TO: ${process.env.SMTP_TO || 'NOT Configured'}`);
    console.log('-------------------------------------------');

    const testStudentName = 'Amer Talastasin';
    const testPhone = '+639615580206';
    const testBikeCode = '88';
    const testImageUrl = 'https://raw.githubusercontent.com/amrbrc/bikeshareAPI/main/dashboard/icons/icon-192.png'; // Sample UPBS icon

    console.log('1. Dispatching Discord Webhook test...');
    await notificationService.sendDiscordNotification(testStudentName, testPhone, testBikeCode, testImageUrl);

    console.log('2. Dispatching SMTP Email alert test...');
    await notificationService.sendEmailNotification(testStudentName, testPhone, testBikeCode, testImageUrl);

    console.log('--- Test Complete ---');
}

runTest();
