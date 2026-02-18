# ER Series Robot Communication Protocol Setup

This document explains how to use the ER Series Industrial Robot communication protocol (RCS2 V1.5.3) implemented in this project.

## Protocol Overview

Based on the official manual `docs/ER_series_3D_vision_manual_RCS2_V1.5.3.txt`:

- **Robot**: Acts as TCP **Server**
- **Vision System (this app)**: Acts as TCP **Client**
- **Communication**: String-based commands over TCP
- **Proxy**: WebSocket proxy server for browser connectivity

## Architecture

```
┌─────────────┐     WebSocket     ┌─────────────┐     TCP      ┌────────┐
│   Browser   │ ◄──────────────► │   Proxy     │ ◄──────────► │ Robot  │
│  (Frontend) │    ws://:3000     │   (Node.js) │  TCP:502     │ (TCP)  │
└─────────────┘                   └─────────────┘              └────────┘
```

## Command Format

### Request Format
```
[Command();id=X]
```

### Response Format
```
[id = X; Ok; data]    // Success
[id = X; FAIL]        // Failure
```

### Special Responses
```
[FeedMovFinish: X]     // Motion completed
[ActMovFinish: X]      // Action completed
[RobotStop: X]         // Robot stopped
[SafeDoorIsOpen: X]    // Safety door open
```

## Configuration

### Environment Variables (.env)

```bash
# Robot Connection Settings
VITE_ROBOT_IP=192.168.1.100
VITE_ROBOT_PORT=502

# WebSocket Proxy Server
VITE_PROXY_URL=ws://localhost:3000
VITE_PROXY_PORT=3000
```

## Usage Examples

### 1. Connect to Robot

```typescript
import { robotService } from './services/robotState';

// Start connection
robotService.connect();

// Disconnect
robotService.disconnect();
```

### 2. Get Robot Position

```typescript
// Get current joint position (Section 3.5)
await robotService.getCurrentJointPosition();
// Response: Updates state.joints [J1, J2, J3, J4, J5, J6]

// Get current world position with CFG (Section 3.39)
await robotService.getCurrentWorldPosition();
// Response: Updates state.coordinates {x, y, z, a, b, c, mod, cf1-cf6}
```

### 3. Move Robot

```typescript
// Move to joint position (Section 3.42)
await robotService.moveToJointPosition(
  [0, 0, 0, 0, 90, 0],  // Joint angles
  50,                    // Speed (0-100)
  100                    // Blend radius
);

// Move to world position (Section 3.42)
await robotService.moveToWorldPosition(
  2100,   // X (mm)
  -100,   // Y (mm)
  1700,   // Z (mm)
  0,      // A (degrees)
  0,      // B (degrees)
  0,      // C (degrees)
  50,     // Speed
  100     // Blend
);
```

### 4. Control IO

```typescript
// Set digital output (Section 3.7)
await robotService.setDigitalOutput(11, 1);  // IO index 11, value 1

// Get digital input (Section 3.8)
const response = await robotService.getDigitalInput(1);
console.log(`DI[1] = ${response?.data}`);
```

### 5. Variables

```typescript
import { VarType, Scope } from './services/robotProtocol';

// Set integer variable (Section 3.41)
await robotService.setVariable(
  VarType.INT,
  'INT0',
  '65',
  Scope.GLOBAL
);

// Get real/float variable (Section 3.40)
const response = await robotService.getVariable(
  VarType.REAL,
  'RealTimeX',
  Scope.GLOBAL
);
console.log(`Value: ${response?.data}`);
```

### 6. Robot Control

```typescript
import { RobotMode } from './services/robotProtocol';

// Change mode (Section 3.9)
await robotService.changeMode(RobotMode.AUTO);  // 0=MANUAL, 1=AUTO, 2=REMOTE

// Get run status (Section 3.13)
await robotService.getRunStatus();
// 0=INIT, 1=RUNNING, 2=PAUSED, 3=STOPPED, 4=ERROR

// Reset error (Section 3.14)
await robotService.resetError();

// Get error ID (Section 3.15)
await robotService.getErrorId();

// Enable/disable servo (Section 3.23)
await robotService.setServoEnabled(true);

// Stop all motion (Section 3.17)
await robotService.stopMotion();

// Start program (Section 3.16)
await robotService.startProgram();

// Set global speed (Section 3.11)
await robotService.setGlobalSpeed(50);  // 0-100%
```

## Available Commands

### Position Commands (Section 3.1-3.2)
- `setPointPos()` - Set point position
- `getPointPos()` - Get point position

### Variable Commands (Section 3.3-3.4, 3.40-3.41)
- `setVarV3()` - Set variable (V3)
- `getVarV3()` - Get variable (V3)

### Position Feedback (Section 3.5-3.6, 3.39)
- `getCurJPos()` - Get current joint position
- `getCurWPos()` - Get current world position (legacy)
- `getCurWPosV3()` - Get current world position with CFG

