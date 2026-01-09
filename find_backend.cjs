const net = require('net');

const START_PORT = 8000;
const END_PORT = 8100;
const TIMEOUT = 200;

console.log(`Scanning ports ${START_PORT}-${END_PORT} for active services...`);

let activePorts = [];
const scanPort = (port) => {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        const cleanup = () => {
            socket.destroy();
        };

        socket.setTimeout(TIMEOUT);

        socket.on('connect', () => {
            console.log(`✅ Found active service on port ${port}`);
            activePorts.push(port);
            cleanup();
            resolve(true);
        });

        socket.on('timeout', () => {
            cleanup();
            resolve(false);
        });

        socket.on('error', (err) => {
            cleanup();
            resolve(false);
        });

        socket.connect(port, 'localhost');
    });
};

const main = async () => {
    const checks = [];
    for (let i = START_PORT; i <= END_PORT; i++) {
        checks.push(scanPort(i));
    }
    await Promise.all(checks);

    if (activePorts.length === 0) {
        console.log("No active ports found in range.");
    } else {
        console.log(`\nScan Complete. Active ports: ${activePorts.join(', ')}`);
    }
};

main();
