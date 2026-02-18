/**
 * Robot Protocol Service
 * Implements ER Series Robot 3D Vision Communication Protocol (RCS2 V1.5.3)
 * 
 * Protocol:
 * - Robot acts as TCP Client
 * - Vision system (this app) acts as TCP Server
 * - Command format: [Command();id=X]
 * - Response format: [id = X; Ok; data] or [id = X; FAIL]
 */

// Command Types based on manual Section 3
export const CommandType = {
  STATUS_IO_VAR_READ: 1,  // Read interfaces (status, IO, variables)
  STATUS_IO_VAR_SET: 2,   // Set interfaces
  MOTION: 3               // Motion commands
} as const;
export type CommandType = typeof CommandType[keyof typeof CommandType];

// Coordinate types
export const CoordType = {
  JOINT: 0,
  WORLD: 1,
  TOOL: 2,
  USER: 3
} as const;
export type CoordType = typeof CoordType[keyof typeof CoordType];

// Robot modes
export const RobotMode = {
  MANUAL: 0,
  AUTO: 1,
  REMOTE: 2
} as const;
export type RobotMode = typeof RobotMode[keyof typeof RobotMode];

// Program run modes
export const RunMode = {
  SINGLE_STEP: 1,
  CONTINUOUS: 2
} as const;
export type RunMode = typeof RunMode[keyof typeof RunMode];

// Robot run status
export const RunStatus = {
  PROG_INIT: 0,
  PROG_RUNNING: 1,
  PROG_PAUSED: 2,
  PROG_STOPPED: 3,
  PROG_ERROR: 4
} as const;
export type RunStatus = typeof RunStatus[keyof typeof RunStatus];

// IO Types
export const IOType = {
  DOUT: 1,      // Digital Output
  AOUT: 2,      // Analog Output
  SIM_DI: 11,   // Virtual Digital Input
  SIM_DOUT: 12, // Virtual Digital Output
  SIM_AIN: 13,  // Virtual Analog Input
  SIM_AOUT: 14  // Virtual Analog Output
} as const;
export type IOType = typeof IOType[keyof typeof IOType];

// Variable types for GetVarV3/SetVarV3
export const VarType = {
  INT: 1,
  REAL: 2,
  APOS: 3,
  CPOS: 4,
  STRING: 5,
  ARRAY: 6,
  CPOS_WITH_CFG: 7,
  TOOL: 8,
  USERCOORD: 9,
  TOOL_WITH_PAYLOAD: 10
} as const;
export type VarType = typeof VarType[keyof typeof VarType];

// Scope/Domain for variables
export const Scope = {
  SYSTEM: 0,
  GLOBAL: 1,
  PROJECT: 2,
  PROGRAM: 3
} as const;
export type Scope = typeof Scope[keyof typeof Scope];

// Command response interface
export interface CommandResponse {
  id: number;
  success: boolean;
  data?: any;
  error?: string;
}

// Pending command tracking
interface PendingCommand {
  id: number;
  command: string;
  resolve: (response: CommandResponse) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeout?: number;
}

// Robot position interfaces
export interface WorldPosition {
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
}

export interface JointPosition {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
}

export interface APOSData {
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  a7?: number;
  a8?: number;
  a9?: number;
  a10?: number;
  a11?: number;
  a12?: number;
  a13?: number;
  a14?: number;
  a15?: number;
  a16?: number;
}

export interface CPOSData {
  mod: number;
  cf1: number;
  cf2: number;
  cf3: number;
  cf4: number;
  cf5: number;
  cf6: number;
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
}

export interface ToolData {
  id: number;
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
  M?: number;
  Mx?: number;
  My?: number;
  Mz?: number;
  Ixx?: number;
  Iyy?: number;
  Izz?: number;
  Ixy?: number;
  Ixz?: number;
  Iyz?: number;
}

export interface UserCoordData {
  id: number;
  x: number;
  y: number;
  z: number;
  a: number;
  b: number;
  c: number;
}

/**
 * Protocol Parser - Parse robot command responses
 */
