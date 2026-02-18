import { reactive, readonly } from 'vue';

// Define the shape of our robot state
interface LogEntry {
  id: number;
  time: string;
  type: 'info' | 'warn' | 'error' | 'success' | 'cmd';
  msg: string;
}

interface RobotState {
  isConnected: boolean;
  connection: {
    address: string;
    port: number;
    protocol: string;
  };
  mode: 'MANUAL' | 'AUTO';
  coordinates: {
    x: number;
    y: number;
    z: number;
    r: number;
    p: number;
    y_rot: number;
  };
  joints: number[]; // J1 - J6
  camera: {
    hasSignal: boolean;
    targets: any[];
  };
  logs: LogEntry[];
}

// Initial State - DISCONNECTED by default
const state = reactive<RobotState>({
  isConnected: false,
  connection: {
    address: import.meta.env.VITE_ROBOT_IP || '192.168.1.100',
    port: Number(import.meta.env.VITE_ROBOT_PORT) || 502,
    protocol: 'MODBUS-TCP'
  },
  mode: 'MANUAL',
  coordinates: { x: 0, y: 0, z: 0, r: 0, p: 0, y_rot: 0 },
  joints: [0, 0, 0, 0, 0, 0],
  camera: {
    hasSignal: false,
    targets: []
  },
  logs: []
});

/**
 * Service to handle actual data flow.
 */
