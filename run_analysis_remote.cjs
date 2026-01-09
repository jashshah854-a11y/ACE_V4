const fs = require('fs');
const path = require('path');
const https = require('https'); // Changed from http to https

const API_BASE = "https://ace-v4-production.up.railway.app";
const FILE_PATH = "C:\\Users\\jashs\\Projects\\ACE_V4\\a_steam_data_2021_2025.csv";
const BOUNDARY = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

function runAnalysis() {
    console.log("=".repeat(60));
    console.log(`Triggering Analysis for: ${FILE_PATH}`);
    console.log("=".repeat(60));

    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ Error: File not found at ${FILE_PATH}`);
        return;
    }

    const taskIntent = {
        "primaryQuestion": "Run a comprehensive analysis of this dataset, identifying key drivers, anomalies, and segments.",
        "decisionContext": "User requested manual run.",
        "requiredOutputType": "diagnostic",
        "successCriteria": "Comprehensive report",
        "constraints": "",
        "confidenceThreshold": 80,
        "confidenceAcknowledged": true
    };

    const fileContent = fs.readFileSync(FILE_PATH, { encoding: 'utf-8' }); // Reading as text since it's CSV

    // Construct Multipart Body manually (since we don't have 'form-data' package guaranteed)
    let body = [];

    // File Part
    body.push(`--${BOUNDARY}`);
    body.push(`Content-Disposition: form-data; name="file"; filename="${path.basename(FILE_PATH)}"`);
    body.push('Content-Type: text/csv');
    body.push('');
    body.push(fileContent);

    // Task Intent Part
    body.push(`--${BOUNDARY}`);
    body.push('Content-Disposition: form-data; name="task_intent"');
    body.push('');
    body.push(JSON.stringify(taskIntent));

    // Confidence Acknowledged Part
    body.push(`--${BOUNDARY}`);
    body.push('Content-Disposition: form-data; name="confidence_acknowledged"');
    body.push('');
    body.push('true');

    body.push(`--${BOUNDARY}--`);
    body.push('');

    const bodyString = body.join('\r\n');

    const options = {
        hostname: 'ace-v4-production.up.railway.app',
        port: 443,
        path: '/run',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
            'Content-Length': Buffer.byteLength(bodyString)
        }
    };

    console.log(`Sending request to ${API_BASE}/run...`);
    const startTime = Date.now();

    const req = https.request(options, (res) => { // Changed from http.request to https.request
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`Response Time: ${duration}s`);
            console.log(`Status Code: ${res.statusCode}`);

            if (res.statusCode === 200) {
                try {
                    const result = JSON.parse(responseData);
                    const runId = result.run_id;
                    console.log(`✅ SUCCESS! Run started w/ ID: ${runId}`);
                    console.log(`Monitor at: http://localhost:8000/run/${runId}/status`);
                } catch (e) {
                    console.log("✅ SUCCESS! (But response parsing failed)", responseData);
                }
            } else {
                console.log(`❌ FAILED: ${responseData}`);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`❌ Request Error: ${e.message} (${e.code})`);
    });

    req.write(bodyString);
    req.end();
}

runAnalysis();