export class ProtocolParser {
  /**
   * Parse response from robot
   * Format: [id = X; Ok; data] or [id = X; FAIL]
   */
  static parseResponse(response: string): CommandResponse | null {
    const trimmed = response.trim();
    
    // Match response pattern
    const failMatch = trimmed.match(/^\[id\s*=\s*(\d+)\s*;\s*FAIL\s*\]$/i);
    if (failMatch && failMatch[1]) {
      return {
        id: parseInt(failMatch[1]),
        success: false,
        error: 'Command failed'
      };
    }

    const okMatch = trimmed.match(/^\[id\s*=\s*(\d+)\s*;\s*Ok\s*(;.*)?\]$/i);
    if (okMatch && okMatch[1]) {
      const id = parseInt(okMatch[1]);
      const dataPart = okMatch[2];
      
      let data: any = null;
      if (dataPart && dataPart.length > 1) {
        // Remove leading semicolon and parse data
        data = this.parseData(dataPart.substring(1).trim());
      }
      
      return { id, success: true, data };
    }

    // Special responses
    const movFinishMatch = trimmed.match(/^\[(FeedMovFinish|ActMovFinish):\s*(\d+)\]$/i);
    if (movFinishMatch) {
      return {
        id: parseInt(movFinishMatch[2] || '0'),
        success: true,
        data: { type: 'MOVE_FINISH', motionType: movFinishMatch[1] || '' }
      };
    }

    const robotStopMatch = trimmed.match(/^\[RobotStop:\s*(\d+)\]$/i);
    if (robotStopMatch) {
      return {
        id: parseInt(robotStopMatch[1] || '0'),
        success: false,
        error: 'Robot stopped',
        data: { type: 'ROBOT_STOP' }
      };
    }

    const safeDoorMatch = trimmed.match(/^\[SafeDoorIsOpen:\s*(\d+)\]$/i);
    if (safeDoorMatch) {
      return {
        id: parseInt(safeDoorMatch[1] || '0'),
        success: false,
        error: 'Safety door is open',
        data: { type: 'SAFE_DOOR_OPEN' }
      };
    }

    return null;
  }

  /**
   * Parse data portion of response
   */
  private static parseData(dataStr: string | undefined): any {
    if (!dataStr) return null;
    
    // Try to parse as space-separated numbers
    const spaceValues = dataStr.split(/\s+/).map(s => {
      const num = parseFloat(s);
      return isNaN(num) ? s : num;
    });

    if (spaceValues.length > 1) {
      return spaceValues;
    }

    // Single value
    if (spaceValues.length === 1) {
      const val = spaceValues[0];
      if (typeof val === 'number') return val;
      if (val === 'Ok') return null;
      return val;
    }

    return dataStr;
  }

  /**
   * Parse world position with CFG values (GetCurWPosV3 response)
   * Format: mod cf1 cf2 cf3 cf4 cf5 cf6 x y z a b c
   */
  static parseWorldPositionV3(values: number[]): CPOSData | null {
    if (values.length < 13) return null;
    return {
      mod: values[0] ?? 0,
      cf1: values[1] ?? 0,
      cf2: values[2] ?? 0,
      cf3: values[3] ?? 0,
      cf4: values[4] ?? 0,
      cf5: values[5] ?? 0,
      cf6: values[6] ?? 0,
      x: values[7] ?? 0,
      y: values[8] ?? 0,
      z: values[9] ?? 0,
      a: values[10] ?? 0,
      b: values[11] ?? 0,
      c: values[12] ?? 0
    };
  }

  /**
   * Parse joint position (GetCurJPos response)
   * Format: J1 J2 J3 J4 J5 J6
   */
  static parseJointPosition(values: number[]): JointPosition | null {
    if (values.length < 6) return null;
    return {
      j1: values[0] ?? 0,
      j2: values[1] ?? 0,
      j3: values[2] ?? 0,
      j4: values[3] ?? 0,
      j5: values[4] ?? 0,
      j6: values[5] ?? 0
    };
  }

  /**
   * Parse APOS data
   * Format: a1 a2 a3 a4 a5 a6 a7 ... a16
   */
  static parseAPOS(values: number[]): APOSData | null {
    if (values.length < 6) return null;
    return {
      a1: values[0] ?? 0,
      a2: values[1] ?? 0,
      a3: values[2] ?? 0,
      a4: values[3] ?? 0,
      a5: values[4] ?? 0,
      a6: values[5] ?? 0,
      a7: values[6] ?? 0,
      a8: values[7] ?? 0,
      a9: values[8] ?? 0,
      a10: values[9] ?? 0,
      a11: values[10] ?? 0,
      a12: values[11] ?? 0,
      a13: values[12] ?? 0,
      a14: values[13] ?? 0,
      a15: values[14] ?? 0,
      a16: values[15] ?? 0
    };
  }

