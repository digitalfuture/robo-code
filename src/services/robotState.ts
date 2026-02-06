import { reactive, readonly } from 'vue';

// Define the shape of our robot state
interface RobotState {
  isConnected: boolean;
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
  }
}

// Initial State - DISCONNECTED by default
const state = reactive<RobotState>({
  isConnected: false,
  mode: 'MANUAL',
  coordinates: { x: 0, y: 0, z: 0, r: 0, p: 0, y_rot: 0 },
  joints: [0, 0, 0, 0, 0, 0],
  camera: {
    hasSignal: false,
    targets: []
  }
});

/**
 * Service to handle actual data flow.
 * Currently just a skeleton for the real connection.
 */
export const robotService = {
  state: readonly(state),

  connect() {
    if (state.isConnected) return;
    
    // Connect to our Local Node.js Proxy (which bridges to Modbus TCP)
    console.log(`[Service] Connecting to Proxy at ws://localhost:3000...`);
    const ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('[Service] Proxy Connected');
        state.isConnected = true;
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'STATUS') {
                // state.isConnected = data.connected; // Proxy tells us if IT is connected to robot
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
        console.log('[Service] Proxy Disconnected');
        state.isConnected = false;
    };
    
    // Store WS instance if needed for sending commands
    // (We would need to add a command method to the service)
  },

  disconnect() {
      // Close WS
      state.isConnected = false;
      // In a real implementation we'd store the ws variable outside to close it
  },

  // This method will be called when we receive real data packet
  updateTelemetry() {
    // Legacy / Direct update
  },
  
  // Call this to simulate a connection for DEMO purposes only (Explicit user action)
  toggleDemoMode(enabled: boolean) {
    if (enabled) {
        state.isConnected = true;
        state.camera.hasSignal = true;
        startSimulation();
    } else {
        state.isConnected = false;
        state.camera.hasSignal = false;
        stopSimulation();
    }
  }
};

// --- SIMULATION LOGIC (Moved out of components) ---
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

    // Simulate occasional target detection
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
  // Reset values
  state.coordinates = { x: 0, y: 0, z: 0, r: 0, p: 0, y_rot: 0 };
  state.joints = [0, 0, 0, 0, 0, 0];
  state.camera.targets = [];
}
