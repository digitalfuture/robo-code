<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { t } from '../services/i18n';
import { robotService } from '../services/robotState';

const logContainer = ref<HTMLElement | null>(null);
const state = robotService.state;

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

watch(() => state.logs.length, scrollToBottom);

onMounted(() => {
  scrollToBottom();
  if (state.logs.length === 0) {
    robotService.addLog(t('log.init'), 'success');
  }
});
</script>

<template>
  <div class="console-log panel">
    <div class="console-header">
      <h3 class="title mono">{{ t('log.title') }}</h3>
      
      <div class="connection-details mono">
        <div class="detail-item">
          <span class="label">{{ t('log.address') }}:</span>
          <span class="value">{{ state.connection.address }}</span>
        </div>
        <div class="detail-item">
          <span class="label">{{ t('log.port') }}:</span>
          <span class="value">{{ state.connection.port }}</span>
        </div>
        <div class="detail-item">
          <span class="label">{{ t('log.protocol') }}:</span>
          <span class="value">{{ state.connection.protocol }}</span>
        </div>
      </div>
    </div>

    <div v-if="!state.isConnected" class="offline-overlay mono">
      <div class="pulse-icon"></div>
      <span>{{ t('log.no_connection') }}</span>
    </div>

    <div class="logs-container mono" ref="logContainer">
      <div v-for="log in state.logs" :key="log.id" class="log-entry" :class="log.type">
        <span class="time">[{{ log.time }}]</span>
        <span class="type-badge" v-if="log.type === 'cmd'">CMD</span>
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
  position: relative;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.25rem;
}

.title {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin: 0;
}

.connection-details {
  display: flex;
  gap: 15px;
  font-size: 0.7rem;
  
  .detail-item {
    display: flex;
    gap: 4px;
    .label { color: var(--color-text-dim); }
    .value { color: var(--color-primary); }
  }
}

.offline-overlay {
  background: rgba(var(--color-danger-rgb), 0.1);
  border: 1px solid var(--color-danger);
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--color-danger);

  .pulse-icon {
    width: 8px;
    height: 8px;
    background: var(--color-danger);
    border-radius: 50%;
    animation: pulse 1s infinite alternate;
  }
}

@keyframes pulse {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.logs-container {
  flex-grow: 1;
  overflow-y: auto;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}

.log-entry {
  display: flex;
  gap: 8px;
  align-items: baseline;
  
  .time { color: var(--color-text-dim); width: 68px; flex-shrink: 0; }
  .msg { 
    white-space: pre-wrap; 
    word-break: break-all;
  }
  
  .type-badge {
    font-size: 0.6rem;
    padding: 0px 4px;
    background: var(--color-border);
    color: var(--color-text-dim);
    border-radius: 2px;
    line-height: normal;
  }
  
  &.info .msg { color: var(--color-text); }
  &.warn .msg { color: var(--color-warning); }
  &.error .msg { color: var(--color-danger); }
  &.success .msg { color: var(--color-primary); }
  &.cmd {
    .msg { color: #00ffea; font-style: italic; }
    .type-badge { background: #00ffea33; color: #00ffea; }
  }
}
</style>