  /**
   * Parse TOOL variable
   * Format: id x y z a b c [M Mx My Mz Ixx Iyy Izz Ixy Ixz Iyz]
   */
  static parseTool(values: number[]): ToolData | null {
    if (values.length < 7) return null;
    return {
      id: values[0] ?? 0,
      x: values[1] ?? 0,
      y: values[2] ?? 0,
      z: values[3] ?? 0,
      a: values[4] ?? 0,
      b: values[5] ?? 0,
      c: values[6] ?? 0,
      M: values[7],
      Mx: values[8],
      My: values[9],
      Mz: values[10],
      Ixx: values[11],
      Iyy: values[12],
      Izz: values[13],
      Ixy: values[14],
      Ixz: values[15],
      Iyz: values[16]
    };
  }

  /**
   * Parse USERCOORD variable
   * Format: id x y z a b c
   */
  static parseUserCoord(values: number[]): UserCoordData | null {
    if (values.length < 7) return null;
    return {
      id: values[0] ?? 0,
      x: values[1] ?? 0,
      y: values[2] ?? 0,
      z: values[3] ?? 0,
      a: values[4] ?? 0,
      b: values[5] ?? 0,
      c: values[6] ?? 0
    };
  }
}

/**
 * Command Builder - Build robot commands according to protocol
 */
export class CommandBuilder {
  private static commandId = 0;

  /**
   * Generate unique command ID
   */
  static generateId(): number {
    this.commandId = (this.commandId + 1) % 10000;
    return this.commandId;
  }

  /**
   * Format command for sending to robot
   */
  static formatCommand(command: string, id: number = this.generateId()): string {
    return `[${command};id=${id}]`;
  }

  // ========== POSITION COMMANDS (Section 3.1-3.2) ==========

  /**
   * 3.1 Set point position
   * SetPointPos_1("P1","1.1_2.2_3.3_4.4_5.5_6.6",0,2)
   */
  static setPointPos(pName: string, value: string, type: number, scope: Scope): string {
    return this.formatCommand(`SetPointPos_1("${pName}","${value}",${type},${scope})`);
  }

  /**
   * 3.2 Get point position
   * CamGetPoint_s("P1",1)
   */
  static getPointPos(pointName: string, scope: Scope): string {
    return this.formatCommand(`CamGetPoint_s("${pointName}",${scope})`);
  }

  // ========== VARIABLE COMMANDS (Section 3.3-3.4, 3.40-3.41) ==========

  /**
   * 3.3 Set variable value (legacy)
   * CamSetVar_1_s("Result","1.0",1,2)
   */
  static setVarLegacy(varName: string, value: string, type: number, scope: Scope): string {
    return this.formatCommand(`CamSetVar_1_s("${varName}","${value}",${type},${scope})`);
  }

  /**
   * 3.4 Get variable value (legacy)
   * CamReadVar_s("Result",2,2)
   */
  static getVarLegacy(varName: string, type: number, scope: Scope): string {
    return this.formatCommand(`CamReadVar_s("${varName}",${type},${scope})`);
  }

  /**
   * 3.40 Get variable V3
   * GetVarV3(1,"INT0",1)
   */
  static getVarV3(varType: VarType, varName: string, scope: Scope): string {
    return this.formatCommand(`GetVarV3(${varType},"${varName}",${scope})`);
  }

  /**
   * 3.41 Set variable V3
   * SetVarV3(1,"INT0","65",1)
   */
  static setVarV3(varType: VarType, varName: string, value: string, scope: Scope): string {
    return this.formatCommand(`SetVarV3(${varType},"${varName}","${value}",${scope})`);
  }

  // ========== POSITION FEEDBACK COMMANDS (Section 3.5-3.6, 3.39) ==========

  /**
   * 3.5 Get current joint position
   * GetCurJPos()
   */
  static getCurJPos(): string {
    return this.formatCommand('GetCurJPos()');
  }

