<template>
  <div class="diagnostics-panel">
    <h2>🔍 Robot Diagnostics</h2>
    
    <!-- Connection Status -->
    <div class="status-section">
      <h3>Connection Status</h3>
      <div class="status-grid">
        <div class="status-item" :class="state.isConnected ? 'ok' : 'error'">
          <span class="label">Connection:</span>
          <span class="value">{{ state.isConnected ? 'CONNECTED ✓' : 'DISCONNECTED ✗' }}</span>
        </div>
        <div class="status-item" :class="state.canAcceptCommands ? 'ok' : 'error'">
          <span class="label">Can Accept Commands:</span>
          <span class="value">{{ state.canAcceptCommands ? 'YES ✓' : 'NO ✗' }}</span>
        </div>
      </div>
    </div>

    <!-- Robot Status -->
    <div class="status-section" v-if="state.robotStatus">
      <h3>Robot Status (Register 40004)</h3>
      <div class="status-grid">
        <div class="status-item" :class="state.robotStatus.isRemoteMode ? 'ok' : 'warn'">
          <span class="label">Mode:</span>
          <span class="value">
            {{ state.robotStatus.isRemoteMode ? 'REMOTE' : 
               state.robotStatus.isAutoMode ? 'AUTO' : 'MANUAL' }}
          </span>
        </div>
        <div class="status-item" :class="state.robotStatus.isServoEnabled ? 'ok' : 'warn'">
          <span class="label">Servo:</span>
          <span class="value">{{ state.robotStatus.isServoEnabled ? 'ON ✓' : 'OFF ✗' }}</span>
        </div>
        <div class="status-item" :class="!state.robotStatus.hasError ? 'ok' : 'error'">
          <span class="label">Error:</span>
          <span class="value">{{ state.robotStatus.hasError ? 'ACTIVE ❌' : 'None ✓' }}</span>
        </div>
        <div class="status-item" :class="state.robotStatus.isRunning ? 'info' : ''">
          <span class="label">Running:</span>
          <span class="value">{{ state.robotStatus.isRunning ? 'YES' : 'NO' }}</span>
        </div>
        <div class="status-item" :class="state.robotStatus.isInMotion ? 'info' : ''">
          <span class="label">In Motion:</span>
          <span class="value">{{ state.robotStatus.isInMotion ? 'YES' : 'NO' }}</span>
        </div>
        <div class="status-item" :class="state.robotStatus.isProgramRunning ? 'info' : ''">
          <span class="label">Program:</span>
          <span class="value">{{ state.robotStatus.isProgramRunning ? 'RUNNING' : 'STOPPED' }}</span>
        </div>
      </div>
    </div>

    <!-- Command Status -->
    <div class="status-section" v-if="state.commandStatus">
      <h3>Command Status (Register 40018)</h3>
      <div class="status-grid">
        <div class="status-item" :class="state.commandStatus.emergencyStopOK ? 'ok' : 'error'">
          <span class="label">Emergency Stop:</span>
          <span class="value">{{ state.commandStatus.emergencyStopOK ? 'OK (Released) ✓' : 'ACTIVE ❌' }}</span>
        </div>
        <div class="status-item" :class="!state.commandStatus.commandExecutionError ? 'ok' : 'error'">
          <span class="label">Command Error:</span>
          <span class="value">{{ state.commandStatus.commandExecutionError ? 'ERROR ❌' : 'None ✓' }}</span>
        </div>
        <div class="status-item" :class="state.commandStatus.commandExecutionComplete ? 'ok' : ''">
          <span class="label">Last Command:</span>
          <span class="value">{{ state.commandStatus.commandExecutionComplete ? 'COMPLETE ✓' : 'Pending' }}</span>
        </div>
        <div class="status-item" :class="state.commandStatus.waitingForCommand ? 'info' : ''">
          <span class="label">Waiting for Command:</span>
          <span class="value">{{ state.commandStatus.waitingForCommand ? 'YES' : 'NO' }}</span>
        </div>
      </div>
    </div>

    <!-- Additional Info -->
    <div class="status-section">
      <h3>Additional Information</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">Global Speed:</span>
          <span class="value">{{ state.globalSpeed }}%</span>
        </div>
        <div class="status-item">
          <span class="label">Project:</span>
          <span class="value mono">{{ state.projectName }}</span>
        </div>
        <div class="status-item">
          <span class="label">Last Update:</span>
          <span class="value mono">{{ state.lastUpdate ? state.lastUpdate.toLocaleTimeString() : 'Never' }}</span>
        </div>
      </div>
    </div>

    <!-- Digital Outputs -->
    <div class="status-section" v-if="state.digitalOutputs">
      <h3>Digital Outputs</h3>
      <div class="status-grid">
        <div class="status-item">
          <span class="label">DO 1-16:</span>
          <span class="value mono">{{ formatBinary(state.digitalOutputs.do1_16) }}</span>
        </div>
        <div class="status-item">
          <span class="label">DO 17-32:</span>
          <span class="value mono">{{ formatBinary(state.digitalOutputs.do17_32) }}</span>
        </div>
        <div class="status-item">
          <span class="label">DO 33-48:</span>
          <span class="value mono">{{ formatBinary(state.digitalOutputs.do33_48) }}</span>
        </div>
        <div class="status-item">
          <span class="label">DO 49-64:</span>
          <span class="value mono">{{ formatBinary(state.digitalOutputs.do49_64) }}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-section">
      <button @click="runDiagnostics" class="action-btn primary" :disabled="!state.isConnected">
        🔄 Read Diagnostics
      </button>
      <button @click="runAllTests" class="action-btn success" :disabled="!state.isConnected">
        ✅ Run All Tests
      </button>
      <button @click="showSummary" class="action-btn info">
        📋 Show Summary
      </button>
    </div>

    <!-- Test Results -->
    <div class="test-results" v-if="testResults.length > 0">
      <h3>Test Results</h3>
      <div class="test-list">
        <div 
          v-for="(result, index) in testResults" 
          :key="index"
          class="test-item"
          :class="result.passed ? 'pass' : 'fail'"
        >
          <span class="test-icon">{{ result.passed ? '✓' : '✗' }}</span>
          <span class="test-name">{{ result.name }}</span>
          <span class="test-message">{{ result.message }}</span>
        </div>
      </div>
      <div class="test-summary">
        <strong>Summary:</strong> 
        {{ testResults.filter(r => r.passed).length }} / {{ testResults.length }} PASSED
      </div>
    </div>

    <!-- Errors -->
    <div class="errors-section" v-if="state.errors.length > 0">
      <h3>⚠️ Errors</h3>
      <ul class="error-list">
        <li v-for="(error, index) in state.errors" :key="index" class="error-item">
          {{ error }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { robotDiagnostics } from '../services/robotDiagnostics';
import { robotService } from '../services/robotState';
import type { TestResult } from '../services/robotDiagnostics';

const state = reactive(robotDiagnostics.state);
const testResults = ref<TestResult[]>([]);

const formatBinary = (value: number): string => {
  return value.toString(2).padStart(16, '0').replace(/(.{4})/g, '$1 ').trim();
};

const runDiagnostics = async () => {
  testResults.value = [];
  await robotDiagnostics.readDiagnostics();
};

const runAllTests = async () => {
  testResults.value = await robotDiagnostics.runDiagnosticTests();
};

const showSummary = () => {
  const summary = robotDiagnostics.getSummary();
  robotService.addLog('\n=== ROBOT STATUS SUMMARY ===\n' + summary, 'info');
  alert(summary);
};
</script>

<style scoped>
.diagnostics-panel {
  background: #1a1a2e;
  border: 2px solid #4a4a6a;
  border-radius: 8px;
  padding: 20px;
  margin: 10px 0;
  color: #e0e0e0;
}

h2 {
  margin: 0 0 20px 0;
  color: #00ff88;
  font-size: 1.5em;
  text-align: center;
}

h3 {
  margin: 15px 0 10px 0;
  color: #00ccff;
  font-size: 1.1em;
  border-bottom: 1px solid #4a4a6a;
  padding-bottom: 5px;
}

.status-section {
  margin-bottom: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.status-item {
  background: #2a2a3e;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.status-item .label {
  font-size: 0.85em;
  color: #888;
}

.status-item .value {
  font-weight: bold;
  font-size: 1em;
}

.status-item.ok .value {
  color: #00ff88;
}

.status-item.error .value {
  color: #ff4444;
}

.status-item.warn .value {
  color: #ffaa00;
}

.status-item.info .value {
  color: #00ccff;
}

.mono {
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.action-section {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}

.action-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.primary {
  background: #00ccff;
  color: #000;
}

.action-btn.primary:hover:not(:disabled) {
  background: #00aadd;
}

.action-btn.success {
  background: #00ff88;
  color: #000;
}

.action-btn.success:hover:not(:disabled) {
  background: #00dd77;
}

.action-btn.info {
  background: #6666ff;
  color: #fff;
}

.action-btn.info:hover:not(:disabled) {
  background: #5555ee;
}

.test-results {
  margin-top: 20px;
  padding: 15px;
  background: #2a2a3e;
  border-radius: 4px;
}

.test-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.test-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 4px;
}

.test-item.pass {
  background: rgba(0, 255, 136, 0.1);
  border-left: 3px solid #00ff88;
}

.test-item.fail {
  background: rgba(255, 68, 68, 0.1);
  border-left: 3px solid #ff4444;
}

.test-icon {
  font-weight: bold;
  font-size: 1.2em;
}

.test-item.pass .test-icon {
  color: #00ff88;
}

.test-item.fail .test-icon {
  color: #ff4444;
}

.test-name {
  font-weight: bold;
  min-width: 150px;
}

.test-message {
  color: #aaa;
  font-size: 0.9em;
}

.test-summary {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #4a4a6a;
  text-align: center;
  font-size: 1.1em;
}

.errors-section {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid #ff4444;
  border-radius: 4px;
}

.error-list {
  margin: 0;
  padding-left: 20px;
}

.error-item {
  color: #ff8888;
  margin: 5px 0;
}

/* Responsive */
@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
  }
  
  .action-section {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
}
</style>
