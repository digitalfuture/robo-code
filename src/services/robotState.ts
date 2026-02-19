import { reactive, readonly } from 'vue';
import {
  ProtocolParser,
  CommandBuilder,
  RobotMode,
  RunStatus,
  Scope,
  VarType,
  IOType,
  type CommandResponse
} from './robotProtocol';

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
  mode: 'MANUAL' | 'AUTO' | 'REMOTE';
  coordinates: {
    x: number;
    y: number;
    z: number;
    a: number;
    b: number;
    c: number;
    mod?: number;
    cf1?: number;
    cf2?: number;
    cf3?: number;
    cf4?: number;
    cf5?: number;
    cf6?: number;
  };
  joints: number[]; // J1 - J6
  runStatus: RunStatus;
  errorId: number | null;
  servoEnabled: boolean;
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
    protocol: 'Modbus TCP'
  },
  mode: 'MANUAL',
  coordinates: { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 },
  joints: [0, 0, 0, 0, 0, 0],
  runStatus: RunStatus.PROG_STOPPED,
  errorId: null,
  servoEnabled: false,
  camera: {
    hasSignal: false,
    targets: []
  },
  logs: []
});

// WebSocket instance
let ws: WebSocket | null = null;

/**
 * Service to handle actual data flow using ER Series Robot Protocol.
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

  clearLogs() {
    state.logs = [];
    this.addLog('Logs cleared', 'info');
  },

  /**
   * Connect to robot via proxy server using TCP string protocol
   */
  connect() {
    if (state.isConnected) {
      this.addLog('Already connected, skipping...', 'warn');
      return;
    }

    const proxyUrl = import.meta.env.VITE_PROXY_URL || 'ws://localhost:3000';
    const robotIp = import.meta.env.VITE_ROBOT_IP || '192.168.1.100';
    const robotPort = Number(import.meta.env.VITE_ROBOT_PORT) || 502;
    const protocol = robotPort === 502 ? 'Modbus TCP' : 'TCP String (ER Series RCS2 V1.5.3)';

    this.addLog('=== CONNECTION STARTED ===', 'info');
    this.addLog(`Protocol: ${protocol}`, 'info');
    this.addLog(`ENV Settings:`, 'info');
    this.addLog(`  VITE_ROBOT_IP: ${robotIp}`, 'info');
    this.addLog(`  VITE_ROBOT_PORT: ${robotPort}`, 'info');
    this.addLog(`  VITE_PROXY_URL: ${proxyUrl}`, 'info');
    this.addLog(`Attempting WebSocket connection to: ${proxyUrl}`, 'info');

    try {
      ws = new WebSocket(proxyUrl);
    } catch (e: any) {
      this.addLog(`CRITICAL ERROR: Failed to create WebSocket: ${e.message}`, 'error');
      state.isConnected = false;
      return;
    }

    const connectionTimeout = setTimeout(() => {
      if (!state.isConnected) {
        this.addLog(`CONNECTION TIMEOUT: No response from proxy server after 10s`, 'error');
        this.addLog(`Possible causes:`, 'warn');
        this.addLog(`  1. Proxy server is not running (npm run server)`, 'warn');
        this.addLog(`  2. Wrong proxy address: ${proxyUrl}`, 'warn');
        this.addLog(`  3. Firewall blocking connection`, 'warn');
        ws?.close();
      }
    }, 10000);

    ws.onopen = () => {
      clearTimeout(connectionTimeout);
      this.addLog('✓ WebSocket connection established', 'success');
      state.isConnected = true;

      // Send handshake to proxy
      const handshake = JSON.stringify({
        cmd: 'CONNECT',
        target: { ip: robotIp, port: robotPort }
      });
      ws?.send(handshake);
      this.addLog(`Handshake sent: ${handshake}`, 'cmd');
      
      // Request robot data after connection
      setTimeout(() => {
        if (robotPort === 502) {
          // Modbus TCP - read holding registers
          this.addLog('Reading Modbus registers...', 'info');
          this.readModbusRegisters(0, 20);
        } else {
          // TCP String Protocol
          this.addLog('Requesting robot status...', 'info');
          this.getRunStatus();
        }
      }, 2000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'STATUS') {
          if (data.connected) {
            this.addLog('✓ Robot connection confirmed', 'success');
            // Update protocol if provided by server
            if (data.protocol) {
              state.connection.protocol = data.protocol;
            }
          } else {
            this.addLog(`✗ Robot connection failed: ${data.error || 'Unknown error'}`, 'error');
            state.isConnected = false;
          }
        }

        if (data.type === 'ROBOT_RESPONSE') {
          this.addLog(`← Robot: ${data.response}`, 'info');

          // Parse response and update state
          const response = ProtocolParser.parseResponse(data.response);
          if (response) {
            this.handleRobotResponse(response);
          }
        }

        if (data.type === 'REGISTER_DATA') {
          // Modbus TCP register data received
          this.addLog(`Modbus registers: ${JSON.stringify(data.values)}`, 'info');
          this.handleModbusData(data.values);
        }

        if (data.type === 'HEARTBEAT') {
          this.addLog('♥ Heartbeat received', 'info');
        }

        if (data.type === 'ERROR') {
          this.addLog(`ROBOT ERROR: ${data.message}`, 'error');
        }
      } catch (e: any) {
        this.addLog(`Parse error: ${e.message} | Raw: ${event.data}`, 'error');
      }
    };

    ws.onclose = (event) => {
      clearTimeout(connectionTimeout);
      state.isConnected = false;
      this.addLog('✗ WebSocket connection closed', 'error');
      this.addLog(`Code: ${event.code}, Reason: ${event.reason || 'No reason'}`, 'error');

      if (event.code === 1006) {
        this.addLog('Code 1006: Server unreachable', 'error');
        this.addLog(`Check: npm run server`, 'warn');
      }
    };

    ws.onerror = () => {
      this.addLog('✗ WebSocket error', 'error');
      this.addLog('Server may be offline', 'warn');
    };
  },

  /**
   * Handle parsed robot response and update state
   */
  handleRobotResponse(response: CommandResponse) {
    // Update state based on response type
    if (!response.success) {
      this.addLog(`Command ${response.id} failed: ${response.error}`, 'error');
      return;
    }

    // Response data handling based on command type
    if (response.data) {
      // Check for motion finish
      if (response.data.type === 'MOVE_FINISH') {
        this.addLog(`Motion completed (ID: ${response.id})`, 'success');
      }
      if (response.data.type === 'ROBOT_STOP') {
        this.addLog(`Robot stopped (ID: ${response.id})`, 'warn');
        state.runStatus = RunStatus.PROG_STOPPED;
      }
      if (response.data.type === 'SAFE_DOOR_OPEN') {
        this.addLog(`Safety door open! (ID: ${response.id})`, 'error');
      }
    }
  },

  disconnect() {
    this.addLog('Manual Disconnect', 'warn');
    state.isConnected = false;
    ws?.close();
    ws = null;
  },

  /**
   * Read Modbus holding registers
   */
  readModbusRegisters(address: number, count: number) {
    if (!ws || !state.isConnected) {
      this.addLog('Cannot read Modbus: No connection', 'error');
      return;
    }

    ws.send(JSON.stringify({
      type: 'READ_REGISTER',
      addr: address,
      count: count
    }));

    this.addLog(`Reading Modbus registers ${address}-${address + count - 1}`, 'cmd');
  },

  /**
   * Write Modbus holding register
   */
  writeModbusRegister(address: number, value: number) {
    if (!ws || !state.isConnected) {
      this.addLog('Cannot write Modbus: No connection', 'error');
      return;
    }

    ws.send(JSON.stringify({
      type: 'WRITE_REGISTER',
      addr: address,
      val: value
    }));

    this.addLog(`Write Modbus ${address} -> ${value}`, 'cmd');
  },

  /**
   * Jog robot via Modbus (placeholder - needs actual register addresses)
   */
  jogRobotModbus(axis: string, direction: number) {
    // This is a placeholder - actual implementation depends on robot's Modbus register map
    // Common pattern: write to jog command register
    // axis: 'X', 'Y', 'Z', 'Rx', 'Ry', 'Rz' or 'J1'-'J6'
    // direction: 1 for positive, -1 for negative
    
    // Example (addresses are placeholders):
    const jogRegisters: Record<string, number> = {
      'X': 100, 'Y': 101, 'Z': 102,
      'Rx': 103, 'Ry': 104, 'Rz': 105,
      'J1': 110, 'J2': 111, 'J3': 112,
      'J4': 113, 'J5': 114, 'J6': 115
    };
    
    const reg = jogRegisters[axis];
    if (reg) {
      const value = direction * 100; // Speed value
      this.writeModbusRegister(reg, value);
      this.addLog(`Jog ${axis}${direction > 0 ? '+' : '-'}`, 'cmd');
    }
  },

  /**
   * Handle Modbus register data
   */
  handleModbusData(values: number[]) {
    // Try to extract coordinates and joints from registers
    // This is a placeholder - actual register mapping depends on robot configuration

    // Registers 0-2: X, Y, Z coordinates (example)
    if (values.length >= 3) {
      const newX = values[0] || 0;
      const newY = values[1] || 0;
      const newZ = values[2] || 0;

      // Only log if values changed significantly
      const changed = Math.abs(newX - state.coordinates.x) > 10 ||
                      Math.abs(newY - state.coordinates.y) > 10 ||
                      Math.abs(newZ - state.coordinates.z) > 10;

      state.coordinates.x = newX;
      state.coordinates.y = newY;
      state.coordinates.z = newZ;

      if (changed) {
        this.addLog(`Coordinates: X=${state.coordinates.x}, Y=${state.coordinates.y}, Z=${state.coordinates.z}`, 'info');
      }
    }

    // Registers 3-8: Joint angles J1-J6 (example)
    if (values.length >= 9) {
      state.joints = values.slice(3, 9);
    }
  },

  /**
   * Scan Modbus registers to find changing values (for mapping discovery)
   * Reads registers in batches and logs which ones change over time
   */
  scanModbusRegisters(startAddress: number, count: number, scanDuration: number = 10000) {
    if (!ws || !state.isConnected) {
      this.addLog('Cannot scan: No connection', 'error');
      return;
    }

    this.addLog(`Starting register scan: ${startAddress}-${startAddress + count - 1}`, 'info');
    this.addLog(`Scan duration: ${scanDuration}ms`, 'info');

    const baselineValues = new Map<number, number>();
    const changingRegisters = new Set<number>();
    const scanStartTime = Date.now();

    // First, get baseline readings
    const getBaseline = async () => {
      return new Promise<void>((resolve) => {
        const handler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'REGISTER_DATA') {
              data.values.forEach((value: number, index: number) => {
                baselineValues.set(startAddress + index, value);
              });
              ws?.removeEventListener('message', handler);
              resolve();
            }
          } catch (e) {
            // Ignore parse errors
          }
        };
        ws?.addEventListener('message', handler);

        ws?.send(JSON.stringify({
          type: 'READ_REGISTER',
          addr: startAddress,
          count: count
        }));

        setTimeout(() => {
          ws?.removeEventListener('message', handler);
          resolve();
        }, 2000);
      });
    };

    // Then monitor for changes
    const monitorChanges = () => {
      const checkInterval = setInterval(() => {
        if (Date.now() - scanStartTime > scanDuration) {
          clearInterval(checkInterval);
          this.addLog('=== SCAN COMPLETE ===', 'success');
          if (changingRegisters.size > 0) {
            this.addLog(`Changing registers found: ${Array.from(changingRegisters).join(', ')}`, 'success');
            this.addLog(`These registers may contain dynamic data (coordinates, joints, status)`, 'info');
          } else {
            this.addLog('No changing registers detected', 'warn');
          }
          return;
        }

        // Read current values and compare
        const handler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'REGISTER_DATA') {
              data.values.forEach((value: number, index: number) => {
                const addr = startAddress + index;
                const baseline = baselineValues.get(addr);
                if (baseline !== undefined && value !== baseline) {
                  changingRegisters.add(addr);
                  this.addLog(`Register ${addr}: ${baseline} → ${value}`, 'info');
                  baselineValues.set(addr, value); // Update baseline
                }
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        };
        ws?.addEventListener('message', handler);

        ws?.send(JSON.stringify({
          type: 'READ_REGISTER',
          addr: startAddress,
          count: count
        }));

        setTimeout(() => {
          ws?.removeEventListener('message', handler);
        }, 500);
      }, 1000);
    };

    // Start the scan
    getBaseline().then(() => {
      this.addLog('Baseline acquired, monitoring for changes...', 'info');
      monitorChanges();
    });
  },

  /**
   * Send raw command to robot
   */
  async sendCommand(command: string): Promise<CommandResponse | null> {
    if (!ws || !state.isConnected) {
      this.addLog(`Failed to send: No connection`, 'error');
      return null;
    }

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROBOT_RESPONSE') {
            const response = ProtocolParser.parseResponse(data.response);
            if (response) {
              ws?.removeEventListener('message', handler);
              resolve(response);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws?.addEventListener('message', handler);

      // Send command through proxy
      ws?.send(JSON.stringify({
        type: 'ROBOT_COMMAND',
        command
      }));

      this.addLog(`→ Robot: ${command}`, 'cmd');

      // Timeout
      setTimeout(() => {
        ws?.removeEventListener('message', handler);
        resolve({ id: 0, success: false, error: 'Timeout' });
      }, 5000);
    });
  },

  // ========== HIGH-LEVEL ROBOT COMMANDS ==========

  /**
   * Get current joint position (Section 3.5)
   */
  async getCurrentJointPosition() {
    const command = CommandBuilder.getCurJPos();
    const response = await this.sendCommand(command);
    if (response?.success && response.data) {
      const joints = ProtocolParser.parseJointPosition(response.data);
      if (joints) {
        state.joints = [joints.j1, joints.j2, joints.j3, joints.j4, joints.j5, joints.j6];
        this.addLog(`Joints: ${state.joints.map(j => j.toFixed(2)).join(', ')}`, 'info');
      }
    }
    return response;
  },

  /**
   * Get current world position with CFG (Section 3.39)
   */
  async getCurrentWorldPosition() {
    const command = CommandBuilder.getCurWPosV3();
    const response = await this.sendCommand(command);
    if (response?.success && response.data) {
      const pos = ProtocolParser.parseWorldPositionV3(response.data);
      if (pos) {
        state.coordinates = {
          x: pos.x, y: pos.y, z: pos.z,
          a: pos.a, b: pos.b, c: pos.c,
          mod: pos.mod,
          cf1: pos.cf1, cf2: pos.cf2, cf3: pos.cf3,
          cf4: pos.cf4, cf5: pos.cf5, cf6: pos.cf6
        };
        this.addLog(`Position: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`, 'info');
      }
    }
    return response;
  },

  /**
   * Move to joint position (Section 3.42)
   */
  async moveToJointPosition(joints: number[], speed: number = 50, blend: number = 100) {
    const pointPos = joints.map(j => j.toFixed(3)).join('_');
    const param = `0_${speed}_${blend}`;
    const command = CommandBuilder.movePointV3(1, pointPos, '', param);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`MoveJ started (ID: ${response.id})`, 'success');
    }
    return response;
  },

  /**
   * Move to world position (Section 3.42)
   */
  async moveToWorldPosition(x: number, y: number, z: number, a: number, b: number, c: number,
                            speed: number = 50, blend: number = 100) {
    const pointPos = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}_${a.toFixed(3)}_${b.toFixed(3)}_${c.toFixed(3)}`;
    const param = `0_${speed}_${blend}`;
    const command = CommandBuilder.movePointV3(2, pointPos, '', param);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`MoveL started (ID: ${response.id})`, 'success');
    }
    return response;
  },

  /**
   * Set digital output (Section 3.7)
   */
  async setDigitalOutput(ioIndex: number, value: number) {
    const command = CommandBuilder.setIOValue(ioIndex, IOType.DOUT, value);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`DO[${ioIndex}] = ${value}`, 'success');
    }
    return response;
  },

  /**
   * Get digital input (Section 3.8)
   */
  async getDigitalInput(ioIndex: number) {
    const command = CommandBuilder.ioGetDin(ioIndex);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`DI[${ioIndex}] = ${response.data}`, 'info');
    }
    return response;
  },

  /**
   * Set variable (Section 3.41)
   */
  async setVariable(varType: VarType, varName: string, value: string, scope: Scope = Scope.GLOBAL) {
    const command = CommandBuilder.setVarV3(varType, varName, value, scope);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`Set ${varName} = ${value}`, 'success');
    }
    return response;
  },

  /**
   * Get variable (Section 3.40)
   */
  async getVariable(varType: VarType, varName: string, scope: Scope = Scope.GLOBAL) {
    const command = CommandBuilder.getVarV3(varType, varName, scope);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`${varName} = ${response.data}`, 'info');
    }
    return response;
  },

  /**
   * Change robot mode (Section 3.9)
   */
  async changeMode(mode: RobotMode) {
    const command = CommandBuilder.changeMode(mode);
    const response = await this.sendCommand(command);
    if (response?.success) {
      state.mode = mode === RobotMode.MANUAL ? 'MANUAL' : mode === RobotMode.AUTO ? 'AUTO' : 'REMOTE';
      this.addLog(`Mode changed to: ${state.mode}`, 'success');
    }
    return response;
  },

  /**
   * Get robot run status (Section 3.13)
   */
  async getRunStatus() {
    const command = CommandBuilder.getRobotRunStatus();
    const response = await this.sendCommand(command);
    if (response?.success && typeof response.data === 'number') {
      state.runStatus = response.data as RunStatus;
      const statusText = ['INIT', 'RUNNING', 'PAUSED', 'STOPPED', 'ERROR'][response.data];
      this.addLog(`Run status: ${statusText}`, 'info');
    }
    return response;
  },

  /**
   * Reset error (Section 3.14)
   */
  async resetError() {
    const command = CommandBuilder.resetErrorId();
    const response = await this.sendCommand(command);
    if (response?.success) {
      state.errorId = null;
      this.addLog('Error reset', 'success');
    }
    return response;
  },

  /**
   * Get error ID (Section 3.15)
   */
  async getErrorId() {
    const command = CommandBuilder.getErrorId();
    const response = await this.sendCommand(command);
    if (response?.success) {
      state.errorId = response.data;
      this.addLog(`Error ID: ${response.data}`, response.data ? 'error' : 'info');
    }
    return response;
  },

  /**
   * Enable/disable servo (Section 3.23)
   */
  async setServoEnabled(enabled: boolean) {
    const command = CommandBuilder.setMotServoStatus(enabled);
    const response = await this.sendCommand(command);
    if (response?.success) {
      state.servoEnabled = enabled;
      this.addLog(`Servo ${enabled ? 'ON' : 'OFF'}`, 'success');
    }
    return response;
  },

  /**
   * Stop all motion (Section 3.17)
   */
  async stopMotion() {
    const command = CommandBuilder.stopRun();
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog('Motion stopped', 'warn');
      state.runStatus = RunStatus.PROG_STOPPED;
    }
    return response;
  },

  /**
   * Start program (Section 3.16)
   */
  async startProgram() {
    const command = CommandBuilder.startRun();
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog('Program started', 'success');
      state.runStatus = RunStatus.PROG_RUNNING;
    }
    return response;
  },

  /**
   * Set global speed (Section 3.11)
   */
  async setGlobalSpeed(speed: number) {
    const command = CommandBuilder.setGoableSpeed(speed);
    const response = await this.sendCommand(command);
    if (response?.success) {
      this.addLog(`Global speed: ${speed}%`, 'success');
    }
    return response;
  },

  // ========== DEMO MODE ==========

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

// --- SIMULATION LOGIC (for demo/testing) ---
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
  state.coordinates = { x: 0, y: 0, z: 0, a: 0, b: 0, c: 0 };
  state.joints = [0, 0, 0, 0, 0, 0];
  state.camera.targets = [];
}
