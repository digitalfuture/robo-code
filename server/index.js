import { WebSocketServer } from 'ws';
import net from 'net';
import jsmodbus from 'jsmodbus';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.VITE_PROXY_PORT || 3000;
const ROBOT_IP = process.env.VITE_ROBOT_IP || '192.168.1.100';
const ROBOT_PORT = Number(process.env.VITE_ROBOT_PORT) || 502;

// Determine protocol based on port
const PROTOCOL = ROBOT_PORT === 5000 ? 'TCP_STRING' : 'MODBUS_TCP';

console.log('=== ROBOT PROXY SERVER STARTING ===');
console.log(`Configuration:`);
console.log(`  VITE_PROXY_PORT: ${PORT}`);
console.log(`  VITE_ROBOT_IP: ${ROBOT_IP}`);
console.log(`  VITE_ROBOT_PORT: ${ROBOT_PORT}`);
console.log(`  PROTOCOL: ${PROTOCOL}`);
console.log('─────────────────────────────────');

// Protocol constants
const COMMAND_TIMEOUT = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const MODBUS_POLL_INTERVAL = 100; // 100ms for Modbus TCP polling

// Robot encoding for TCP String Protocol
let robotEncoding = 'utf8';

// Modbus polling
let modbusPollTimer = null;

const wss = new WebSocketServer({ port: PORT });
let robotSocket = null;
let modbusClient = null;
let isRobotConnected = false;
let robotConnectAttempted = false;
let responseBuffer = '';
let pendingCommand = null;

let frontendClient = null;

console.log(`[Proxy] WebSocket server listening on port ${PORT}`);

// ============ MODBUS TCP FUNCTIONS ============

const initModbus = () => {
    robotSocket = new net.Socket();
    modbusClient = new jsmodbus.client.TCP(robotSocket);

    robotSocket.connect({ host: ROBOT_IP, port: ROBOT_PORT }, () => {
        console.log('[Proxy] ✓ Modbus TCP connection established');
        isRobotConnected = true;

        // Test connection by reading registers
        testModbusConnection();

        // Start polling loop
        startModbusPolling();
    });

    // Don't log raw data - jsmodbus handles parsing internally
    // robotSocket.on('data', ...) - removed to prevent infinite logging

    robotSocket.on('error', handleModbusError);
    robotSocket.on('close', handleModbusClose);
};

const startModbusPolling = () => {
    if (modbusPollTimer) clearInterval(modbusPollTimer);
    
    modbusPollTimer = setInterval(async () => {
        if (!isRobotConnected || !modbusClient) return;
        
        try {
            // Poll registers 0-20 for robot data
            const response = await modbusClient.readHoldingRegisters(0, 20);
            const values = response.response.body.values;
            
            // Broadcast to frontend
            if (frontendClient && frontendClient.readyState === 1) {
                frontendClient.send(JSON.stringify({
                    type: 'REGISTER_DATA',
                    values: values
                }));
            }
        } catch (err) {
            // Silent fail for polling
        }
    }, MODBUS_POLL_INTERVAL);
};

const stopModbusPolling = () => {
    if (modbusPollTimer) {
        clearInterval(modbusPollTimer);
        modbusPollTimer = null;
    }
};

const testModbusConnection = async () => {
    try {
        console.log('[Proxy] Testing Modbus connection...');
        const response = await modbusClient.readHoldingRegisters(0, 10);
        console.log('[Proxy] ✓ Modbus test read successful:', response.response.body.values);
    } catch (err) {
        console.warn('[Proxy] Modbus test read failed:', err.message);
    }
};

const handleModbusError = (err) => {
    console.warn(`[Proxy] ✗ Modbus Error: ${err.message}`);
    console.warn(`[Proxy] Error code: ${err.code}`);

    isRobotConnected = false;
    robotSocket = null;
    modbusClient = null;

    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(JSON.stringify({
            type: 'STATUS',
            connected: false,
            error: err.message,
            errorCode: err.code
        }));
    }

    console.log('[Proxy] Retrying in 5 seconds...');
    setTimeout(connectRobot, 5000);
};

const handleModbusClose = () => {
    console.log('[Proxy] Modbus connection closed');
    isRobotConnected = false;
    robotSocket = null;
    modbusClient = null;
    
    // Stop polling
    stopModbusPolling();

    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(JSON.stringify({
            type: 'STATUS',
            connected: false,
            reason: 'Robot closed connection'
        }));
    }

    console.log('[Proxy] Retrying connection in 5 seconds...');
    setTimeout(connectRobot, 5000);
};

// ============ TCP STRING PROTOCOL FUNCTIONS ============

