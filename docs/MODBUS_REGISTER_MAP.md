# Estun Robot Modbus TCP Register Map

## Protocol: Modbus TCP
- **Port:** 502
- **Protocol Type:** Holding Registers (4xxxx series)
- **Data Type:** 16-bit integers (UINT16)

---

## Receive Registers (Robot Receives Commands)

### Command Register (40052)
**Address:** `40052` (Local: MBDataBuffer[51])  
**Name:** Robotic Operation Commands  
**Type:** Bit-field command register  
**Trigger:** Rising edge (commands execute on 0→1 transition)

| Bit | Value | Command | Description |
|-----|-------|---------|-------------|
| 2 | 0x04 | Start | Start robot program |
| 3 | 0x08 | Stop | Stop robot program |
| 4 | 0x10 | Reset | Reset robot errors |
| 7 | 0x80 | Load Project | Load project file |
| 8 | 0x100 | Logout | Logout current project file |
| 9 | 0x200 | Set Global Speed | Set global speed value |
| 10 | 0x400 | Set Command State Machine | Reset command state machine |

**Important Notes:**
- All commands are triggered on the **rising edge** (0 → 1 transition)
- Should be used with read/write flag at `40051` (0x11)
- Commands can be sent when the command status bit is `0x001`
- When encountering a command response failure, it is necessary to reset the state machine using **bit 10** before sending a new command

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

## Transmit Registers (Robot Sends Data)

*TODO: Add transmit register map from additional screenshots*

### Expected Transmit Registers:
- **Robot Status** - Current operation status
- **Coordinates** - X, Y, Z, A, B, C position
- **Joint Angles** - J1-J6 angles
- **Error Codes** - Current error codes
- **Actual Speed** - Current operating speed

---

## Usage Examples

### Start Robot Program
```
1. Write 0x0004 to register 40052 (bit 2 = Start)
2. Robot executes program start on rising edge
3. Register automatically clears or needs manual reset
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
1. Check command status bit at `40051` - should be `0x001`
2. Ensure rising edge trigger (write 0 first, then write command)
3. If command response failure, reset state machine using bit 10

### Connection Lost
1. Check network connectivity (ping robot IP)
2. Verify Modbus TCP port 502 is accessible
3. Check robot controller is in REMOTE mode

---

## References

- Estun Editor V2.2 Software Manual
- ECM04101-EN-04 ESTUN Robot ERC3-C1 Series Control Cabinet Operation Manual
- ER Series 3D Vision Manual RCS2 V1.5.3

---

## Notes

*This document is incomplete. Additional register maps for coordinates, joints, and status need to be added from controller documentation or empirical testing.*

**Last Updated:** 2026-02-19
