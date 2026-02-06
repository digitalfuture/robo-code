<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { t } from '../services/i18n';

interface Log {
  id: number;
  time: string;
  type: 'info' | 'warn' | 'error' | 'success';
  msg: string;
}

const logs = ref<Log[]>([]);
const logContainer = ref<HTMLElement | null>(null);

const addLog = (msg: string, type: Log['type'] = 'info') => {
  const now = new Date();
  logs.value.push({
    id: Date.now(),
    time: now.toLocaleTimeString(),
    type,
    msg
  });
  if (logs.value.length > 50) logs.value.shift();
  
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

onMounted(() => {
  // Simulate logs
  addLog(t('log.init'), 'success');
  addLog(t('log.connecting'), 'info');
  addLog(t('log.waiting'), 'warn');
  setTimeout(() => addLog(t('log.connected'), 'success'), 1000);
  
  setInterval(() => {
    if (Math.random() > 0.6) {
      const msgs: { t: Log['type']; m: string }[] = [
        { t: 'info', m: 'POSITION UPDATE [0x1404]' },
        { t: 'success', m: 'AI CORRECT [OK]' },
        { t: 'warn', m: 'LATENCY > 50ms' },
        { t: 'info', m: 'SCANNING...' }
      ];
      const randomIndex = Math.floor(Math.random() * msgs.length);
      const item = msgs[randomIndex];
      if (item) {
        addLog(item.m, item.t);
      }
    }
  }, 1500);
});
</script>

<template>
  <div class="console-log panel">
    <h3 class="title mono">{{ t('log.title') }}</h3>
    <div class="logs-container mono" ref="logContainer">
      <div v-for="log in logs" :key="log.id" class="log-entry" :class="log.type">
        <span class="time">[{{ log.time }}]</span>
        <span class="msg">{{ log.msg }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.console-log {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.title {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.logs-container {
  flex-grow: 1;
  overflow-y: auto;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: var(--color-bg); 
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border); 
  }
}

.log-entry {
  display: flex;
  gap: 8px;
  
  .time { color: var(--color-text-dim); width: 68px; flex-shrink: 0; }
  .msg { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  
  &.info .msg { color: var(--color-text); }
  &.warn .msg { color: var(--color-warning); }
  &.error .msg { color: var(--color-danger); }
  &.success .msg { color: var(--color-primary); }
}
</style>
