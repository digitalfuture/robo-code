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

// --- MODBUS REGISTER MAP (PLACEHOLDERS based on standard industrial robots) ---
// We need to verify these exact addresses from "ECM04101-EN-04..." PDF
const REG_COORDS_START = 1000; // X, Y, Z, R, P, Y
const REG_JOINTS_START = 1100; // J1 - J6
const REG_STATUS       = 2000; // Status / Alarms

const wss = new WebSocketServer({ port: PORT });
const socket = new net.Socket();
const client = new jsmodbus.client.TCP(socket);

let isRobotConnected = false;

console.log(`[Proxy] Server started on port ${PORT}`);

// Connect to Robot
const connectRobot = () => {
    console.log(`[Proxy] Connecting to Robot at ${ROBOT_IP}:${ROBOT_PORT}...`);
    socket.connect({ host: ROBOT_IP, port: ROBOT_PORT });
};

socket.on('connect', () => {
    console.log('[Proxy] Robot Connected via Modbus TCP');
    isRobotConnected = true;
});

socket.on('error', (err) => {
    console.warn(`[Proxy] Robot Connection Error: ${err.message}`);
    isRobotConnected = false;
    // Retry logic could go here
    setTimeout(connectRobot, 5000);
});

socket.on('close', () => {
    console.log('[Proxy] Robot Connection Closed');
    isRobotConnected = false;
});

// Handle Frontend Connections
wss.on('connection', (ws) => {
    console.log('[Proxy] Frontend Client Connected');

    // Send connection status immediately
    ws.send(JSON.stringify({ type: 'STATUS', connected: isRobotConnected }));

    // Poll Robot Data Loop
    const pollInterval = setInterval(async () => {
        if (!isRobotConnected) return;

        try {
            // READ CARTESIAN (Assuming 6 registers * 2 bytes, or 32-bit float?)
            // Industrial robots often use 32-bit floats for precision, taking 2 registers per value.
            // Start with simple holding register read
            
            // Example Poll: Read 12 registers starting at REG_COORDS_START
            // const coords = await client.readHoldingRegisters(REG_COORDS_START, 12); 
            
            // MOCK DATA for "Blind" Implementation until we can test
            // In reality, we would do:
            // const res = await client.readHoldingRegisters(100, 10);
            // const data = res.response.body.values;
            
            // Sending Mock "Real" data structure
            ws.send(JSON.stringify({
                type: 'TELEMETRY',
                coords: { x: 0, y: 0, z: 0 }, // Replace with parsed Modbus data
                joints: [0,0,0,0,0,0]
            }));

        } catch (e) {
            console.error('[Proxy] Read Error:', e);
        }
    }, 100); // 10Hz

    ws.on('close', () => clearInterval(pollInterval));
    
    // Handle Commands from Frontend (Write Registers)
    ws.on('message', (msg) => {
        const cmd = JSON.parse(msg.toString());
        if (cmd.type === 'WRITE_REGISTER') {
            // client.writeSingleRegister(cmd.addr, cmd.val);
            console.log(`[Proxy] Write Reg ${cmd.addr} -> ${cmd.val}`);
        }
    });
});

// Start initial connection attempt
connectRobot();
