<script setup lang="ts">
import { computed } from 'vue';
import { robotService } from '../services/robotState';
import { t } from '../services/i18n';

const state = robotService.state;

const coords = computed(() => state.coordinates);
const joints = computed(() => state.joints);
const isConnected = computed(() => state.isConnected);

// Helper for radial progress circles
const getCircleDash = (val: number) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.min(Math.max((val + 90) / 180, 0), 1); // Normalize -90..90 to 0..1
  const dash = normalized * circumference;
  return `${dash} ${circumference}`;
};

const getPropColor = (val: number) => {
    return Math.abs(val) > 80 ? 'var(--color-danger)' : 'var(--color-info)'; 
}
</script>

<template>
  <div class="robot-status panel">
    <div class="header-row">
       <h3 class="title mono">{{ t('status.title') }}</h3>
       <div class="connection-status" :class="{ ok: isConnected }">
         <span class="dot"></span> {{ isConnected ? t('status.connected') : t('status.offline') }}
       </div>
    </div>
    
    <div class="grid-layout">
      <!-- Cartesian Section -->
      <div class="section cartesian">
        <h4 class="label">{{ t('status.cartesian') }}</h4>
        <div class="coords-box">
           <div class="coord-item">
             <span class="axis">X</span>
             <span class="value">{{ coords.x }}</span>
           </div>
           <div class="coord-item">
             <span class="axis">Y</span>
             <span class="value">{{ coords.y }}</span>
           </div>
           <div class="coord-item">
             <span class="axis">Z</span>
             <span class="value">{{ coords.z }}</span>
           </div>
        </div>
      </div>

      <!-- Joints Section -->
      <div class="section joints">
        <h4 class="label">{{ t('status.joints') }}</h4>
        <div class="joints-grid">
           <div v-for="(j, i) in joints" :key="i" class="joint-card">
             <div class="joint-header">
               <span class="joint-id">J{{i+1}}</span>
               <span class="joint-val mono">{{ j }}°</span>
             </div>
             
             <!-- Radial Graph -->
             <div class="radial-gauge">
                <svg viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="18" class="bg-ring" />
                  <circle cx="20" cy="20" r="18" class="progress-ring" 
                          :stroke="getPropColor(j)"
                          :stroke-dasharray="getCircleDash(j)" />
                </svg>
                <div class="center-dot" :style="{ backgroundColor: getPropColor(j) }"></div>
             </div>
             
             <!-- Linear Bar Fallback/Accent -->
             <div class="micro-bar">
               <div class="fill" 
                    :style="{ 
                        width: ((j + 90)/180 * 100) + '%',
                        background: getPropColor(j)
                    }">
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Telemetry Footer -->
    <div class="status-footer">
       <div class="metric">
         <span class="lbl">{{ t('status.temp') }}</span>
         <span class="val ok">42°C</span>
       </div>
       <div class="metric">
         <span class="lbl">{{ t('status.load') }}</span>
         <span class="val">12%</span>
       </div>
       <div class="metric">
         <span class="lbl">{{ t('status.time') }}</span>
         <span class="val">04:20:11</span>
       </div>
       <div class="mode-badge">{{ t('status.auto') }}</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.robot-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  border-left: 2px solid var(--color-primary); /* Sci-fi accent left border */
  overflow-y: auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
}

.title {
  color: var(--color-primary);
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 2px;
}

.connection-status {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
  
  .dot {
    width: 6px; height: 6px; background: #555; border-radius: 50%;
  }
  
  &.ok {
    color: var(--color-primary);
    .dot { background: var(--color-primary); box-shadow: 0 0 5px var(--color-primary); }
  }
}

.label {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin: 0 0 10px 0;
  border-left: 2px solid var(--color-text-dim);
  padding-left: 8px;
  letter-spacing: 1px;
}

.coords-box {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
  
  .coord-item {
    background: rgba(255,255,255,0.03);
    padding: 10px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1px solid rgba(255,255,255,0.05);
    
    .axis { font-size: 0.7rem; color: var(--color-text-dim); margin-bottom: 4px; }
    .value { font-family: var(--font-mono); font-size: 1.1rem; color: var(--color-text); }
  }
}

.joints-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 columns */
  gap: 10px;
}

.joint-card {
  background: rgba(0,0,0,0.2);
  border: 1px solid var(--color-border);
  padding: 8px;
  border-radius: 6px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &:hover {
    border-color: var(--color-info);
  }
}

.joint-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.8rem;
  
  .joint-id { color: var(--color-text-dim); }
  .joint-val { font-weight: bold; }
}

.radial-gauge {
  width: 60px;
  height: 60px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 5px 0;
  
  svg {
    transform: rotate(-90deg); /* Start from top */
    width: 100%; height: 100%;
  }
  
  circle {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
  }
  
  .bg-ring { stroke: rgba(255,255,255,0.1); }
  .progress-ring { transition: stroke-dasharray 0.1s linear, stroke 0.3s ease; }
  
  .center-dot {
    position: absolute;
    width: 6px; height: 6px;
    border-radius: 50%;
    transition: background-color 0.3s ease;
  }
}

.micro-bar {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.1);
  margin-top: auto;
  
  .fill {
    height: 100%;
    transition: width 0.1s linear, background-color 0.3s ease;
  }
}

.status-footer {
  margin-top: auto;
  border-top: 1px solid var(--color-border);
  padding-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .metric {
    display: flex;
    flex-direction: column;
    font-size: 0.7rem;
    
    .lbl { color: var(--color-text-dim); margin-bottom: 2px; }
    .val { font-family: var(--font-mono); }
    .val.ok { color: var(--color-primary); }
  }
  
  .mode-badge {
    background: var(--color-primary);
    color: #000;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 10px;
  }
}
</style>
