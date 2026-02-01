const https = require('https');

const URL = "https://ace-v4-production.up.railway.app/health";

console.log(`Checking ${URL}...`);

const req = https.get(URL, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
});