  /**
   * 3.6 Get current world position (legacy)
   * GetCurWPos()
   */
  static getCurWPos(): string {
    return this.formatCommand('GetCurWPos()');
  }

  /**
   * 3.39 Get current world position V3 with CFG values
   * GetCurWPosV3()
   */
  static getCurWPosV3(): string {
    return this.formatCommand('GetCurWPosV3()');
  }

  // ========== IO COMMANDS (Section 3.7-3.8, 3.48-3.49) ==========

  /**
   * 3.7 Set IO value
   * SetIOValue(11,1,1)
   */
  static setIOValue(ioIndex: number, ioType: IOType, value: number): string {
    return this.formatCommand(`SetIOValue(${ioIndex},${ioType},${value})`);
  }

  /**
   * 3.8 Get digital output
   * IOGetDout(1)
   */
  static ioGetDout(ioIndex: number): string {
    return this.formatCommand(`IOGetDout(${ioIndex})`);
  }

  /**
   * 3.8 Get digital input
   * IOGetDin(2)
   */
  static ioGetDin(ioIndex: number): string {
    return this.formatCommand(`IOGetDin(${ioIndex})`);
  }

  /**
   * 3.8 Get analog output
   * IOGetAout(1)
   */
  static ioGetAout(ioIndex: number): string {
    return this.formatCommand(`IOGetAout(${ioIndex})`);
  }

  /**
   * 3.8 Get analog input
   * IOGetAin(1)
   */
  static ioGetAin(ioIndex: number): string {
    return this.formatCommand(`IOGetAin(${ioIndex})`);
  }

  /**
   * 3.8 Get virtual digital output
   * IOGetSimDout(1)
   */
  static ioGetSimDout(ioIndex: number): string {
    return this.formatCommand(`IOGetSimDout(${ioIndex})`);
  }

  /**
   * 3.8 Get virtual digital input
   * IOGetSimDin(2)
   */
  static ioGetSimDin(ioIndex: number): string {
    return this.formatCommand(`IOGetSimDin(${ioIndex})`);
  }

  /**
   * 3.8 Get virtual analog output
   * IOGetSimAout(1)
   */
  static ioGetSimAout(ioIndex: number): string {
    return this.formatCommand(`IOGetSimAout(${ioIndex})`);
  }

  /**
   * 3.8 Get virtual analog input
   * IOGetSimAin(1)
   */
  static ioGetSimAin(ioIndex: number): string {
    return this.formatCommand(`IOGetSimAin(${ioIndex})`);
  }

  /**
   * 3.48 Set multiple IO values
   * setMultiIOValue(...)
   */
  static setMultiIOValue(params: string): string {
    return this.formatCommand(`setMultiIOValue(${params})`);
  }

  /**
   * 3.49 Get multiple IO values
   * GetMultiIOValue(...)
   */
  static getMultiIOValue(params: string): string {
    return this.formatCommand(`GetMultiIOValue(${params})`);
  }

  // ========== ROBOT MODE COMMANDS (Section 3.9-3.10) ==========

  /**
   * 3.9 Change robot mode
   * changemode_IFace(0)
   */
  static changeMode(mode: RobotMode): string {
    return this.formatCommand(`changemode_IFace(${mode})`);
  }

  /**
   * 3.10 Get current system mode
   * getCurSysMode_IFace()
   */
  static getCurSysMode(): string {
    return this.formatCommand('getCurSysMode_IFace()');
  }

  // ========== SPEED & RUN MODE COMMANDS (Section 3.11-3.12) ==========

  /**
   * 3.11 Set global speed
   * setGoableSpeed_IFace(20)
   */
  static setGoableSpeed(speed: number): string {
    return this.formatCommand(`setGoableSpeed_IFace(${speed})`);
  }

  /**
   * 3.12 Set run mode
   * setRunMode_IFace(1)
   */
  static setRunMode(mode: RunMode): string {
    return this.formatCommand(`setRunMode_IFace(${mode})`);
  }

  /**
   * 3.29 Get global speed
   * getGoableSpeed_IFace()
   */
  static getGoableSpeed(): string {
    return this.formatCommand('getGoableSpeed_IFace()');
  }

  // ========== STATUS COMMANDS (Section 3.13-3.15) ==========

