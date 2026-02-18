import { WebSocketServer } from 'ws';
import net from 'net';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const PORT = process.env.VITE_PROXY_PORT || 3000;
const ROBOT_IP = process.env.VITE_ROBOT_IP || '192.168.1.100';
const ROBOT_PORT = Number(process.env.VITE_ROBOT_PORT) || 502;

console.log('=== ROBOT PROXY SERVER STARTING ===');
console.log(`Configuration:`);
console.log(`  VITE_PROXY_PORT: ${PORT}`);
console.log(`  VITE_ROBOT_IP: ${ROBOT_IP}`);
console.log(`  VITE_ROBOT_PORT: ${ROBOT_PORT}`);
console.log('─────────────────────────────────');

// Protocol constants
const COMMAND_TIMEOUT = 5000; // 5 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds (per manual Section 5.1)

// Robot encoding - will be auto-detected on first connection
let robotEncoding = 'utf8';

const wss = new WebSocketServer({ port: PORT });
let robotSocket = null;
let isRobotConnected = false;
let robotConnectAttempted = false;
let responseBuffer = '';
let pendingCommand = null;

let frontendClient = null;

console.log(`[Proxy] WebSocket server listening on port ${PORT}`);

// Connect to Robot (TCP Client)
const connectRobot = () => {
    if (robotConnectAttempted && isRobotConnected) return;
    robotConnectAttempted = true;

    console.log(`[Proxy] Attempting TCP connection to Robot at ${ROBOT_IP}:${ROBOT_PORT}...`);

    if (robotSocket) {
        robotSocket.destroy();
    }

    robotSocket = new net.Socket();

    robotSocket.connect({ host: ROBOT_IP, port: ROBOT_PORT }, () => {
        console.log('[Proxy] ✓ TCP connection established with robot');
        isRobotConnected = true;
        
        // Send init command immediately - robot expects commands in specific format
        // Using getRobotRunStatus_IFace() as a test command (read-only, safe)
        const initCommand = `[getRobotRunStatus_IFace();id=999]`;
        console.log('[Proxy] → Sending init command:', initCommand);
        robotSocket.write(initCommand);
    });

    robotSocket.on('data', (data) => {
        // Auto-detect encoding on first response
        // ER Series robots may use UTF-8, UTF-16LE, or GBK (Chinese)
        let chunk;
        if (robotEncoding === 'utf8') {
            // Try UTF-8 first
            chunk = data.toString('utf8');
            
            // Check for garbage characters (replacement character or unusual patterns)
            if (/[\uFFFD]/.test(chunk) || chunk.includes('')) {
                // UTF-8 failed, try UTF-16LE
                const utf16chunk = data.toString('utf16le');
                // If UTF-16LE looks more valid (has brackets and semicolons), switch to it
                if (utf16chunk.includes('[') && utf16chunk.includes(';')) {
                    robotEncoding = 'utf16le';
                    console.log('[Proxy] ✓ Auto-detected encoding: UTF-16LE');
                    chunk = utf16chunk;
                } else {
                    // Likely GBK (Chinese) - use iconv-lite for decoding
                    try {
                        chunk = iconv.decode(data, 'gbk');
                        robotEncoding = 'gbk';
                        console.log('[Proxy] ✓ Auto-detected encoding: GBK (Chinese)');
                    } catch (e) {
                        // Fallback to hex dump
                        robotEncoding = 'hex';
                        console.log('[Proxy] Raw bytes:', data.toString('hex'));
                        chunk = '[Encoded data - see hex dump]';
                    }
                }
            }
        } else if (robotEncoding === 'hex') {
            // Show hex dump
            console.log('[Proxy] Raw bytes:', data.toString('hex'));
            chunk = '[Encoded data]';
        } else if (robotEncoding === 'gbk') {
            // Use iconv-lite for GBK
            try {
                chunk = iconv.decode(data, 'gbk');
            } catch (e) {
                chunk = '[GBK decode error]';
            }
        } else {
            // Use detected encoding (utf16le)
            chunk = data.toString(robotEncoding);
        }
        
        console.log('[Proxy] ← Robot raw:', chunk);
        
        // Accumulate response buffer
        responseBuffer += chunk;
        
        // Try to parse complete responses
        // Response format: [id = X; Ok; data] or [id = X; FAIL]
        // Also: [FeedMovFinish: X], [ActMovFinish: X], [RobotStop: X], [SafeDoorIsOpen: X]
        processResponseBuffer();
    });

    robotSocket.on('error', (err) => {
        console.warn(`[Proxy] ✗ Robot Connection Error: ${err.message}`);
        console.warn(`[Proxy] Error code: ${err.code}`);

        if (err.code === 'ENOTFOUND') {
            console.warn(`[Proxy] Host ${ROBOT_IP} not found - check IP address`);
        } else if (err.code === 'ECONNREFUSED') {
            console.warn(`[Proxy] Connection refused on port ${ROBOT_PORT} - robot may be offline or not in TCP server mode`);
        } else if (err.code === 'ETIMEDOUT') {
            console.warn(`[Proxy] Connection timed out - firewall or network issue`);
        }

        isRobotConnected = false;
        robotSocket = null;

        // Broadcast error to frontend
        if (frontendClient && frontendClient.readyState === 1) {
            frontendClient.send(JSON.stringify({
                type: 'STATUS',
                connected: false,
                error: err.message,
                errorCode: err.code
            }));
        }

        // Retry logic
        console.log('[Proxy] Retrying in 5 seconds...');
        setTimeout(connectRobot, 5000);
    });

    robotSocket.on('close', () => {
        console.log('[Proxy] Robot connection closed');
        isRobotConnected = false;
        robotSocket = null;
        
        // Reset encoding detection on disconnect
        robotEncoding = 'utf8';

        if (frontendClient && frontendClient.readyState === 1) {
            frontendClient.send(JSON.stringify({
                type: 'STATUS',
                connected: false,
                reason: 'Robot closed connection'
            }));
        }

        // Reject pending command
        if (pendingCommand) {
            pendingCommand.reject(new Error('Robot connection closed'));
            clearTimeout(pendingCommand.timeout);
            pendingCommand = null;
        }

        // Retry logic
        console.log('[Proxy] Retrying connection in 5 seconds...');
        setTimeout(connectRobot, 5000);
    });
}

