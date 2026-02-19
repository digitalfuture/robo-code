# Estun ERC3-C1 Modbus TCP Register Map

## Discovered: 2026-02-19

## Connection Settings

| Parameter | Value |
|-----------|-------|
| **IP Address** | 192.168.60.68 (default) |
| **Modbus TCP Port** | **1502** (NOT 502!) |
| **Protocol** | Modbus TCP Holding Registers |
| **Data Format** | 16-bit unsigned integers (Big Endian) |

---

## Register Map

### Current Position (Cartesian Coordinates)

**Address: 100-108** (6 registers × 2 bytes = 12 bytes)

| Register | Value Example | Description | Scale |
|----------|--------------|-------------|-------|
| 100 | 50100 | X coordinate | ÷100 = 501.00 mm |
| 101 | 0 | (reserved) | - |
| 102 | 17332 | Y coordinate | ÷100 = 173.32 mm |
| 103 | 0 | (reserved) | - |
| 104 | 17679 | Z coordinate | ÷100 = 176.79 mm |
| 105 | 0 | (reserved) | - |
| 106 | 17723 | A angle (rotation around X) | ÷100 = 177.23° |
| 107 | 0 | (reserved) | - |
| 108 | 18083 | B angle (rotation around Y) | ÷100 = 180.83° |
| 109 | 0 | (reserved) | - |

**Note:** C angle (rotation around Z) not yet found.

---

### Current Joint Angles

**Address: 200-205** (6 registers)

| Register | Value Example | Description | Scale |
|----------|--------------|-------------|-------|
| 200 | 2294 | J1 angle | ÷100 = 22.94° |
| 201 | 17084 | J2 angle | ÷100 = 170.84° |
| 202 | 24327 | J3 angle | ÷100 = 243.27° |
| 203 | 48152 | J4 angle | ÷100 = 481.52° |
| 204 | 25795 | J5 angle | ÷100 = 257.95° |
| 205 | 47914 | J6 angle | ÷100 = 479.14° |

**Note:** Values may need special decoding (some values > 360°).

---

### Static Parameters (Saved Position)

**Address: 5-9** (5 registers)

| Register | Value | Description |
|----------|-------|-------------|
| 5 | 17235 | Static parameter 1 |
| 6 | 21057 | Static parameter 2 |
| 7 | 13889 | Static parameter 3 |
| 8 | 12336 | Static parameter 4 |
| 9 | 83 | Static parameter 5 |

**Address: 15-17** (3 registers)

| Register | Value | Description |
|----------|-------|-------------|
| 15 | 12374 | Static parameter 6 |
| 16 | 12334 | Static parameter 7 |
| 17 | 12334 | Static parameter 8 |

---

### Additional Parameters

**Address: 100-149** (50 registers)

Contains various configuration and status values.

| Register | Value Example | Description |
|----------|--------------|-------------|
| 100 | 50100 | X coordinate |
| 102 | 17332 | Y coordinate |
| 104 | 17679 | Z coordinate |
| 106 | 17723 | A angle |
| 108 | 18083 | B angle |
| 110+ | Various | Other parameters |

---

### Empty Ranges

The following ranges returned all zeros (no data):

- **Address 300-399**: All zeros
- **Address 400-499**: All zeros
- **Address 500-999**: Not fully tested

---

## Usage Examples

### Read Current Position (X, Y, Z, A, B)

```
Read Holding Registers:
- Address: 100
- Count: 10

Response: [50100, 0, 17332, 0, 17679, 0, 17723, 0, 18083, 0]

Coordinates:
- X = 50100 / 100 = 501.00 mm
- Y = 17332 / 100 = 173.32 mm
- Z = 17679 / 100 = 176.79 mm
- A = 17723 / 100 = 177.23°
- B = 18083 / 100 = 180.83°
```

### Read Current Joint Angles (J1-J6)

```
Read Holding Registers:
- Address: 200
- Count: 6

Response: [2294, 17084, 24327, 48152, 25795, 47914]

Joint Angles:
- J1 = 2294 / 100 = 22.94°
- J2 = 17084 / 100 = 170.84°
- J3 = 24327 / 100 = 243.27°
- J4 = 48152 / 100 = 481.52°
- J5 = 25795 / 100 = 257.95°
- J6 = 47914 / 100 = 479.14°
```

---

## Important Notes

1. **Port 1502, NOT 502!** Standard Modbus port 502 returns limited data.

2. **Scale factor:** Coordinates and angles use scale factor of 100.
   - Raw value 50100 = 501.00 mm
   - Raw value 17723 = 177.23°

3. **Reserved registers:** Some registers between coordinates are reserved (read as 0).

4. **Joint angles > 360°:** Some joint values exceed 360° - may need special decoding.

5. **Write operations:** Writing to registers returns "Modbus Exception" - controller may be in read-only mode or requires special configuration.

---

## Testing Status

| Test | Status | Notes |
|------|--------|-------|
| Read registers 0-99 | ✅ Works | Static parameters found |
| Read registers 100-149 | ✅ Works | **Coordinates found!** |
| Read registers 200-249 | ✅ Works | **Joint angles found!** |
| Read registers 300-399 | ✅ Works | All zeros |
| Read registers 400-499 | ✅ Works | All zeros |
| Write to registers | ❌ Exception | Modbus Exception error |
| TCP String Protocol (port 5000) | ⚠️ Partial | Heartbeat works, commands don't |

---

## Next Steps

1. **Find C coordinate** (rotation around Z) - not yet located
2. **Find robot status register** (running, stopped, error)
3. **Find error code register**
4. **Enable write operations** for robot control
5. **Test dynamic updates** - verify values change when robot moves

---

## References

- Estun ERC3-C1 Controller
- Modbus TCP Protocol
- Discovered via network scan on 2026-02-19

---

**Last Updated:** 2026-02-19  
**Status:** Partial - Coordinates and Joints found, more registers to discover