export const robotService = {
  state: readonly(state),

  addLog(msg: string, type: LogEntry['type'] = 'info') {
    const now = new Date();
    state.logs.push({
      id: Date.now() + Math.random(),
      time: now.toLocaleTimeString(),
      type,
      msg
    });
    if (state.logs.length > 100) state.logs.shift();
  },

  connect() {
    if (state.isConnected) {
      this.addLog('Already connected, skipping...', 'warn');
      return;
    }

    const proxyUrl = import.meta.env.VITE_PROXY_URL || 'ws://localhost:3000';
    const robotIp = import.meta.env.VITE_ROBOT_IP || '192.168.1.100';
    const robotPort = import.meta.env.VITE_ROBOT_PORT || 502;

    this.addLog('=== CONNECTION STARTED ===', 'info');
    this.addLog(`ENV Settings:`, 'info');
    this.addLog(`  VITE_ROBOT_IP: ${robotIp}`, 'info');
    this.addLog(`  VITE_ROBOT_PORT: ${robotPort}`, 'info');
    this.addLog(`  VITE_PROXY_URL: ${proxyUrl}`, 'info');
    this.addLog(`Attempting WebSocket connection to: ${proxyUrl}`, 'info');

    let ws: WebSocket;
    try {
      ws = new WebSocket(proxyUrl);
    } catch (e: any) {
      this.addLog(`CRITICAL ERROR: Failed to create WebSocket: ${e.message}`, 'error');
      this.addLog(`Check if proxy URL is valid: ${proxyUrl}`, 'error');
      state.isConnected = false;
      return;
    }

    const connectionTimeout = setTimeout(() => {
      if (!state.isConnected) {
        this.addLog(`CONNECTION TIMEOUT: No response from proxy server after 10s`, 'error');
        this.addLog(`Possible causes:`, 'warn');
        this.addLog(`  1. Proxy server is not running (start with: npm run server)`, 'warn');
        this.addLog(`  2. Wrong proxy address: ${proxyUrl}`, 'warn');
        this.addLog(`  3. Firewall blocking connection`, 'warn');
        ws.close();
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      this.addLog('✓ WebSocket connection established', 'success');
      this.addLog(`Sending handshake to robot at ${state.connection.address}:${state.connection.port}...`, 'info');
      state.isConnected = true;
      
      // Send initial handshake
      const handshake = JSON.stringify({
        cmd: 'CONNECT',
        target: { ip: state.connection.address, port: state.connection.port }
      });
      ws.send(handshake);
      this.addLog(`Handshake sent: ${handshake}`, 'cmd');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.addLog(`RECV: ${JSON.stringify(data)}`, 'info');

        if (data.type === 'STATUS') {
          if (data.connected) {
            this.addLog('✓ Robot connection confirmed', 'success');
          } else {
            this.addLog(`✗ Robot connection failed: ${data.error || 'Unknown error'}`, 'error');
          }
        }
        if (data.type === 'TELEMETRY') {
          state.coordinates = data.coords || state.coordinates;
          state.joints = data.joints || state.joints;
        }
        if (data.type === 'ERROR') {
          this.addLog(`ROBOT ERROR: ${data.message}`, 'error');
        }
      } catch (e: any) {
        this.addLog(`Parse error: ${e.message} | Raw data: ${event.data}`, 'error');
      }
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      state.isConnected = false;
      this.addLog('✗ WebSocket connection closed', 'error');
      this.addLog(`Close code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`, 'error');
      
      if (event.code === 1006) {
        this.addLog('Code 1006: Abnormal closure - server unreachable', 'error');
        this.addLog(`Troubleshooting:`, 'warn');
        this.addLog(`  • Check if proxy server is running on localhost:3000`, 'warn');
        this.addLog(`  • Verify .env file has correct VITE_PROXY_URL`, 'warn');
        this.addLog(`  • Run: netstat -an | find "3000" to check if port is listening`, 'warn');
      } else if (event.code === 1007) {
        this.addLog('Code 1007: Invalid frame payload data', 'error');
      } else if (event.code === 1008) {
        this.addLog('Code 1008: Policy violation', 'error');
      } else if (event.code === 1009) {
        this.addLog('Code 1009: Message too big', 'error');
      }
    };

    ws.onerror = (error) => {
      this.addLog('✗ WebSocket error occurred', 'error');
      this.addLog(`Error details: ${error}`, 'error');
      this.addLog('Check browser console (F12) for more details', 'warn');
    };
  },

  disconnect() {
      this.addLog('Manual Disconnect Triggered', 'warn');
      state.isConnected = false;
  },

  sendCommand(cmd: string, params: any = {}) {
    if (!state.isConnected) {
        this.addLog(`Failed to send ${cmd}: No connection`, 'error');
        return;
    }
    // const payload = JSON.stringify({ cmd, params });
    this.addLog(`SENT: ${cmd} ${JSON.stringify(params)}`, 'cmd');
    // In real app: ws.send(payload);
  },

  toggleDemoMode(enabled: boolean) {
    if (enabled) {
        this.addLog('DEMO MODE STARTED', 'success');
        state.isConnected = true;
        state.camera.hasSignal = true;
        startSimulation();
    } else {
        this.addLog('DEMO MODE STOPPED', 'warn');
        state.isConnected = false;
        state.camera.hasSignal = false;
        stopSimulation();
    }
  }
};

// --- SIMULATION LOGIC ---
let simTimer: number | null = null;

function startSimulation() {
  if (simTimer) return;
  const start = Date.now();
  
  simTimer = window.setInterval(() => {
    const elapsed = (Date.now() - start) / 1000;
    
    state.coordinates.x = +(300 + Math.sin(elapsed) * 15).toFixed(1);
    state.coordinates.y = +(150 + Math.cos(elapsed * 0.8) * 15).toFixed(1);
    state.coordinates.z = +(50 + Math.sin(elapsed * 0.5) * 10).toFixed(1);
    
    state.joints = state.joints.map((_, i) => {
       const offset = i * 0.5;
       return +(Math.sin(elapsed * 0.5 + offset) * 90).toFixed(1);
    });

    if (Math.random() > 0.95) {
        const cmds = ['MOVJ', 'MOVL', 'SET_OUT', 'GET_POS'];
        const randomCmd = cmds[Math.floor(Math.random() * cmds.length)];
        robotService.sendCommand(randomCmd as string, { t: Date.now() % 1000 });
    }

    if (Math.random() > 0.8) {
       state.camera.targets = [{ x: 50, y: 50, w: 10, h: 10, cls: 'TEST', conf: 0.99 }];
    } else {
       state.camera.targets = [];
    }
  }, 50);
}

function stopSimulation() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  state.coordinates = { x: 0, y: 0, z: 0, r: 0, p: 0, y_rot: 0 };
  state.joints = [0, 0, 0, 0, 0, 0];
  state.camera.targets = [];
}

