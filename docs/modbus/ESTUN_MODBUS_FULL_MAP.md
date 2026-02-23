# Estun ERC3-C1 Modbus TCP Complete Register Map

## Connection Settings

| Parameter | Value |
|-----------|-------|
| **IP Address** | 192.168.60.68 |
| **Modbus TCP Port** | **1502** |
| **Protocol** | Modbus TCP Holding Registers |
| **Data Format** | 16-bit unsigned integers |

---

## 📤 SEND (Master → Robot) - Writing to Robot

### Heartbeat

| Register | Address | Name | Description | Range |
|----------|---------|------|-------------|-------|
| 40001 | MBDataBuffer[0] | Heartbeat | Cyclic heartbeat detection | 1 - 65535 |

---

## 📥 RECEIVE (Robot → Master) - Reading from Robot

### Robot Status

| Register | Address | Name | Description | Bits |
|----------|---------|------|-------------|------|
| 40002 | MBDataBuffer[1] | Global speed | Current speed setting | - |
| 40003 | MBDataBuffer[2] | Read/write flag | Read/write response flag | - |
| 40004 | MBDataBuffer[3] | Robot status | Operation mode and status | bit0: Manual Mode<br>bit1: Automatic Mode<br>bit2: Remote Operation Mode<br>bit3: Enable Status<br>bit4: Running Status<br>bit5: Error Status<br>bit6: Program Running Status<br>bit7: Robot in Motion |
| 40005-40013 | MBDataBuffer[4-13] | Project name | Current loaded project name | 20 bytes<br>Example: "estun.test" |
| 40014 | MBDataBuffer[14] | SimDout[1-16] | Digital outputs 1-16 | DO 1-16 |
| 40015 | MBDataBuffer[15] | SimDout[17-32] | Digital outputs 17-32 | DO 17-32 |
| 40016 | MBDataBuffer[16] | SimDout[33-48] | Digital outputs 33-48 | DO 33-48 |
| 40017 | MBDataBuffer[17] | SimDout[49-64] | Digital outputs 49-64 | DO 49-64 |
| 40018 | MBDataBuffer[18] | Command status | Command execution status | bit0: Command is 0<br>bit1: Emergency Stop OK<br>bit2: Start command OK<br>bit3: Stop command OK<br>bit4: Reset command OK<br>bit5: Enable Up command OK<br>bit6: Enable Down command OK<br>bit7: Load Project OK<br>bit8: Logout Project OK<br>bit9: Set Global Speed OK<br>bit10: Waiting for Control<br>bit11: Waiting for Command<br>bit12: Command Execution Complete<br>bit13: Command Execution Error<br>bit14-15: Reserved |
| 40019 | MBDataBuffer[19] | Reserved | - | - |
| 40020 | MBDataBuffer[20] | Use by User | AO 1-32 | Analog outputs |

---

## 🔄 COMMAND REGISTERS (Write to Control Robot)

### Operation Commands

| Register | Address | Name | Description | Values |
|----------|---------|------|-------------|--------|
| 40051 | MBDataBuffer[50] | Read/Write Flag | Command permission flag | **0x11** = Enable command mode |
| 40052 | MBDataBuffer[51] | Robotic Operation Commands | Main command register | bit0 (0→0x4): **Start robot program**<br>bit1 (0→0x8): **Stop robot program**<br>bit2 (0→0x10): **Reset robot errors**<br>bit4 (0→0x100): Load project file<br>bit5 (0→0x200): Logout current project file<br>bit6 (0→0x400): Set global speed<br>bit10 (0→0x400): Reset command state machine |

### Speed Control

| Register | Address | Name | Description | Range |
|----------|---------|------|-------------|-------|
| 40053 | MBDataBuffer[52] | Global Speed | Set robot speed | 0-100% |

### Project Name (20 bytes)

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| 40054-40063 | MBDataBuffer[53-62] | Set Project Name | Project name (20 bytes) |

---

## 📊 DIGITAL IO (Simulated)

### Digital Inputs (DI 1-16)

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| 40061 | MBDataBuffer[60] | SimDI[1-16] | Digital inputs 1-16 |

