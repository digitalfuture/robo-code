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
    if (state.isConnected) return;
    
    const proxyUrl = import.meta.env.VITE_PROXY_URL || 'ws://localhost:3000';
    this.addLog(`Connecting to Proxy at ${proxyUrl}...`, 'info');
    const ws = new WebSocket(proxyUrl);

    ws.onopen = () => {
        this.addLog('Proxy Connected', 'success');
        this.addLog(`Handshaking with Robot at ${state.connection.address}:${state.connection.port}...`, 'info');
        state.isConnected = true;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'STATUS') {
                // state.isConnected = data.connected;
            }
            if (data.type === 'TELEMETRY') {
                state.coordinates = data.coords || state.coordinates;
                state.joints = data.joints || state.joints;
            }
        } catch (e) {
            console.error('Parse err', e);
        }
    };

    ws.onclose = () => {
        this.addLog('Proxy Disconnected', 'error');
        state.isConnected = false;
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

