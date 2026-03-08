# Robot Diagnostics Tests

## Overview

This document describes the diagnostic tests available for the Estun ERC3-C1 robot controller.

## Connection Settings

| Parameter | Value |
|-----------|-------|
| **Virtual Controller IP** | `127.0.0.1` (local development) |
| **Physical Controller IP** | `192.168.6.68` (production) |
| **Modbus TCP Port** | `1502` |
| **Protocol** | Modbus TCP Holding Registers |

---

## Diagnostic Tests

### Test 1: Connection Check ✓

**Purpose:** Verify WebSocket connection to proxy server and Modbus TCP connection to robot.

**What it checks:**
- WebSocket connection to `ws://localhost:3000`
- Robot service connection state

**Expected Result:**
- ✅ PASS: Connected to robot
- ❌ FAIL: Not connected to robot

**Troubleshooting:**
1. Ensure proxy server is running (`npm run server`)
2. Check `.env` configuration
3. Verify robot is powered on and network accessible

---

### Test 2: Robot Status Read ✓

**Purpose:** Read robot status register (40004) via Modbus TCP.

**Register Map (40004 - MBDataBuffer[3]):**
| Bit | Name | Description |
|-----|------|-------------|
| 0 | Manual Mode | Robot in manual mode |
| 1 | Auto Mode | Robot in automatic mode |
| 2 | Remote Mode | Robot in remote control mode |
| 3 | Enable Status | Servo motor enabled |
| 4 | Running Status | Program is running |
| 5 | Error Status | Active error |
| 6 | Program Running | Program loaded and running |
| 7 | In Motion | Robot is currently moving |

**Expected Result:**
- ✅ PASS: Status register read successfully
- ❌ FAIL: Cannot read register

---

### Test 3: Remote Mode Check ⚠️

**Purpose:** Verify robot is in REMOTE mode for external control.

**Requirements:**
- Physical key switch on teach pendant must be in REMOTE position
- OR remote mode enabled via teach pendant menu

**Expected Result:**
- ✅ PASS: Robot is in REMOTE mode
- ⚠️ FAIL: Robot is in MANUAL or AUTO mode

**How to Enable Remote Mode:**
1. Turn key switch to REMOTE position
2. Go to Menu → Settings → Communication
3. Enable "External Control" or "Remote Mode"
4. Save and restart if required

---

### Test 4: Error Status Check ⚠️

**Purpose:** Check if robot has any active errors.

**Expected Result:**
- ✅ PASS: No active errors
- ⚠️ FAIL: Robot has active errors

**How to Reset Errors:**
1. Check teach pendant for error message
2. Press "Reset" button on teach pendant
3. Or send Modbus command: `40052 = 0x10` (reset command)

---

### Test 5: Emergency Stop Check ❌

**Purpose:** Verify emergency stop is NOT active.

**Expected Result:**
- ✅ PASS: Emergency stop is released (OK)
- ❌ FAIL: Emergency stop is ACTIVE

**Troubleshooting:**
1. Check E-STOP button on teach pendant
2. Check external E-STOP circuit
3. Release E-STOP and reset

---

### Test 6: Servo Enable Check ⚠️

**Purpose:** Check if servo motors are enabled.

**Expected Result:**
- ✅ PASS: Servo is enabled
- ⚠️ FAIL: Servo is disabled

**How to Enable Servo:**
1. Ensure no active errors
2. Ensure E-STOP is released
3. Press "Servo On" button on teach pendant
4. Or send Modbus command to enable servo

---

### Test 7: Command Permission Test 🔧

**Purpose:** Test write access to command register.

**Test Procedure:**
1. Write `0x11` to register `40051` (enable command mode)
2. Verify write was successful
3. Check command status register for acknowledgment

**Expected Result:**
- ✅ PASS: Write successful, robot accepts commands
- ❌ FAIL: Write failed or rejected

