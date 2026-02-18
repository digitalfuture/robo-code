<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { robotService } from '../services/robotState';
import { t } from '../services/i18n';

const state = robotService.state;
const hasSignal = computed(() => state.camera.hasSignal);
const targets = computed(() => state.camera.targets);

const timeStr = ref('00:00:00:00');
let clockTimer: number;

// Noise canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Simulate Noise Generation (Visual Effect only)
const drawNoise = () => {
    if (!canvasRef.value || hasSignal.value) return;
    const ctx = canvasRef.value.getContext('2d');
    if (!ctx) return;
    
    const w = canvasRef.value.width;
    const h = canvasRef.value.height;
    const idata = ctx.createImageData(w, h);
    const buffer32 = new Uint32Array(idata.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
        if (Math.random() < 0.5) {
             // Gray noise
             const gray = Math.random() * 255;
             buffer32[i] = (255 << 24) | (gray << 16) | (gray << 8) | gray;
        } else {
            buffer32[i] = 0xff000000;
        }
    }
    ctx.putImageData(idata, 0, 0);
    if (!hasSignal.value) requestAnimationFrame(drawNoise);
};

// Watch signal to trigger noise animation
watch(hasSignal, (val) => {
    if (!val) {
        requestAnimationFrame(drawNoise);
    }
});

onMounted(() => {
  // Update Clock
  clockTimer = setInterval(() => {
    const d = new Date();
    timeStr.value = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}:${Math.floor(d.getMilliseconds()/10).toString().padStart(2,'0')}`;
  }, 40);
  
  // Initial noise start if needed
  if (!hasSignal.value) {
      requestAnimationFrame(drawNoise);
  }
});

onUnmounted(() => {
  clearInterval(clockTimer);
});

const signalLabel = computed(() => hasSignal.value ? t('camera.signal') : t('camera.no_signal'));
const noCameraText = computed(() => {
    if (state.isConnected) {
        return 'CAMERA NOT CONFIGURED';
    }
    return t('camera.connection_lost');
});
</script>

<template>
  <div class="camera-feed panel">
    <!-- Top Header HUD -->
    <div class="hud-header">
      <div class="left-group">
         <div class="rec-dot" :class="{ blink: hasSignal }"></div>
         <span class="cam-name mono">{{ t('camera.name') }} // <span :class="hasSignal ? 'text-primary' : 'text-danger'">{{ signalLabel }}</span></span>
      </div>
      <div class="right-group mono">
         {{ timeStr }}
         <span class="fps">60 FPS</span>
      </div>
    </div>

    <div class="viewport">
        <!-- Static Noise Layer -->
        <canvas v-show="!hasSignal" ref="canvasRef" class="noise-canvas" width="320" height="240"></canvas>

        <!-- No Signal Text -->
        <div v-if="!hasSignal" class="no-signal-overlay">
            <div class="warning-box">
                <span class="icon">⚠</span>
                <span>{{ noCameraText }}</span>
                <small>{{ t('camera.retrying') }}</small>
            </div>
        </div>

        <!-- Live Content Overlay -->
        <div v-else class="live-overlay">
            <!-- Simulated environment (gradient) -->
            <div class="scene-gradient"></div>
            
            <!-- Crosshair -->
            <div class="crosshair center">
                <svg viewBox="0 0 100 100" class="reticle">
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.3)" />
                    <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.3)" />
                    <circle cx="50" cy="50" r="20" stroke="rgba(0,255,157,0.5)" fill="none" />
                </svg>
            </div>

            <!-- Bounding Boxes -->
             <div 
              v-for="(t, i) in targets" 
              :key="i"
              class="bbox-corners"
              :style="{ left: t.x + '%', top: t.y + '%', width: t.w + '%', height: t.h + '%' }"
            >
              <div class="c c-tl"></div>
              <div class="c c-tr"></div>
              <div class="c c-bl"></div>
              <div class="c c-br"></div>
              
              <div class="label-tag mono">
                  <span class="uid">ID:{{ 240 + i }}</span>
                  <span class="cls">{{ t.cls }}</span>
                  <span class="conf">{{ Math.floor(t.conf * 100) }}%</span>
              </div>
            </div>

            <!-- Scanline -->
            <div class="scanline"></div>
        </div>
        
        <!-- CRT Vignette & Grid -->
        <div class="crt-effects"></div>
    </div>
    
    <!-- Footer Scan Info -->
    <div class="hud-footer mono">
       <div>{{ t('camera.mode') }}: <span class="highlight">{{ t('camera.assist') }}</span></div>
       <div>{{ t('camera.targets') }}: {{ targets.length }}</div>
       <div>{{ t('camera.latency') }}: 12ms</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.camera-feed {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-border);
  background: #000;
}

.hud-header {
  padding: 8px 12px;
  background: rgba(10, 10, 15, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  z-index: 10;
  
  .left-group { display: flex; align-items: center; gap: 8px; }
  .rec-dot {
    width: 10px; height: 10px; background: var(--color-danger);
    border-radius: 50%;
    &.blink { animation: blink 2s infinite; }
  }
}

.viewport {
  position: relative;
  flex-grow: 1;
  background: #111;
  overflow: hidden;
}

.noise-canvas {
  width: 100%; height: 100%;
  position: absolute; top:0; left:0;
}

.no-signal-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.8);
  z-index: 5;
  
  .warning-box {
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    padding: 20px;
    background: rgba(255,0,0,0.1);
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    font-family: var(--font-mono);
    
    .icon { font-size: 2rem; }
    small { opacity: 0.7; animation: blink 0.5s infinite; }
  }
}

.scene-gradient {
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 50%, #1a1a24 0%, #000 100%);
}

.crosshair {
  position: absolute; top: 50%; left: 50%;
  width: 100px; height: 100px;
  transform: translate(-50%, -50%);
  opacity: 0.5;
}

.bbox-corners {
  position: absolute;
  /* Not a full border, just corners via children */
  
  .c {
    position: absolute; width: 8px; height: 8px;
    border: 2px solid var(--color-primary);
  }
  .c-tl { top: -1px; left: -1px; border-right: none; border-bottom: none; }
  .c-tr { top: -1px; right: -1px; border-left: none; border-bottom: none; }
  .c-bl { bottom: -1px; left: -1px; border-right: none; border-top: none; }
  .c-br { bottom: -1px; right: -1px; border-left: none; border-top: none; }
  
  .label-tag {
    position: absolute; top: -18px; left: 0;
    font-size: 9px;
    display: flex; gap: 4px;
    
    .uid { background: var(--color-primary); color: #000; padding: 1px 3px; font-weight: bold; }
    .cls { color: var(--color-primary); background: rgba(0,0,0,0.7); padding: 1px 3px; }
    .conf { color: #fff; opacity: 0.7; }
  }
}

.scanline {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: rgba(0, 255, 157, 0.2);
  box-shadow: 0 0 10px rgba(0,255,157,0.4);
  animation: scan 4s linear infinite;
  pointer-events: none;
}

.crt-effects {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
  background-size: 100% 4px;
  box-shadow: inset 0 0 50px rgba(0,0,0,0.7);
}

.hud-footer {
  background: rgba(10,10,15,0.95);
  padding: 4px 12px;
  font-size: 0.7rem;
  color: var(--color-text-dim);
  display: flex; gap: 20px;
  border-top: 1px solid rgba(255,255,255,0.1);
  
  .highlight { color: var(--color-info); }
}

@keyframes scan {
  0% { top: -10%; }
  100% { top: 110%; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