  /**
   * 3.13 Get robot run status
   * getRobotRunStatus_IFace()
   */
  static getRobotRunStatus(): string {
    return this.formatCommand('getRobotRunStatus_IFace()');
  }

  /**
   * 3.14 Reset error
   * resetErrorId_IFace()
   */
  static resetErrorId(): string {
    return this.formatCommand('resetErrorId_IFace()');
  }

  /**
   * 3.15 Get error ID
   * getErrorId_IFace()
   */
  static getErrorId(): string {
    return this.formatCommand('getErrorId_IFace()');
  }

  // ========== PROGRAM CONTROL COMMANDS (Section 3.16-3.22) ==========

  /**
   * 3.16 Start program run
   * startRun_IFace()
   */
  static startRun(): string {
    return this.formatCommand('startRun_IFace()');
  }

  /**
   * 3.17 Stop program
   * stopRun_IFace()
   */
  static stopRun(): string {
    return this.formatCommand('stopRun_IFace()');
  }

  /**
   * 3.18 Load program file
   * loadUserPrjProg_IFace("estun","main")
   */
  static loadUserPrjProg(projName: string, progName: string): string {
    return this.formatCommand(`loadUserPrjProg_IFace("${projName}","${progName}")`);
  }

  /**
   * 3.19 Unload project
   * UnloadUserPrj_IFace("estun")
   */
  static unloadUserPrj(projName: string): string {
    return this.formatCommand(`UnloadUserPrj_IFace("${projName}")`);
  }

  /**
   * 3.20 Unload program
   * UnloadUserProg_IFace("estun","main")
   */
  static unloadUserProg(projName: string, progName: string): string {
    return this.formatCommand(`UnloadUserProg_IFace("${projName}","${progName}")`);
  }

  /**
   * 3.21 Check if robot is moving
   * IsRobotMoving_IFace()
   */
  static isRobotMoving(): string {
    return this.formatCommand('IsRobotMoving_IFace()');
  }

  /**
   * 3.21 Check if program is loaded
   * IsProgramLoaded_IFace()
   */
  static isProgramLoaded(): string {
    return this.formatCommand('IsProgramLoaded_IFace()');
  }

  /**
   * 3.22 Set PC pointer
   * SetPc_IFace(6)
   */
  static setPc(index: number): string {
    return this.formatCommand(`SetPc_IFace(${index})`);
  }

  // ========== SERVO COMMANDS (Section 3.23-3.24) ==========

  /**
   * 3.23 Set motor servo status
   * SetMotServoStatus_IFace(1)
   */
  static setMotServoStatus(enabled: boolean): string {
    return this.formatCommand(`SetMotServoStatus_IFace(${enabled ? 1 : 0})`);
  }

  /**
   * 3.24 Get servo status
   * GetServoSts_IFace()
   */
  static getServoSts(): string {
    return this.formatCommand('GetServoSts_IFace()');
  }

  // ========== COORDINATE SYSTEM COMMANDS (Section 3.25-3.26, 3.36-3.37, 3.43-3.44) ==========

  /**
   * 3.25 Set coordinate type
   * SetCoordType_IFace(0)
   */
  static setCoordType(type: CoordType): string {
    return this.formatCommand(`SetCoordType_IFace(${type})`);
  }

  /**
   * 3.26 Get current coordinate type
   * GerCurCoordType_IFace()
   */
  static getCurCoordType(): string {
    return this.formatCommand('GerCurCoordType_IFace()');
  }

  /**
   * 3.36 Set tool
   * SetTool_IFace(1,"TOOL0")
   */
  static setTool(scope: Scope, name: string): string {
    return this.formatCommand(`SetTool_IFace(${scope},"${name}")`);
  }

  /**
   * 3.37 Set user coordinate
   * SetCoord_IFace(0,"USERCOOR0")
   */
  static setCoord(scope: Scope, name: string): string {
    return this.formatCommand(`SetCoord_IFace(${scope},"${name}")`);
  }

  /**
   * 3.43 Get current tool
   * GetToolV3()
   */
  static getToolV3(): string {
    return this.formatCommand('GetToolV3()');
  }

  /**
   * 3.44 Get current user coordinate
   * GetUserCoordV3()
   */
  static getUserCoordV3(): string {
    return this.formatCommand('GetUserCoordV3()');
  }

