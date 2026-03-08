/**
 * Robot Diagnostics Service
 * 
 * Provides comprehensive robot status checking and testing capabilities.
 * Based on ESTUN Modbus TCP Register Map (Port 1502)
 * 
 * @module robotDiagnostics
 */

import { robotService } from './robotState';

/**
 * Robot Status Register Bits (Register 40004 / MBDataBuffer[3])
 */
export interface RobotStatusRegister {
  isManualMode: boolean;      // bit0
  isAutoMode: boolean;        // bit1
  isRemoteMode: boolean;      // bit2
  isServoEnabled: boolean;    // bit3
  isRunning: boolean;         // bit4
  hasError: boolean;          // bit5
  isProgramRunning: boolean;  // bit6
  isInMotion: boolean;        // bit7
}

/**
 * Command Status Register Bits (Register 40018 / MBDataBuffer[18])
 */
export interface CommandStatusRegister {
  commandIsZero: boolean;         // bit0
  emergencyStopOK: boolean;       // bit1
  startCommandOK: boolean;        // bit2
  stopCommandOK: boolean;         // bit3
  resetCommandOK: boolean;        // bit4
  enableUpCommandOK: boolean;     // bit5
  enableDownCommandOK: boolean;   // bit6
  loadProjectOK: boolean;         // bit7
  logoutProjectOK: boolean;       // bit8
  setGlobalSpeedOK: boolean;      // bit9
  waitingForControl: boolean;     // bit10
  waitingForCommand: boolean;     // bit11
  commandExecutionComplete: boolean;  // bit12
  commandExecutionError: boolean;     // bit13
}

/**
 * Complete Robot Diagnostics State
 */
export interface DiagnosticsState {
  isConnected: boolean;
  canAcceptCommands: boolean;
  robotStatus: RobotStatusRegister | null;
  commandStatus: CommandStatusRegister | null;
  globalSpeed: number;
  projectName: string;
  digitalOutputs: {
    do1_16: number;
    do17_32: number;
    do33_48: number;
    do49_64: number;
  };
  rawRegisters: number[];
  lastUpdate: Date | null;
  errors: string[];
}

/**
 * Diagnostic Test Result
 */
export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const initialDiagnosticsState: DiagnosticsState = {
  isConnected: false,
  canAcceptCommands: false,
  robotStatus: null,
  commandStatus: null,
  globalSpeed: 0,
  projectName: '',
  digitalOutputs: {
    do1_16: 0,
    do17_32: 0,
    do33_48: 0,
    do49_64: 0
  },
  rawRegisters: [],
  lastUpdate: null,
  errors: []
};

let diagnosticsState = { ...initialDiagnosticsState };

/**
 * Parse Robot Status Register (40004)
 * 
 * Register bits:
 * - bit0: Manual Mode
 * - bit1: Automatic Mode
 * - bit2: Remote Operation Mode
 * - bit3: Enable Status (Servo)
 * - bit4: Running Status
 * - bit5: Error Status
 * - bit6: Program Running Status
 * - bit7: Robot in Motion
 */
function parseRobotStatusRegister(value: number): RobotStatusRegister {
  return {
    isManualMode: (value & 0x01) !== 0,
    isAutoMode: (value & 0x02) !== 0,
    isRemoteMode: (value & 0x04) !== 0,
    isServoEnabled: (value & 0x08) !== 0,
    isRunning: (value & 0x10) !== 0,
    hasError: (value & 0x20) !== 0,
    isProgramRunning: (value & 0x40) !== 0,
    isInMotion: (value & 0x80) !== 0
  };
}

/**
 * Parse Command Status Register (40018)
 * 
 * Register bits for command execution feedback
 */