### IO Commands (Section 3.7-3.8, 3.48-3.49)
- `setIOValue()` - Set IO value
- `ioGetDout()` - Get digital output
- `ioGetDin()` - Get digital input
- `ioGetAout()` - Get analog output
- `ioGetAin()` - Get analog input
- `ioGetSimDout()` - Get virtual digital output
- `ioGetSimDin()` - Get virtual digital input
- `ioGetSimAout()` - Get virtual analog output
- `ioGetSimAin()` - Get virtual analog input

### Mode Commands (Section 3.9-3.12)
- `changeMode()` - Change robot mode
- `getCurSysMode()` - Get current system mode
- `setGoableSpeed()` - Set global speed
- `getGoableSpeed()` - Get global speed
- `setRunMode()` - Set run mode (single/continuous)

### Status Commands (Section 3.13-3.15)
- `getRobotRunStatus()` - Get robot run status
- `resetErrorId()` - Reset error
- `getErrorId()` - Get error ID

### Program Control (Section 3.16-3.22)
- `startRun()` - Start program
- `stopRun()` - Stop program
- `loadUserPrjProg()` - Load program file
- `unloadUserPrj()` - Unload project
- `unloadUserProg()` - Unload program
- `isRobotMoving()` - Check if robot is moving
- `isProgramLoaded()` - Check if program is loaded
- `setPc()` - Set PC pointer

### Servo Commands (Section 3.23-3.24)
- `setMotServoStatus()` - Set servo status
- `getServoSts()` - Get servo status

### Coordinate System (Section 3.25-3.28, 3.36-3.37, 3.43-3.44)
- `setCoordType()` - Set coordinate type
- `getCurCoordType()` - Get current coordinate type
- `setTool()` - Select tool coordinate
- `setCoord()` - Select user coordinate
- `getToolV3()` - Get current tool
- `getUserCoordV3()` - Get current user coordinate
- `jogMotion()` - Jog motion
- `jogMotionStop()` - Stop jog motion

### Motion Commands (Section 3.30-3.34, 3.42, 3.45)
- `moveToSelectPoint()` - Move to point (no blend)
- `moveToSelectPointb()` - Move to point (with blend)
- `stopDestPosMotion()` - Stop destination motion
- `teachSelectPoint()` - Teach point
- `moveWithSearch()` - Move with search
- `movePointV3()` - Move point V3
- `moveFinish()` - Move finish signal

### Payload & Safety (Section 3.35, 3.38)
- `setPayload()` - Set payload
- `setRTtoErr()` - Set robot error

### Soft Limits (Section 3.46-3.47)
- `getSoftLimits()` - Get soft limits
- `setSoftLimits()` - Set soft limits

### Utility (Section 3.50)
- `clear3dCmds()` - Clear 3D command buffer

## Running the Application

### 1. Start the Proxy Server
```bash
npm run server
```

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Start Both (Recommended)
```bash
npm start
```

## Testing Connection

1. **Check robot is reachable:**
   ```bash
   ping 192.168.1.100
   ```

2. **Check robot TCP port:**
   ```bash
   telnet 192.168.1.100 502
   ```

3. **Check proxy is running:**
   ```bash
   netstat -an | find "3000"
   ```

## Troubleshooting

### Robot Not Connecting
- Verify robot IP and port in `.env`
- Ensure robot is in TCP Server mode
- Check firewall settings
- Verify network connectivity

### Commands Timeout
- Robot may be in error state
- Check safety door is closed
- Verify servo is enabled
- Check command queue is not full

### WebSocket Connection Failed
- Ensure proxy server is running (`npm run server`)
- Check port 3000 is not in use
- Verify `VITE_PROXY_URL` in `.env`

## Protocol Reference

For complete command details, see:
- `docs/ER_series_3D_vision_manual_RCS2_V1.5.3.txt`
- Section 3: Visual Commands
- Section 5: 3D Vision Debugging

## Type Definitions

```typescript
// Command Types
enum CommandType {
  STATUS_IO_VAR_READ = 1,  // Read interfaces
  STATUS_IO_VAR_SET = 2,   // Set interfaces
  MOTION = 3               // Motion commands
}

// Robot Modes
enum RobotMode {
  MANUAL = 0,
  AUTO = 1,
  REMOTE = 2
}

// Run Status
enum RunStatus {
  PROG_INIT = 0,
  PROG_RUNNING = 1,
  PROG_PAUSED = 2,
  PROG_STOPPED = 3,
  PROG_ERROR = 4
}

// Variable Types
enum VarType {
  INT = 1,
  REAL = 2,
  APOS = 3,
  CPOS = 4,
  STRING = 5,
  ARRAY = 6,
  CPOS_WITH_CFG = 7,
  TOOL = 8,
  USERCOORD = 9
}

// Scope/Domain
enum Scope {
  SYSTEM = 0,
  GLOBAL = 1,
  PROJECT = 2,
  PROGRAM = 3
}
```