  // ========== JOG COMMANDS (Section 3.27-3.28) ==========

  /**
   * 3.27 Jog motion
   * JogMotion_IFace(1,1)
   */
  static jogMotion(axisId: number, moveDir: number): string {
    return this.formatCommand(`JogMotion_IFace(${axisId},${moveDir})`);
  }

  /**
   * 3.28 Stop jog motion
   * JogMotionStop_IFace()
   */
  static jogMotionStop(): string {
    return this.formatCommand('JogMotionStop_IFace()');
  }

  // ========== MOTION COMMANDS (Section 3.30-3.32, 3.34, 3.42, 3.45) ==========

  /**
   * 3.30 Move to point (with speed, no blend)
   * MoveToSelectPoint_IFace(1,"0_0_0_0","0_50")
   */
  static moveToSelectPoint(moveType: number, pointPos: string, param: string): string {
    return this.formatCommand(`MoveToSelectPoint_IFace(${moveType},"${pointPos}","${param}")`);
  }

  /**
   * 3.31 Move to point (with speed and blend)
   * MoveToSelectPointb_IFace(1,"0_0_0_0","0_50_100")
   */
  static moveToSelectPointb(moveType: number, pointPos: string, param: string): string {
    return this.formatCommand(`MoveToSelectPointb_IFace(${moveType},"${pointPos}","${param}")`);
  }

  /**
   * 3.32 Stop destination position motion
   * StopDestPosMotion_IFace()
   */
  static stopDestPosMotion(): string {
    return this.formatCommand('StopDestPosMotion_IFace()');
  }

  /**
   * 3.33 Teach select point
   * TeachSelectPoint_IFace("P10",2)
   */
  static teachSelectPoint(pName: string, scopeType: Scope): string {
    return this.formatCommand(`TeachSelectPoint_IFace("${pName}",${scopeType})`);
  }

  /**
   * 3.34 Move with search
   * MoveWithSearch_IFace(1, "0_0_0_0_90_0_0", "10_20_2_10_1")
   */
  static moveWithSearch(moveType: number, pointPos: string, param: string): string {
    return this.formatCommand(`MoveWithSearch_IFace(${moveType},"${pointPos}","${param}")`);
  }

  /**
   * 3.42 Move point V3
   * MovePointV3(1,"0.0_0.0_0.0_0.0_90.0_0.0","","0_100_100")
   * 
   * moveType: 1=Joint motion (joint pos), 2=World motion (world pos), 3=Joint motion (world pos)
   * pointPos: coordinate values separated by underscore
   * cfg: configuration values "mode_cf1_cf2_cf3_cf4_cf5_cf6" or ""
   * param: "height_speed_blend_accuracy"
   */
  static movePointV3(moveType: number, pointPos: string, cfg: string, param: string): string {
    return this.formatCommand(`MovePointV3(${moveType},"${pointPos}","${cfg}","${param}")`);
  }

  /**
   * 3.45 Move finish signal
   * MoveFinsih()
   */
  static moveFinish(): string {
    return this.formatCommand('MoveFinsih()');
  }

  // ========== PAYLOAD & SAFETY COMMANDS (Section 3.35, 3.38) ==========

  /**
   * 3.35 Set payload
   * SetPayload_IFace(1,"PAYLOAD0")
   */
  static setPayload(scope: Scope, payloadName: string): string {
    return this.formatCommand(`SetPayload_IFace(${scope},"${payloadName}")`);
  }

  /**
   * 3.38 Set robot error
   * SetRTtoErr_IFace("testerror100",9999)
   */
  static setRTtoErr(strValue: string, errNum: number): string {
    return this.formatCommand(`SetRTtoErr_IFace("${strValue}",${errNum})`);
  }

  // ========== SOFT LIMITS (Section 3.46-3.47) ==========

  /**
   * 3.46 Get soft limits
   * GetSoftLimits()
   */
  static getSoftLimits(): string {
    return this.formatCommand('GetSoftLimits()');
  }

  /**
   * 3.47 Set soft limits
   * SetSoftLimits(...)
   */
  static setSoftLimits(params: string): string {
    return this.formatCommand(`SetSoftLimits(${params})`);
  }