**Requirements:**
- Robot must be in REMOTE mode
- No active errors
- Command permission register must be writable

---

## Running Diagnostics

### From UI

1. Open application in browser (`http://localhost:5173`)
2. Click "🔄 Read Diagnostics" button
3. Click "✅ Run All Tests" button for full diagnostic suite
4. Review test results in the panel

### From Code

```typescript
import { robotDiagnostics } from './services/robotDiagnostics';
import { robotService } from './services/robotState';

// Connect first
robotService.connect();

// Wait for connection...
setTimeout(async () => {
  // Read current diagnostics
  const state = await robotDiagnostics.readDiagnostics();
  console.log(robotDiagnostics.getSummary());
  
  // Run all tests
  const results = await robotDiagnostics.runDiagnosticTests();
  console.log('Tests passed:', results.filter(r => r.passed).length);
}, 2000);
```

---

## Interpreting Results

### All Tests Pass ✅

Robot is ready for external control! You can now:
- Send movement commands
- Read/write variables
- Control IO
- Start/stop programs

### Some Tests Fail ⚠️

Review failed tests and follow troubleshooting steps:

| Test | Common Causes | Solution |
|------|---------------|----------|
| Connection | Proxy not running, wrong IP | Start server, check `.env` |
| Remote Mode | Key in wrong position | Turn key to REMOTE |
| Error Status | Active robot error | Reset error on teach pendant |
| E-STOP | E-STOP pressed | Release E-STOP |
| Servo Enable | Servo off, safety open | Enable servo, check safeties |

---

## Register Reference

### Status Registers (Read Only)

| Address | Register | Description |
|---------|----------|-------------|
| 40001 | Heartbeat | Heartbeat register |
| 40002 | Global Speed | Current speed setting (0-100%) |
| 40003 | Read/Write Flag | Permission flag |
| 40004 | Robot Status | Mode and status bits |
| 40005-13 | Project Name | Current project (20 bytes) |
| 40014-17 | Digital Outputs | DO status (64 bits) |
| 40018 | Command Status | Command execution feedback |

### Command Registers (Write Only)

| Address | Register | Value | Description |
|---------|----------|-------|-------------|
| 40051 | Permission | `0x11` | Enable command mode |
| 40052 | Command | `0x04` | Start program |
| 40052 | Command | `0x08` | Stop program |
| 40052 | Command | `0x10` | Reset error |
| 40053 | Speed | 0-100 | Set global speed |

---

## Next Steps After Diagnostics

Once all tests pass:

1. **Test Movement:**
   - Use jog controls to move individual axes
   - Test world coordinate movement
   - Verify speed control

2. **Test IO:**
   - Read digital inputs
   - Set digital outputs
   - Test analog IO

3. **Program Control:**
   - Load a test program
   - Start/stop program
   - Monitor program status

4. **Integration:**
   - Connect vision system
   - Test coordinate transformations
   - Run pick-and-place sequence

---

## Troubleshooting Guide

### "Not Connected" Error

```
1. Check proxy server: netstat -ano | findstr 3000
2. Check robot ping: ping 192.168.6.68
3. Check robot port: telnet 192.168.6.68 1502
4. Restart proxy: npm run server
```

### "Not in Remote Mode" Warning

```
1. Turn physical key to REMOTE position
2. Check teach pendant shows "REMOTE"
3. Enable external control in menu
4. Restart controller if needed
```

### "Command Write Failed" Error

```
1. Ensure in REMOTE mode
2. Check no active errors
3. Verify permission register (40051) is writable
4. Try resetting command state: 40052 = 0x400
```

---

## Support

For issues not covered here:
1. Check teach pendant for error codes
2. Review ESTUN manual: `docs/ER_series_3D_vision_manual_RCS2_V1.5.3.txt`
3. Check Modbus map: `docs/modbus/ESTUN_MODBUS_FULL_MAP.md`

---

**Last Updated:** 2026-03-08
**Version:** 1.0
