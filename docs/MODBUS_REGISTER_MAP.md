# Estun Robot Modbus TCP Register Map

## Protocol: Modbus TCP
- **Port:** 502
- **Protocol Type:** Holding Registers (4xxxx series)
- **Data Type:** 16-bit integers (UINT16)
- **Buffer:** MBDataBuffer[0..1499] (3000 bytes total)

---

## Register Overview

### MBDataBuffer Mapping
- **MBDataBuffer[0-49]** → Registers **40001-40050** (Transmit - Robot sends data)
- **MBDataBuffer[50-1499]** → Registers **40051-40064+** (Receive - Robot receives commands)

---

## Transmit Registers (Robot Sends Data)

**Address Range:** 40001-40050 (MBDataBuffer[0-49])

*Note: Exact mapping for coordinates and joints needs verification from Estun or empirical testing*

| Register | MBDataBuffer | Definition | Description |
|----------|--------------|------------|-------------|
| 40001 | [0] | Reserved | - |
| 40002 | [1] | Global Speed | Current speed value |
| 40003-40050 | [2-49] | User Data | Available for custom data (coordinates, joints, status) |

**Expected Data (needs verification):**
- **Coordinates (X, Y, Z, A, B, C):** Likely in range 40003-40020
- **Joint Angles (J1-J6):** Likely in range 40009-40020
- **Robot Status:** Likely in range 40003-40010

---

## Receive Registers (Robot Receives Commands)

### Command Flag Register (40051)
**Address:** `40051` (Local: MBDataBuffer[50])  
**Name:** Command Flag  
**Value:** `0x11` (17) - Enable read/write for commands

---

### Robotic Operation Commands (40052)
**Address:** `40052` (Local: MBDataBuffer[51])  
**Name:** Robotic Operation Commands  
**Type:** Bit-field command register  
**Trigger:** Rising edge (commands execute on 0→1 transition)

| Bit | Hex Value | Command | Description |
|-----|-----------|---------|-------------|
| 2 | 0x04 | Start | Start robot program |
| 3 | 0x08 | Stop | Stop robot program |
| 4 | 0x10 | Reset | Reset robot errors |
| 7 | 0x80 | Load Project | Load project file |
| 8 | 0x100 | Logout | Logout current project file |
| 9 | 0x200 | Set Global Speed | Set global speed value |
| 10 | 0x400 | Reset State Machine | Reset command state machine |

**Important Notes:**
- All commands are triggered on the **rising edge** (0 → 1 transition)
- Set register 40051 to `0x11` before sending commands
- Commands can be sent when the command status bit is `0x001`
- When encountering a command response failure, reset using **bit 10** (0x400) before sending new command

---

### Global Speed Value (40053)
**Address:** `40053` (Local: MBDataBuffer[52])  
**Name:** Global Speed Value  
**Range:** 0-100 (percentage)

---

### Project Name (40054-40063)
**Address:** `40054` - `40063` (Local: MBDataBuffer[53-62])  
**Name:** Set Project Name  
**Size:** 20 bytes (10 registers × 2 bytes each)

---

### Digital Inputs Status (40064)
**Address:** `40064` (Local: MBDataBuffer[63])  
**Name:** SimDI[1-16]  
**Description:** Digital Input channels 1-16 status

---

## Usage Examples

### Start Robot Program
```
1. Write 0x0011 to register 40051 (enable command mode)
2. Write 0x0004 to register 40052 (bit 2 = Start)
3. Robot executes program start on rising edge
```

### Stop Robot Program
```
1. Write 0x0008 to register 40052 (bit 3 = Stop)
2. Robot stops program execution
```

### Reset Robot Errors
```
1. Write 0x0010 to register 40052 (bit 4 = Reset)
2. Robot clears error state
```

### Set Global Speed to 50%
```
1. Write 50 to register 40053
2. Robot operates at 50% speed
```

### Reset Command State Machine (on error)
```
1. Write 0x0400 to register 40052 (bit 10)
2. State machine resets
3. Ready for new commands
```

---

## Connection Parameters

| Parameter | Value |
|-----------|-------|
| IP Address | Robot controller IP (e.g., 192.168.60.68) |
| Port | 502 |
| Protocol | Modbus TCP |
| Register Type | Holding Registers (4xxxx) |
| Data Format | 16-bit unsigned integer (Big Endian) |

---

## Troubleshooting

### Command Not Executing
1. Check command status bit at 40051 - should be 0x001
2. Ensure rising edge trigger (write 0 first, then write command)
3. If command response failure, reset state machine using bit 10

### Connection Lost
1. Check network connectivity (ping robot IP)
2. Verify Modbus TCP port 502 is accessible
3. Check robot controller is in REMOTE mode

### Unknown Register Addresses
The transmit register map (40001-40050) for coordinates and joints is not fully documented in public manuals. To find correct addresses:
1. Contact Estun support for complete register map
2. Use empirical testing - read registers while moving robot
3. Check Estun Editor software for register configuration

---

## References

- Estun Editor V2.2 Software Manual (Page 148, 182)
- ECM04101-EN-04 ESTUN Robot ERC3-C1 Series Control Cabinet Operation Manual
- ER Series Industrial Robot RCS2 V1.5.3 3D Vision Manual
- ER Series Industrial Robot ModbusTCP Interface Debugging Manual

---

## Notes

**Document Status:** Partial - Receive registers documented, Transmit registers need verification

**Last Updated:** 2026-02-19

**TODO:**
- [ ] Verify coordinate register addresses (X, Y, Z, A, B, C)
- [ ] Verify joint angle register addresses (J1-J6)
- [ ] Verify robot status register address
- [ ] Test read/write operations with actual robot
