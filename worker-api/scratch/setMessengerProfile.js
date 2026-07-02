// worker-api/scratch/setMessengerProfile.js
const https = require('https');

// Read the token from command-line arguments or process environment
const PAGE_ACCESS_TOKEN = process.argv[2] || process.env.FB_PAGE_ACCESS_TOKEN;

if (!PAGE_ACCESS_TOKEN) {
    console.error('Error: Please provide your FB_PAGE_ACCESS_TOKEN.');
    console.log('Usage: node scratch/setMessengerProfile.js <YOUR_FB_PAGE_ACCESS_TOKEN>');
    process.exit(1);
}

const data = JSON.stringify({
    get_started: {
        payload: 'RESET'
    },
    ice_breakers: [
        {
            question: 'File a dispute appeal 🚲',
            payload: 'RESET'
        },
        {
            question: 'Restart bot conversation',
            payload: 'RESET'
        }
    ]
});

const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v19.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        const response = JSON.parse(body);
        if (response.result === 'success') {
            console.log('🎉 Successfully configured Messenger Profile!');
            console.log('- "Get Started" button added.');
            console.log('- "Ice Breakers" (Suggested Questions) configured.');
        } else {
            console.error('❌ Failed to configure profile:', response.error);
        }
    });
});

req.on('error', (error) => {
    console.error('Connection error:', error.message);
});

req.write(data);
req.end();