const initTcpString = () => {
    robotSocket = new net.Socket();

    robotSocket.connect({ host: ROBOT_IP, port: ROBOT_PORT }, () => {
        console.log('[Proxy] ✓ TCP String connection established');
        isRobotConnected = true;

        // Send init command
        const initCommand = `[getRobotRunStatus_IFace(); id = 999]`;
        console.log('[Proxy] → Sending init command:', initCommand);
        robotSocket.write(initCommand);
    });

    robotSocket.on('data', handleTcpStringData);
    robotSocket.on('error', handleTcpStringError);
    robotSocket.on('close', handleTcpStringClose);
};

const handleTcpStringData = (data) => {
    // Check for heartbeat (single space 0x20)
    if (data.length === 1 && data[0] === 0x20) {
        console.log('[Proxy] ← Robot heartbeat (0x20)');
        robotSocket.write(Buffer.from([0x20]));
        console.log('[Proxy] → Heartbeat response sent');
        return;
    }

    // Log raw data
    console.log('[Proxy] Raw data (hex):', data.toString('hex'));
    console.log('[Proxy] Raw data length:', data.length);

    // Auto-detect encoding
    let chunk;
    if (robotEncoding === 'utf8') {
        chunk = data.toString('utf8');

        if (/[\uFFFD]/.test(chunk) || chunk.includes('')) {
            const utf16chunk = data.toString('utf16le');
            if (utf16chunk.includes('[') && utf16chunk.includes(';')) {
                robotEncoding = 'utf16le';
                console.log('[Proxy] ✓ Auto-detected encoding: UTF-16LE');
                chunk = utf16chunk;
            } else {
                try {
                    chunk = iconv.decode(data, 'gbk');
                    robotEncoding = 'gbk';
                    console.log('[Proxy] ✓ Auto-detected encoding: GBK (Chinese)');
                    console.log('[Proxy] GBK decoded:', chunk);
                } catch (e) {
                    robotEncoding = 'hex';
                    console.log('[Proxy] GBK decode error:', e.message);
                    chunk = '[Encoded data]';
                }
            }
        }
    } else if (robotEncoding === 'hex') {
        console.log('[Proxy] Raw bytes:', data.toString('hex'));
        chunk = '[Encoded data]';
    } else if (robotEncoding === 'gbk') {
        try {
            chunk = iconv.decode(data, 'gbk');
        } catch (e) {
            chunk = '[GBK decode error]';
        }
    } else {
        chunk = data.toString(robotEncoding);
    }

    console.log('[Proxy] ← Robot raw:', chunk);

    // Accumulate response buffer
    responseBuffer += chunk;

    // Process complete responses
    processResponseBuffer();
};

const processResponseBuffer = () => {
    let match;
    const responseRegex = /\[([^\]]+)\]/g;

    while ((match = responseRegex.exec(responseBuffer)) !== null) {
        const fullMatch = match[0];
        console.log('[Proxy] Parsed response:', fullMatch);

        handleRobotResponse(fullMatch);
    }

    const lastCompleteResponse = responseBuffer.lastIndexOf(']');
    if (lastCompleteResponse >= 0) {
        responseBuffer = responseBuffer.substring(lastCompleteResponse + 1);
    }
};

const handleRobotResponse = (response) => {
    const idMatch = response.match(/\[id\s*=\s*(\d+)/i);
    const motionFinishMatch = response.match(/\[(FeedMovFinish|ActMovFinish):\s*(\d+)/i);

    let responseId = null;

    if (idMatch) {
        responseId = parseInt(idMatch[1]);
    } else if (motionFinishMatch) {
        responseId = parseInt(motionFinishMatch[2]);
    }

    if (pendingCommand && responseId === pendingCommand.id) {
        clearTimeout(pendingCommand.timeout);
        pendingCommand.resolve(response);
        pendingCommand = null;
    }

    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(JSON.stringify({
            type: 'ROBOT_RESPONSE',
            response: response
        }));
    }
};

const handleTcpStringError = (err) => {
    console.warn(`[Proxy] ✗ TCP String Error: ${err.message}`);
    isRobotConnected = false;
    robotSocket = null;

    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(JSON.stringify({
            type: 'STATUS',
            connected: false,
            error: err.message
        }));
    }

    setTimeout(connectRobot, 5000);
};

const handleTcpStringClose = () => {
    console.log('[Proxy] TCP String connection closed');
    isRobotConnected = false;
    robotSocket = null;
    robotEncoding = 'utf8';

    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(JSON.stringify({
            type: 'STATUS',
            connected: false,
            reason: 'Robot closed connection'
        }));
    }

    setTimeout(connectRobot, 5000);
};

// ============ COMMON FUNCTIONS ============

const connectRobot = () => {
    if (robotConnectAttempted && isRobotConnected) return;
    robotConnectAttempted = true;

    console.log(`[Proxy] Attempting ${PROTOCOL} connection to Robot at ${ROBOT_IP}:${ROBOT_PORT}...`);

    if (robotSocket) {
        robotSocket.destroy();
    }

    if (PROTOCOL === 'MODBUS_TCP') {
        initModbus();
    } else {
        initTcpString();
    }
};

