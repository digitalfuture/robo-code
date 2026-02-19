#!/bin/bash
# Estun ERC3-C1 Remote Control Configuration Scanner
# Read-only diagnostic script - does not modify anything

echo "=============================================="
echo "Estun ERC3-C1 Remote Control Configuration"
echo "Read-Only Diagnostic Script"
echo "=============================================="
echo ""

echo "[1/8] System Information"
echo "-------------------------------------------"
uname -a
echo ""

echo "[2/8] Network Configuration"
echo "-------------------------------------------"
cat /opt/SYS_CONFIG/network.d/interfaces 2>/dev/null || echo "No network config found"
echo ""

echo "[3/8] Searching for Remote/TCP Config Files"
echo "-------------------------------------------"
find /opt -type f \( -name "*.ini" -o -name "*.cfg" -o -name "*.conf" \) 2>/dev/null | head -20
echo ""

echo "[4/8] Searching for Remote/External Control Settings"
echo "-------------------------------------------"
grep -r -i -l "remote\|external\|tcp.*server\|modbus" /opt/SYS_CONFIG/ 2>/dev/null | head -10
echo ""

echo "[5/8] Checking ESToolsServer Configuration"
echo "-------------------------------------------"
ls -la /opt/ESToolsServer/ 2>/dev/null
cat /opt/ESToolsServer/*.ini 2>/dev/null || echo "No ESToolsServer config found"
echo ""

echo "[6/8] Checking Running Services"
echo "-------------------------------------------"
ps aux | grep -E "tcp|server|modbus|remote|external" | grep -v grep
echo ""

echo "[7/8] Checking Open Ports"
echo "-------------------------------------------"
cat /proc/net/tcp 2>/dev/null | head -20
echo ""

echo "[8/8] Searching for Modbus/TCP Configuration"
echo "-------------------------------------------"
find /opt -type f -exec grep -l -i "modbus\|port.*502\|port.*5000" {} \; 2>/dev/null | head -10
echo ""

echo "=============================================="
echo "Scan Complete!"
echo "=============================================="
echo ""
echo "To save this output to a file, run:"
echo "  bash scan_remote_config.sh > remote_config_report.txt"
echo ""