### Digital Outputs (DO 1-64)

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| 40014 | MBDataBuffer[14] | SimDout[1-16] | Digital outputs 1-16 |
| 40015 | MBDataBuffer[15] | SimDout[17-32] | Digital outputs 17-32 |
| 40016 | MBDataBuffer[16] | SimDout[33-48] | Digital outputs 33-48 |
| 40017 | MBDataBuffer[17] | SimDout[49-64] | Digital outputs 49-64 |

---

## 🎯 ANALOG IO

### Analog Inputs (AI 1-32)

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| 40064-40095 | MBDataBuffer[63-94] | Use by User | AI 1-32 |

### Analog Outputs (AO 1-32)

| Register | Address | Name | Description |
|----------|---------|------|-------------|
| 40020 | MBDataBuffer[20] | Use by User | AO 1-32 |

---

## 🔐 PERMISSION

| Register | Address | Name | Description | Value |
|----------|---------|------|-------------|-------|
| 40100 | MBDataBuffer[99] | Read/Write Flag | Open rob command issuance permission | **0x11** |

---

## 📝 USAGE EXAMPLES

### 1. Enable Command Mode

```
Write to register 40051: 0x11
```

### 2. Start Robot Program

```
Step 1: Write 40051 = 0x11 (enable command mode)
Step 2: Write 40052 = 0x04 (start command)
Step 3: Read 40018 to check bit2 (start command OK)
```

### 3. Stop Robot Program

```
Step 1: Write 40051 = 0x11
Step 2: Write 40052 = 0x08 (stop command)
Step 3: Read 40018 to check bit3 (stop command OK)
```

### 4. Reset Robot Errors

```
Step 1: Write 40051 = 0x11
Step 2: Write 40052 = 0x10 (reset command)
Step 3: Read 40018 to check bit4 (reset command OK)
```

### 5. Set Global Speed

```
Step 1: Write 40051 = 0x11
Step 2: Write 40053 = 50 (50% speed)
Step 3: Write 40052 = 0x400 (set speed command)
Step 4: Read 40018 to check bit9 (set speed OK)
```

### 6. Read Robot Status

```
Read register 40004:
- bit0 = 1: Manual mode
- bit1 = 1: Automatic mode
- bit2 = 1: Remote mode
- bit3 = 1: Servo enabled
- bit4 = 1: Running
- bit5 = 1: Error
- bit6 = 1: Program running
- bit7 = 1: Robot moving
```

### 7. Read Command Execution Status

```
Read register 40018:
- bit0 = 0: Command is 0 (idle)
- bit1 = 1: Emergency stop OK
- bit2 = 1: Start command executed successfully
- bit3 = 1: Stop command executed successfully
- bit4 = 1: Reset command executed successfully
- bit12 = 1: Command execution complete
- bit13 = 1: Command execution error
```

---

## ⚠️ IMPORTANT NOTES

1. **Command Sequence:**
   - Always write **0x11** to register **40051** first to enable command mode
   - Then write the command to register **40052**
   - Wait for response in register **40018**

2. **Command Reset:**
   - After each command, bit[0] of register 40018 returns to 0
   - To send a new command, you may need to reset the state machine:
     ```
     Write 40052 = 0x400 (reset command)
     ```

3. **Heartbeat:**
   - Send heartbeat (value 1) to register 40001 periodically
   - Range: 1 - 65535

4. **Project Name:**
   - 20 bytes total (registers 40005-40013 for reading, 40054-40063 for writing)
   - Example: "estun.test" = [0x65, 0x73, 0x74, 0x75, 0x6E, 0x2E, 0x74, 0x65, 0x73, 0x74]

---

## 🔍 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Modbus Exception on write | Ensure register 40051 = 0x11 before writing commands |
| Command not executing | Check robot mode (register 40004) - must be in Remote or Auto mode |
| Command status shows error | Read register 40018 bit13 - reset state machine with 0x400 |
| Cannot connect to port 1502 | Enable Modbus TCP Server on robot teach pendant |

---

**Last Updated:** 2026-02-22  
**Status:** Complete register map from official Estun documentation
