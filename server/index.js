import { WebSocketServer } from 'ws';
import net from 'net';
import jsmodbus from 'jsmodbus';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// --- MODBUS REGISTER MAP (PLACEHOLDERS based on standard industrial robots) ---
// We need to verify these exact addresses from "ECM04101-EN-04..." PDF
const REG_COORDS_START = 1000; // X, Y, Z, R, P, Y
const REG_JOINTS_START = 1100; // J1 - J6
const REG_STATUS       = 2000; // Status / Alarms

const wss = new WebSocketServer({ port: PORT });
const socket = new net.Socket();
const client = new jsmodbus.client.TCP(socket);

let isRobotConnected = false;
let robotConnectAttempted = false;

console.log(`[Proxy] WebSocket server listening on port ${PORT}`);

// Connect to Robot
const connectRobot = () => {
    if (robotConnectAttempted && isRobotConnected) return;
    robotConnectAttempted = true;
    
    console.log(`[Proxy] Attempting TCP connection to Robot at ${ROBOT_IP}:${ROBOT_PORT}...`);
    
    socket.connect({ host: ROBOT_IP, port: ROBOT_PORT }, () => {
        console.log('[Proxy] ✓ TCP connection established');
    });
};

socket.on('connect', () => {
    console.log('[Proxy] ✓ Robot connected via Modbus TCP');
    isRobotConnected = true;

    // Try to read a register to verify connection
    setTimeout(async () => {
        try {
            console.log('[Proxy] Testing Modbus communication...');
            // Try to read holding registers (common for robot status)
            const response = await client.readHoldingRegisters(0, 10);
            console.log('[Proxy] ✓ Modbus test read successful:', response.response.body.values);
        } catch (err) {
            console.warn('[Proxy] Modbus test read failed:', err.message);
            console.warn('[Proxy] This may indicate wrong register addresses or robot not in Modbus mode');
        }
    }, 500);

    // Broadcast status to all connected clients
    wss.clients.forEach(clientWs => {
        if (clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ type: 'STATUS', connected: true }));
        }
    });
});

socket.on('error', (err) => {
    console.warn(`[Proxy] ✗ Robot Connection Error: ${err.message}`);
    console.warn(`[Proxy] Error code: ${err.code}`);
    
    if (err.code === 'ENOTFOUND') {
        console.warn(`[Proxy] Host ${ROBOT_IP} not found - check IP address`);
    } else if (err.code === 'ECONNREFUSED') {
        console.warn(`[Proxy] Connection refused on port ${ROBOT_PORT} - robot may be offline`);
    } else if (err.code === 'ETIMEDOUT') {
        console.warn(`[Proxy] Connection timed out - firewall or network issue`);
    }
    
    isRobotConnected = false;
    
    // Broadcast error to all connected clients
    wss.clients.forEach(clientWs => {
        if (clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ 
                type: 'STATUS', 
                connected: false,
                error: err.message 
            }));
        }
    });
    
    // Retry logic
    console.log('[Proxy] Retrying in 5 seconds...');
    setTimeout(connectRobot, 5000);
});

socket.on('close', () => {
    console.log('[Proxy] Robot connection closed');
    console.log('[Proxy] Possible reasons:');
    console.log('[Proxy]   1. Robot closed connection (timeout or error)');
    console.log('[Proxy]   2. Network issue');
    console.log('[Proxy]   3. Wrong Modbus configuration');
    isRobotConnected = false;

    // Broadcast disconnection
    wss.clients.forEach(clientWs => {
        if (clientWs.readyState === 1) {
            clientWs.send(JSON.stringify({ 
                type: 'STATUS', 
                connected: false,
                reason: 'Robot closed connection'
            }));
        }
    });

    // Retry logic
    console.log('[Proxy] Retrying connection in 5 seconds...');
    setTimeout(connectRobot, 5000);
});

// Handle Frontend Connections
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`[Proxy] ✓ Frontend client connected from ${clientIp}`);

    // Send initial connection status
    ws.send(JSON.stringify({ 
        type: 'STATUS', 
        connected: isRobotConnected,
        robotIp: ROBOT_IP,
        robotPort: ROBOT_PORT
    }));

    // Poll Robot Data Loop
    const pollInterval = setInterval(async () => {
        if (!isRobotConnected) return;

        try {
            // Read real Modbus data from robot
            // Assuming registers contain 16-bit values
            // Adjust addresses based on robot documentation
            const response = await client.readHoldingRegisters(0, 20);
            const registers = response.response.body.values;
            
            // Parse registers into coordinates and joints
            // This is a placeholder - adjust based on actual robot register map
            // Example: assuming 32-bit values (2 registers per value)
            const coords = {
                x: registers[0] + (registers[1] << 16),  // Registers 0-1
                y: registers[2] + (registers[3] << 16),  // Registers 2-3
                z: registers[4] + (registers[5] << 16)   // Registers 4-5
            };
            
            const joints = [
                registers[6] + (registers[7] << 16),   // J1: Registers 6-7
                registers[8] + (registers[9] << 16),   // J2: Registers 8-9
                registers[10] + (registers[11] << 16), // J3: Registers 10-11
                registers[12] + (registers[13] << 16), // J4: Registers 12-13
                registers[14] + (registers[15] << 16), // J5: Registers 14-15
                registers[16] + (registers[17] << 16)  // J6: Registers 16-17
            ];

            ws.send(JSON.stringify({
                type: 'TELEMETRY',
                coords: coords,
                joints: joints
            }));

        } catch (e) {
            console.error('[Proxy] Read Error:', e.message);
            // Send zeros on error to keep frontend updated
            ws.send(JSON.stringify({
                type: 'TELEMETRY',
                coords: { x: 0, y: 0, z: 0 },
                joints: [0, 0, 0, 0, 0, 0]
            }));
        }
    }, 100); // 10Hz

    ws.on('close', () => {
        console.log('[Proxy] Frontend client disconnected');
        clearInterval(pollInterval);
    });

    ws.on('error', (err) => {
        console.error('[Proxy] Frontend WebSocket error:', err.message);
    });

    // Handle Commands from Frontend (Write Registers)
    ws.on('message', (msg) => {
        try {
            const cmd = JSON.parse(msg.toString());
            console.log(`[Proxy] ← CMD: ${cmd.cmd || 'UNKNOWN'}`, cmd.params ? JSON.stringify(cmd.params) : '');

            if (cmd.cmd === 'CONNECT') {
                console.log(`[Proxy] Handshake request received for robot at ${cmd.target?.ip}:${cmd.target?.port}`);
                
                // Send confirmation to client
                ws.send(JSON.stringify({
                    type: 'STATUS',
                    connected: isRobotConnected,
                    robotIp: cmd.target?.ip || ROBOT_IP,
                    robotPort: cmd.target?.port || ROBOT_PORT
                }));
                
                // Attempt to connect or reconnect
                if (!isRobotConnected) {
                    connectRobot();
                }
            }

            if (cmd.type === 'WRITE_REGISTER') {
                // client.writeSingleRegister(cmd.addr, cmd.val);
                console.log(`[Proxy] Write Reg ${cmd.addr} -> ${cmd.val}`);
            }
        } catch (e) {
            console.error('[Proxy] Message parse error:', e.message);
        }
    });
});

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