  // ========== UTILITY COMMANDS (Section 3.50) ==========

  /**
   * 3.50 Clear 3D command buffer
   * Clear3dCmds()
   */
  static clear3dCmds(): string {
    return this.formatCommand('Clear3dCmds()');
  }
}

/**
 * Robot Protocol Client
 * Manages TCP connection and command queue
 */
export class RobotProtocolClient {
  private socket: WebSocket | null = null;
  private pendingCommands: Map<number, PendingCommand> = new Map();
  private commandTimeout: number = 5000; // 5 seconds default timeout
  private isConnected: boolean = false;
  private serverUrl: string;
  private robotIp: string;
  private robotPort: number;

  // Event callbacks
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onResponse?: (response: CommandResponse) => void;
  onError?: (error: Error) => void;

  constructor(serverUrl: string, robotIp: string, robotPort: number) {
    this.serverUrl = serverUrl;
    this.robotIp = robotIp;
    this.robotPort = robotPort;
  }

  /**
   * Connect to robot via proxy server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.onopen = () => {
          console.log('[Protocol] WebSocket connected');
          this.isConnected = true;
          
          // Send handshake to proxy
          this.socket?.send(JSON.stringify({
            cmd: 'CONNECT',
            target: { ip: this.robotIp, port: this.robotPort }
          }));

          this.onConnect?.();
          resolve();
        };

        this.socket.onclose = (event) => {
          console.log('[Protocol] WebSocket closed', event.code, event.reason);
          this.isConnected = false;
          this.rejectAllPending('Connection closed');
          this.onDisconnect?.(event.reason);
        };

        this.socket.onerror = (error) => {
          console.error('[Protocol] WebSocket error', error);
          this.onError?.(new Error('WebSocket connection error'));
          reject(new Error('WebSocket connection error'));
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from robot
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.rejectAllPending('Disconnected');
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Send command to robot
   */
  sendCommand(command: string, timeout?: number): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to robot'));
        return;
      }

      // Extract command ID from the command string
      const idMatch = command.match(/id=(\d+)/);
      if (!idMatch || !idMatch[1]) {
        reject(new Error('Invalid command format - missing ID'));
        return;
      }

      const id = parseInt(idMatch[1]);

      const pending: PendingCommand = {
        id,
        command,
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: timeout || this.commandTimeout
      };

      this.pendingCommands.set(id, pending);

      // Send command through proxy
      this.socket?.send(JSON.stringify({
        type: 'ROBOT_COMMAND',
        command
      }));

      // Set timeout
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error(`Command timeout: ${command}`));
        }
      }, pending.timeout);
    });
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);

      if (message.type === 'ROBOT_RESPONSE') {
        // Parse robot response
        const responseStr = message.response || '';
        const response = ProtocolParser.parseResponse(responseStr);
        if (response) {
          const pending = this.pendingCommands.get(response.id);
          if (pending) {
            this.pendingCommands.delete(response.id);
            if (response.success) {
              pending.resolve(response);
            } else {
              pending.reject(new Error(response.error || 'Command failed'));
            }
            this.onResponse?.(response);
          }
        }
      } else if (message.type === 'STATUS') {
        // Handle status updates
        if (!message.connected) {
          this.isConnected = false;
          this.rejectAllPending(message.error || 'Robot disconnected');
        }
      }
    } catch (error) {
      console.error('[Protocol] Message parse error:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Reject all pending commands
   */
  private rejectAllPending(reason: string) {
    for (const [id, pending] of this.pendingCommands) {
      pending.reject(new Error(reason));
      this.pendingCommands.delete(id);
    }
  }

  // ========== HIGH-LEVEL COMMANDS ==========

  /**
   * Get current joint position
   */
  async getCurrentJointPosition(): Promise<JointPosition> {
    const response = await this.sendCommand(CommandBuilder.getCurJPos());
    if (!response.success || !response.data) {
      throw new Error('Failed to get joint position');
    }
    const parsed = ProtocolParser.parseJointPosition(response.data);
    if (!parsed) {
      throw new Error('Invalid joint position data');
    }
    return parsed;
  }

  /**
   * Get current world position
   */
  async getCurrentWorldPosition(): Promise<CPOSData> {
    const response = await this.sendCommand(CommandBuilder.getCurWPosV3());
    if (!response.success || !response.data) {
      throw new Error('Failed to get world position');
    }
    const parsed = ProtocolParser.parseWorldPositionV3(response.data);
    if (!parsed) {
      throw new Error('Invalid world position data');
    }
    return parsed;
  }

  /**
   * Move to joint position
   */
  async moveToJointPosition(joints: number[], speed: number = 50, blend: number = 100): Promise<void> {
    const pointPos = joints.map(j => j.toFixed(3)).join('_');
    const param = `0_${speed}_${blend}`;
    const response = await this.sendCommand(CommandBuilder.movePointV3(1, pointPos, '', param));
    if (!response.success) {
      throw new Error(`Move failed: ${response.error}`);
    }
  }

  /**
   * Move to world position
   */
  async moveToWorldPosition(x: number, y: number, z: number, a: number, b: number, c: number, 
                            speed: number = 50, blend: number = 100): Promise<void> {
    const pointPos = `${x.toFixed(3)}_${y.toFixed(3)}_${z.toFixed(3)}_${a.toFixed(3)}_${b.toFixed(3)}_${c.toFixed(3)}`;
    const param = `0_${speed}_${blend}`;
    const response = await this.sendCommand(CommandBuilder.movePointV3(2, pointPos, '', param));
    if (!response.success) {
      throw new Error(`Move failed: ${response.error}`);
    }
  }

  /**
   * Set digital output
   */
  async setDigitalOutput(ioIndex: number, value: number): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.setIOValue(ioIndex, IOType.DOUT, value));
    if (!response.success) {
      throw new Error(`Failed to set IO: ${response.error}`);
    }
  }

  /**
   * Get digital input
   */
  async getDigitalInput(ioIndex: number): Promise<number> {
    const response = await this.sendCommand(CommandBuilder.ioGetDin(ioIndex));
    if (!response.success || typeof response.data !== 'number') {
      throw new Error('Failed to get digital input');
    }
    return response.data;
  }

  /**
   * Set variable
   */
  async setVariable(varType: VarType, varName: string, value: string, scope: Scope = Scope.GLOBAL): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.setVarV3(varType, varName, value, scope));
    if (!response.success) {
      throw new Error(`Failed to set variable: ${response.error}`);
    }
  }

  /**
   * Get variable
   */
  async getVariable(varType: VarType, varName: string, scope: Scope = Scope.GLOBAL): Promise<any> {
    const response = await this.sendCommand(CommandBuilder.getVarV3(varType, varName, scope));
    if (!response.success) {
      throw new Error(`Failed to get variable: ${response.error}`);
    }
    return response.data;
  }

  /**
   * Change robot mode
   */
  async changeMode(mode: RobotMode): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.changeMode(mode));
    if (!response.success) {
      throw new Error(`Failed to change mode: ${response.error}`);
    }
  }

  /**
   * Get robot run status
   */
  async getRunStatus(): Promise<RunStatus> {
    const response = await this.sendCommand(CommandBuilder.getRobotRunStatus());
    if (!response.success || typeof response.data !== 'number') {
      throw new Error('Failed to get run status');
    }
    return response.data as RunStatus;
  }

  /**
   * Reset error
   */
  async resetError(): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.resetErrorId());
    if (!response.success) {
      throw new Error(`Failed to reset error: ${response.error}`);
    }
  }

  /**
   * Enable/disable servo
   */
  async setServoEnabled(enabled: boolean): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.setMotServoStatus(enabled));
    if (!response.success) {
      throw new Error(`Failed to set servo: ${response.error}`);
    }
  }

  /**
   * Stop all motion
   */
  async stopMotion(): Promise<void> {
    const response = await this.sendCommand(CommandBuilder.stopRun());
    if (!response.success) {
      throw new Error(`Failed to stop: ${response.error}`);
    }
  }
}

// Export singleton instance helper
export function createRobotClient(
  serverUrl: string = import.meta.env.VITE_PROXY_URL || 'ws://localhost:3000',
  robotIp: string = import.meta.env.VITE_ROBOT_IP || '192.168.1.100',
  robotPort: number = Number(import.meta.env.VITE_ROBOT_PORT) || 502
): RobotProtocolClient {
  return new RobotProtocolClient(serverUrl, robotIp, robotPort);
}