const sendToRobotTcpString = (command) => {
    return new Promise((resolve, reject) => {
        if (!robotSocket || !isRobotConnected) {
            reject(new Error('Not connected to robot'));
            return;
        }

        const idMatch = command.match(/id\s*=\s*(\d+)/);
        if (!idMatch) {
            reject(new Error('Invalid command format - missing ID'));
            return;
        }

        const commandId = parseInt(idMatch[1]);

        if (pendingCommand) {
            clearTimeout(pendingCommand.timeout);
            pendingCommand = null;
        }

        console.log('[Proxy] → Robot:', command);
        const written = robotSocket.write(command);
        console.log('[Proxy] Write result:', written);

        const timeout = setTimeout(() => {
            if (pendingCommand) {
                console.log('[Proxy] Command timeout - no response from robot');
                pendingCommand.reject(new Error('Command timeout'));
                pendingCommand = null;
            }
        }, COMMAND_TIMEOUT);

        pendingCommand = {
            id: commandId,
            resolve,
            reject,
            timeout
        };
    });
};

// Handle Frontend Connections
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[Proxy] ✓ Frontend client connected from ${clientIp}`);

    frontendClient = ws;

    ws.send(JSON.stringify({
        type: 'STATUS',
        connected: isRobotConnected,
        robotIp: ROBOT_IP,
        robotPort: ROBOT_PORT,
        protocol: PROTOCOL
    }));

    ws.on('close', () => {
        console.log('[Proxy] Frontend client disconnected');
        frontendClient = null;
    });

    ws.on('error', (err) => {
        console.error('[Proxy] Frontend WebSocket error:', err.message);
        frontendClient = null;
    });

    ws.on('message', async (msg) => {
        try {
            const message = JSON.parse(msg.toString());
            console.log(`[Proxy] ← Frontend: ${message.type || message.cmd || 'UNKNOWN'}`,
                message.params ? JSON.stringify(message.params) : '');

            if (message.cmd === 'CONNECT' || message.type === 'CONNECT') {
                console.log(`[Proxy] Handshake request received for robot at ${message.target?.ip}:${message.target?.port}`);

                const targetIp = message.target?.ip || ROBOT_IP;
                const targetPort = message.target?.port || ROBOT_PORT;

                ws.send(JSON.stringify({
                    type: 'STATUS',
                    connected: isRobotConnected,
                    robotIp: targetIp,
                    robotPort: targetPort,
                    protocol: PROTOCOL
                }));

                if (!isRobotConnected) {
                    connectRobot();
                }
            }

            if (message.type === 'ROBOT_COMMAND') {
                if (PROTOCOL === 'TCP_STRING') {
                    try {
                        const response = await sendToRobotTcpString(message.command);
                        console.log('[Proxy] Command completed:', response);
                    } catch (error) {
                        console.error('[Proxy] Command failed:', error.message);
                        ws.send(JSON.stringify({
                            type: 'COMMAND_ERROR',
                            error: error.message
                        }));
                    }
                } else {
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'ROBOT_COMMAND not supported for Modbus TCP. Use WRITE_REGISTER instead.'
                    }));
                }
            }

            if (message.type === 'WRITE_REGISTER' && PROTOCOL === 'MODBUS_TCP') {
                try {
                    await modbusClient.writeSingleRegister(message.addr, message.val);
                    console.log(`[Proxy] Write Reg ${message.addr} -> ${message.val}`);
                } catch (error) {
                    console.error('[Proxy] Write failed:', error.message);
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: error.message
                    }));
                }
            }

            if (message.type === 'READ_REGISTER' && PROTOCOL === 'MODBUS_TCP') {
                if (!modbusClient) {
                    console.error('[Proxy] Read failed: Modbus client not initialized');
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Modbus client not ready'
                    }));
                    return;
                }
                try {
                    console.log(`[Proxy] Reading registers ${message.addr}-${message.addr + message.count - 1}`);
                    const response = await modbusClient.readHoldingRegisters(message.addr, message.count);
                    console.log(`[Proxy] Read ${response.response.body.values.length} registers`);
                    ws.send(JSON.stringify({
                        type: 'REGISTER_DATA',
                        values: response.response.body.values
                    }));
                } catch (error) {
                    console.error('[Proxy] Read failed:', error.message);
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: error.message
                    }));
                }
            }
        } catch (e) {
            console.error('[Proxy] Message parse error:', e.message);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: `Parse error: ${e.message}`
            }));
        }
    });
});

// Heartbeat
setInterval(() => {
    if (isRobotConnected && frontendClient) {
        frontendClient.send(JSON.stringify({
            type: 'HEARTBEAT',
            connected: true,
            timestamp: Date.now()
        }));
    }
}, HEARTBEAT_INTERVAL);

// Start initial connection
console.log('[Proxy] Initiating robot connection...');
connectRobot();