function parseCommandStatusRegister(value: number): CommandStatusRegister {
  return {
    commandIsZero: (value & 0x01) !== 0,
    emergencyStopOK: (value & 0x02) !== 0,
    startCommandOK: (value & 0x04) !== 0,
    stopCommandOK: (value & 0x08) !== 0,
    resetCommandOK: (value & 0x10) !== 0,
    enableUpCommandOK: (value & 0x20) !== 0,
    enableDownCommandOK: (value & 0x40) !== 0,
    loadProjectOK: (value & 0x80) !== 0,
    logoutProjectOK: (value & 0x100) !== 0,
    setGlobalSpeedOK: (value & 0x200) !== 0,
    waitingForControl: (value & 0x400) !== 0,
    waitingForCommand: (value & 0x800) !== 0,
    commandExecutionComplete: (value & 0x1000) !== 0,
    commandExecutionError: (value & 0x2000) !== 0
  };
}

/**
 * Decode project name from registers (20 bytes = 10 registers)
 */
function decodeProjectName(registers: number[]): string {
  try {
    const bytes: number[] = [];
    for (let i = 0; i < 10 && i < registers.length; i++) {
      const value = registers[i] ?? 0;
      bytes.push(value & 0xFF);
      bytes.push((value >> 8) & 0xFF);
    }
    // Convert to string, stop at null terminator
    let name = '';
    for (let i = 0; i < bytes.length; i += 2) {
      const byte1 = bytes[i] ?? 0;
      const byte2 = bytes[i + 1] ?? 0;
      if (byte1 === 0 && byte2 === 0) break;
      if (byte1 !== 0) name += String.fromCharCode(byte1);
      if (byte2 !== 0) name += String.fromCharCode(byte2);
    }
    return name.trim() || 'No project loaded';
  } catch {
    return 'Unknown';
  }
}

/**
 * Main Diagnostics Service
 */
