<script setup lang="ts">
import { ref, computed } from 'vue';
import { robotService } from '../services/robotState';
import { t } from '../services/i18n';

const state = robotService.state;
const isSystemActive = computed(() => state.isConnected);
const mode = ref<'AUTO' | 'MANUAL'>('MANUAL');
const speed = ref(50); // %

const toggleSystem = () => {
    // If connected, disconnect. If not, we can't really "connect" without IP yet.
    if (state.isConnected) {
        robotService.disconnect();
    } else {
        // For now, let's treat the big power button as the Demo Toggle for user convenience, 
        // OR add a specific Demo button. Let's add a debug Demo Toggle.
        // But user asked for "Real" look. So main button should try to connect real first.
        robotService.connect(); // Proxy will handle target IP
    }
};

const toggleDemo = () => {
    robotService.toggleDemoMode(!state.isConnected);
}

const setMode = (m: 'AUTO' | 'MANUAL') => {
  mode.value = m;
  robotService.sendCommand('SET_MODE', { mode: m });
};

const handleJog = (axis: string) => {
    robotService.sendCommand('JOG', { axis, speed: speed.value });
};

const handleAction = (action: string) => {
    robotService.sendCommand(action);
};
</script>

<template>
  <div class="control-panel panel">
    <!-- Left: Main System State -->
    <div class="group main-controls">
      <div class="label-heading mono">{{ t('control.system') }}</div>
      <button 
        @click="toggleSystem" 
        class="power-btn" 
        :class="{ active: isSystemActive }"
      >
        <div class="icon-power">⏻</div>
        <span>{{ isSystemActive ? t('header.online') : t('control.standby') }}</span>
      </button>
      
      <!-- Hidden Dev Tool for Demo -->
      <button @click="toggleDemo" class="demo-btn">
         {{ isSystemActive ? t('control.demo_stop') : t('control.demo_start') }}
      </button>
    </div>

    <!-- Center: Operation Mode & Speed -->
    <div class="group mode-controls">
      <div class="label-heading mono">{{ t('control.mode') }}</div>
      <div class="mode-switch">
        <button 
            :class="{ selected: mode === 'MANUAL' }" 
            @click="setMode('MANUAL')"
        >{{ t('control.manual') }}</button>
        <button 
            :class="{ selected: mode === 'AUTO' }" 
            @click="setMode('AUTO')"
        >{{ t('control.auto') }}</button>
      </div>
      
      <div class="speed-slider">
        <span class="mono">{{ t('control.speed') }}: {{ speed }}%</span>
        <input type="range" v-model="speed" min="1" max="100" />
      </div>

      <div class="sub-actions">
          <button class="sm-btn" @click="handleAction('SERVO_ON')">{{ t('control.servo') }}</button>
          <button class="sm-btn" @click="handleAction('RESET')">{{ t('control.reset') }}</button>
          <button class="sm-btn" @click="handleAction('HOME')">{{ t('control.home') }}</button>
      </div>
    </div>

    <!-- Right: Manual Jog / Actions -->
    <div class="group action-controls">
      <div class="label-heading mono">{{ t('control.manualdata') }}</div>
      
      <div v-if="mode === 'MANUAL'" class="jog-grid">
         <button class="jog-btn" @click="handleJog('X-')">X-</button>
         <button class="jog-btn" @click="handleJog('Y+')">Y+</button>
         <button class="jog-btn" @click="handleJog('X+')">X+</button>
         <button class="jog-btn" @click="handleJog('Z-')">Z-</button>
         <button class="jog-btn" @click="handleJog('Y-')">Y-</button>
         <button class="jog-btn" @click="handleJog('Z+')">Z+</button>
      </div>
      
      <div v-else class="auto-msg mono">
         <span class="pulse-dot"></span>
         {{ t('control.aipilot') }}
      </div>
    </div>
    
    <!-- Emergency Stop -->
    <div class="estop-wrapper">
       <button class="estop-btn" @click="handleAction('ESTOP')">
         <span>{{ t('control.stop') }}</span>
       </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.control-panel {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  padding: 1rem 1.5rem;
  gap: 2rem;
  background: var(--color-panel);
  flex-wrap: wrap;

  @media (max-width: 1200px) {
    gap: 1rem;
    padding: 1rem;
  }
}

.group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  .label-heading {
    font-size: 0.7rem;
    color: var(--color-text-dim);
    letter-spacing: 1px;
    border-bottom: 2px solid rgba(255,255,255,0.05);
    padding-bottom: 4px;
    margin-bottom: 4px;
  }
}

.main-controls {
    min-width: 120px;
}

.power-btn {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  transition: all 0.3s ease;
  
  .icon-power { font-size: 1.5rem; }
  
  &:hover {
     background: rgba(255,255,255,0.1);
     color: var(--color-text);
  }
  
  &.active {
    border-color: var(--color-primary);
    background: rgba(0, 255, 157, 0.1);
    color: var(--color-primary);
    box-shadow: 0 0 15px rgba(0,255,157,0.2);
    
    .icon-power { text-shadow: 0 0 8px var(--color-primary); }
  }
}

.demo-btn {
  margin-top: 5px;
  font-size: 0.6rem;
  padding: 2px;
  background: transparent;
  color: var(--color-text-dim);
  border: 1px dashed var(--color-border);
  opacity: 0.5;
  &:hover { opacity: 1; color: var(--color-warning); border-color: var(--color-warning); }
}

.mode-controls {
    flex-grow: 1;
    max-width: 300px;
}

.mode-switch {
  display: flex;
  background: rgba(0,0,0,0.3);
  padding: 4px;
  border-radius: 6px;
  
  button {
    flex: 1;
    background: transparent;
    font-size: 0.8rem;
    padding: 6px;
    color: var(--color-text-dim);
    
    &.selected {
      background: var(--color-info);
      color: #000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    }
  }
}


.sub-actions {
  display: flex;
  gap: 5px;
  margin-top: 5px;
}

.sm-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  font-size: 0.65rem;
  padding: 4px 6px;
  flex: 1;
  text-align: center;
  &:hover {
    background: var(--color-info);
    color: #000;
  }
}

.speed-slider {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    color: var(--color-text-dim);
    
    input[type=range] {
        width: 100%;
        accent-color: var(--color-info);
    }
}

.action-controls {
    flex-grow: 1;
}

.jog-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    
    .jog-btn {
        padding: 8px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--color-border);
        font-family: var(--font-mono);
        &:hover { background: var(--color-info); color: #000; }
        &:active { transform: translateY(1px); }
    }
}

.auto-msg {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-info);
    border: 1px dashed var(--color-info);
    border-radius: 4px;
    background: rgba(0, 217, 255, 0.05);
    gap: 10px;
    
    .pulse-dot {
        width: 8px; height: 8px; background: var(--color-info); border-radius: 50%;
        animation: blink 1s infinite;
    }
}

.estop-wrapper {
   display: flex;
   align-items: center;
   border-left: 1px solid var(--color-border);
   padding-left: 2rem;
}

.estop-btn {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ff4444, #990000);
  border: 4px solid #550000;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
  color: white;
  font-weight: bold;
  font-family: var(--font-main);
  letter-spacing: 1px;
  transition: transform 0.1s;
  
  &:active {
    transform: scale(0.95);
    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    border-color: #770000;
  }
}

@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

</style>