/**
 * Process accumulated response buffer to extract complete commands
 */
function processResponseBuffer() {
    // Look for complete responses in buffer
    // Each response is enclosed in [] and ends with ]
    let match;
    const responseRegex = /\[([^\]]+)\]/g;
    
    while ((match = responseRegex.exec(responseBuffer)) !== null) {
        const fullMatch = match[0];
        console.log('[Proxy] Parsed response:', fullMatch);
        
        // Handle the complete response
        handleRobotResponse(fullMatch);
    }
    
    // Clear processed data from buffer
    const lastCompleteResponse = responseBuffer.lastIndexOf(']');
    if (lastCompleteResponse >= 0) {
        responseBuffer = responseBuffer.substring(lastCompleteResponse + 1);
    }
}

/**
 * Handle a complete robot response
 */
function handleRobotResponse(response) {
    // Parse response to extract ID
    // Format: [id = X; Ok; data] or [id = X; FAIL]
    const idMatch = response.match(/\[id\s*=\s*(\d+)/i);
    const motionFinishMatch = response.match(/\[(FeedMovFinish|ActMovFinish):\s*(\d+)/i);
    const robotStopMatch = response.match(/\[RobotStop:\s*(\d+)/i);
    const safeDoorMatch = response.match(/\[SafeDoorIsOpen:\s*(\d+)/i);

    let responseId = null;
    
    if (idMatch) {
        responseId = parseInt(idMatch[1]);
    } else if (motionFinishMatch) {
        responseId = parseInt(motionFinishMatch[2]);
    } else if (robotStopMatch) {
        responseId = parseInt(robotStopMatch[1]);
    } else if (safeDoorMatch) {
        responseId = parseInt(safeDoorMatch[1]);
    }
    
    // Resolve pending command if ID matches
    if (pendingCommand && responseId === pendingCommand.id) {
        clearTimeout(pendingCommand.timeout);
        pendingCommand.resolve(response);
        pendingCommand = null;
    }
    
    // Forward response to frontend
    broadcastToClient(JSON.stringify({
        type: 'ROBOT_RESPONSE',
        response: response
    }));
}

/**
 * Send command to robot
 */
function sendToRobot(command) {
    return new Promise((resolve, reject) => {
        if (!robotSocket || !isRobotConnected) {
            reject(new Error('Not connected to robot'));
            return;
        }

        // Extract command ID
        const idMatch = command.match(/id=(\d+)/);
        if (!idMatch) {
            reject(new Error('Invalid command format - missing ID'));
            return;
        }

        const commandId = parseInt(idMatch[1]);

        // Clear any previous pending command
        if (pendingCommand) {
            clearTimeout(pendingCommand.timeout);
            pendingCommand = null;
        }

        // Send command
        console.log('[Proxy] → Robot:', command);
        console.log('[Proxy] Robot socket writable:', robotSocket.writable);
        console.log('[Proxy] Robot socket destroyed:', robotSocket.destroyed);
        
        const written = robotSocket.write(command);
        console.log('[Proxy] Write result:', written);

        // Set timeout
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
}

// Handle Frontend Connections
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[Proxy] ✓ Frontend client connected from ${clientIp}`);
    
    // Store frontend client immediately for broadcasts
    frontendClient = ws;

    // Send initial connection status
    ws.send(JSON.stringify({
        type: 'STATUS',
        connected: isRobotConnected,
        robotIp: ROBOT_IP,
        robotPort: ROBOT_PORT
    }));

    ws.on('close', () => {
        console.log('[Proxy] Frontend client disconnected');
        frontendClient = null;
    });

    ws.on('error', (err) => {
        console.error('[Proxy] Frontend WebSocket error:', err.message);
        frontendClient = null;
    });

    // Handle Commands from Frontend
    ws.on('message', async (msg) => {
        try {
            const message = JSON.parse(msg.toString());
            console.log(`[Proxy] ← Frontend: ${message.type || message.cmd || 'UNKNOWN'}`, 
                       message.params ? JSON.stringify(message.params) : '');

            if (message.cmd === 'CONNECT' || message.type === 'CONNECT') {
                console.log(`[Proxy] Handshake request received for robot at ${message.target?.ip}:${message.target?.port}`);

                // Update robot connection settings if provided
                const targetIp = message.target?.ip || ROBOT_IP;
                const targetPort = message.target?.port || ROBOT_PORT;

                // Send confirmation to client
                ws.send(JSON.stringify({
                    type: 'STATUS',
                    connected: isRobotConnected,
                    robotIp: targetIp,
                    robotPort: targetPort
                }));

                // Attempt to connect or reconnect if not connected
                if (!isRobotConnected) {
                    connectRobot();
                }
            }

            if (message.type === 'ROBOT_COMMAND') {
                // Forward command to robot
                try {
                    const response = await sendToRobot(message.command);
                    console.log('[Proxy] Command completed:', response);
                } catch (error) {
                    console.error('[Proxy] Command failed:', error.message);
                    ws.send(JSON.stringify({
                        type: 'COMMAND_ERROR',
                        error: error.message
                    }));
                }
            }

            if (message.type === 'WRITE_REGISTER') {
                // Legacy modbus support - log warning
                console.warn('[Proxy] WRITE_REGISTER received but Modbus is not supported. Use ROBOT_COMMAND instead.');
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: 'Modbus not supported. Use TCP string protocol with ROBOT_COMMAND type.'
                }));
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

/**
 * Broadcast message to connected frontend client
 */
function broadcastToClient(data) {
    if (frontendClient && frontendClient.readyState === 1) {
        frontendClient.send(data);
    }
}

// Handle server errors
wss.on('error', (err) => {
    console.error(`[Proxy] Server error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
        console.error(`[Proxy] Port ${PORT} is already in use!`);
        console.error(`[Proxy] Try: netstat -ano | find "${PORT}"`);
    }
});

// Start initial connection attempt
console.log('[Proxy] Initiating robot connection...');
connectRobot();

// Heartbeat check (optional - per manual Section 5.1)
setInterval(() => {
    if (isRobotConnected && frontendClient) {
        // Send heartbeat status
        broadcastToClient(JSON.stringify({
            type: 'HEARTBEAT',
            connected: true,
            timestamp: Date.now()
        }));
    }
}, HEARTBEAT_INTERVAL);