export const robotDiagnostics = {
  get state(): DiagnosticsState {
    return diagnosticsState;
  },

  reset() {
    diagnosticsState = { ...initialDiagnosticsState };
  },

  /**
   * Read all diagnostic registers from robot
   * Reads registers 40001-40020 (20 registers starting from address 0)
   */
  async readDiagnostics(): Promise<DiagnosticsState> {
    const errors: string[] = [];

    // Check connection
    if (!robotService.state.isConnected) {
      errors.push('Not connected to robot');
      diagnosticsState = {
        ...diagnosticsState,
        isConnected: false,
        canAcceptCommands: false,
        errors
      };
      return diagnosticsState;
    }

    try {
      // Read status registers (40002-40020 = addresses 1-19)
      // Note: Modbus addresses are 0-based, so 40001 = address 0
      robotService.readModbusRegisters(1, 19);

      // Wait for data to be received (poll state)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the latest register data from robotService state
      const rawRegisters = robotService.state.lastRegisters;

      if (rawRegisters.length < 19) {
        errors.push(`Incomplete register data received (${rawRegisters.length}/19)`);
      }

      // Parse registers
      // Register 40002 (index 0): Global speed
      const globalSpeed = rawRegisters[0] ?? 0;

      // Register 40004 (index 2): Robot status
      const robotStatusValue = rawRegisters[2] ?? 0;
      const robotStatus = parseRobotStatusRegister(robotStatusValue);

      // Register 40005-40013 (indices 3-11): Project name
      const projectNameRegisters = rawRegisters.slice(3, 13);
      const projectName = decodeProjectName(projectNameRegisters);

      // Register 40014-40017 (indices 12-15): Digital outputs
      const digitalOutputs = {
        do1_16: rawRegisters[12] ?? 0,
        do17_32: rawRegisters[13] ?? 0,
        do33_48: rawRegisters[14] ?? 0,
        do49_64: rawRegisters[15] ?? 0
      };

      // Register 40018 (index 16): Command status
      const commandStatusValue = rawRegisters[16] ?? 0;
      const commandStatus = parseCommandStatusRegister(commandStatusValue);

      // Determine if robot can accept commands
      const canAcceptCommands =
        robotStatus.isRemoteMode &&
        !robotStatus.hasError &&
        commandStatus.emergencyStopOK &&
        !commandStatus.commandExecutionError;

      diagnosticsState = {
        isConnected: true,
        canAcceptCommands,
        robotStatus,
        commandStatus,
        globalSpeed,
        projectName,
        digitalOutputs,
        rawRegisters: [...rawRegisters],
        lastUpdate: new Date(),
        errors
      };

      robotService.addLog(
        `Diagnostics: Mode=${robotStatus.isRemoteMode ? 'REMOTE' : 'MANUAL'}, ` +
        `Servo=${robotStatus.isServoEnabled ? 'ON' : 'OFF'}, ` +
        `Error=${robotStatus.hasError ? 'YES' : 'NO'}, ` +
        `CanAcceptCommands=${canAcceptCommands ? 'YES' : 'NO'}`,
        canAcceptCommands ? 'success' : 'warn'
      );

    } catch (error: any) {
      errors.push(`Read error: ${error.message}`);
      robotService.addLog(`Diagnostics read failed: ${error.message}`, 'error');
      
      diagnosticsState = {
        ...diagnosticsState,
        isConnected: false,
        canAcceptCommands: false,
        errors
      };
    }

    return diagnosticsState;
  },

  /**
   * Run comprehensive diagnostic tests
   */
  async runDiagnosticTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    robotService.addLog('=== STARTING DIAGNOSTIC TESTS ===', 'info');

    // Test 1: Connection Check
    const connectionTest: TestResult = {
      name: 'Connection Check',
      passed: robotService.state.isConnected,
      message: robotService.state.isConnected 
        ? 'Connected to robot' 
        : 'Not connected to robot'
    };
    results.push(connectionTest);
    robotService.addLog(
      `Test 1: ${connectionTest.name} - ${connectionTest.passed ? 'PASS' : 'FAIL'}`,
      connectionTest.passed ? 'success' : 'error'
    );

    if (!connectionTest.passed) {
      robotService.addLog('Skipping remaining tests - no connection', 'error');
      return results;
    }

    // Test 2: Read Robot Status
    try {
      await this.readDiagnostics();
      const status = diagnosticsState.robotStatus;
      
      const statusTest: TestResult = {
        name: 'Robot Status Read',
        passed: status !== null,
        message: status 
          ? `Mode: ${status.isRemoteMode ? 'REMOTE' : status.isAutoMode ? 'AUTO' : 'MANUAL'}`
          : 'Failed to read status',
        details: status
      };
      results.push(statusTest);
      robotService.addLog(
        `Test 2: ${statusTest.name} - ${statusTest.passed ? 'PASS' : 'FAIL'}`,
        statusTest.passed ? 'success' : 'error'
      );
    } catch (error: any) {
      results.push({
        name: 'Robot Status Read',
        passed: false,
        message: error.message
      });
    }

    // Test 3: Check Mode (should be REMOTE for commands)
    const modeTest: TestResult = {
      name: 'Remote Mode Check',
      passed: diagnosticsState.robotStatus?.isRemoteMode ?? false,
      message: diagnosticsState.robotStatus?.isRemoteMode
        ? 'Robot is in REMOTE mode'
        : 'Robot is NOT in REMOTE mode - switch key or enable remote',
      details: diagnosticsState.robotStatus
    };
    results.push(modeTest);
    robotService.addLog(
      `Test 3: ${modeTest.name} - ${modeTest.passed ? 'PASS' : 'FAIL'}`,
      modeTest.passed ? 'success' : 'warn'
    );

    // Test 4: Check for Errors
    const errorTest: TestResult = {
      name: 'Error Status Check',
      passed: !diagnosticsState.robotStatus?.hasError,
      message: diagnosticsState.robotStatus?.hasError
        ? 'Robot has active errors - reset required'
        : 'No active errors',
      details: diagnosticsState.robotStatus
    };
    results.push(errorTest);
    robotService.addLog(
      `Test 4: ${errorTest.name} - ${errorTest.passed ? 'PASS' : 'FAIL'}`,
      errorTest.passed ? 'success' : 'warn'
    );

    // Test 5: Emergency Stop Check
    const estopTest: TestResult = {
      name: 'Emergency Stop Check',
      passed: diagnosticsState.commandStatus?.emergencyStopOK ?? false,
      message: diagnosticsState.commandStatus?.emergencyStopOK
        ? 'Emergency stop is OK (released)'
        : 'Emergency stop is ACTIVE',
      details: diagnosticsState.commandStatus
    };
    results.push(estopTest);
    robotService.addLog(
      `Test 5: ${estopTest.name} - ${estopTest.passed ? 'PASS' : 'FAIL'}`,
      estopTest.passed ? 'success' : 'error'
    );

    // Test 6: Servo Enable Check
    const servoTest: TestResult = {
      name: 'Servo Enable Check',
      passed: diagnosticsState.robotStatus?.isServoEnabled ?? false,
      message: diagnosticsState.robotStatus?.isServoEnabled
        ? 'Servo is enabled'
        : 'Servo is disabled',
      details: diagnosticsState.robotStatus
    };
    results.push(servoTest);
    robotService.addLog(
      `Test 6: ${servoTest.name} - ${servoTest.passed ? 'PASS' : 'FAIL'}`,
      servoTest.passed ? 'success' : 'warn'
    );

    // Test 7: Command Write Test (write 0x11 to register 40051)
    const writeTest: TestResult = {
      name: 'Command Permission Test',
      passed: false,
      message: 'Not tested yet',
      details: null
    };
    
    try {
      robotService.addLog('Testing command write (40051 = 0x11)...', 'cmd');
      // Note: This will be implemented when we have writeModbusRegister exposed
      // For now, mark as pending
      writeTest.passed = false;
      writeTest.message = 'Write test requires robotService.writeModbusRegister';
    } catch (error: any) {
      writeTest.passed = false;
      writeTest.message = `Write failed: ${error.message}`;
    }
    results.push(writeTest);
    robotService.addLog(
      `Test 7: ${writeTest.name} - ${writeTest.passed ? 'PASS' : 'FAIL'}`,
      writeTest.passed ? 'success' : 'error'
    );

    // Summary
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    
    robotService.addLog(
      `=== DIAGNOSTIC TESTS COMPLETE: ${passedCount}/${totalCount} PASSED ===`,
      passedCount === totalCount ? 'success' : 'warn'
    );

    return results;
  },

  /**
   * Get human-readable summary of robot state
   */
  getSummary(): string {
    const s = diagnosticsState;
    const r = diagnosticsState.robotStatus;
    const c = diagnosticsState.commandStatus;

    if (!s.isConnected) return '❌ Not connected';

    const lines = [
      `🔗 Connection: ${s.isConnected ? 'OK' : 'FAIL'}`,
      `🎮 Mode: ${r?.isRemoteMode ? 'REMOTE' : r?.isAutoMode ? 'AUTO' : 'MANUAL'}`,
      `⚡ Servo: ${r?.isServoEnabled ? 'ON ✓' : 'OFF ✗'}`,
      `❌ Error: ${r?.hasError ? 'ACTIVE' : 'None'}`,
      `🏃 Running: ${r?.isRunning ? 'YES' : 'NO'}`,
      `🤖 In Motion: ${r?.isInMotion ? 'YES' : 'NO'}`,
      `📋 Program: ${r?.isProgramRunning ? 'RUNNING' : 'STOPPED'}`,
      ` Project: ${s.projectName}`,
      `🚀 Commands: ${s.canAcceptCommands ? 'ACCEPTING ✓' : 'BLOCKED ✗'}`,
      `🛑 E-Stop: ${c?.emergencyStopOK ? 'OK' : 'ACTIVE'}`,
      `⚙️  Speed: ${s.globalSpeed}%`
    ];

    return lines.join('\n');
  }
};
