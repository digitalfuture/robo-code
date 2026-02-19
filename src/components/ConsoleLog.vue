<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { t } from '../services/i18n';
import { robotService } from '../services/robotState';

const logContainer = ref<HTMLElement | null>(null);
const state = robotService.state;
const isUserScrolledUp = ref(false);
const isPaused = ref(false);

// Track if user scrolled up to read old logs
const onScroll = () => {
  if (logContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
    // User is scrolled up if they're more than 50px from bottom
    isUserScrolledUp.value = scrollHeight - scrollTop - clientHeight > 50;
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value && !isUserScrolledUp.value && !isPaused.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

const togglePause = () => {
  isPaused.value = !isPaused.value;
  if (!isPaused.value) {
    scrollToBottom();
  }
};

watch(() => state.logs.length, scrollToBottom);

onMounted(() => {
  // Don't auto-scroll on mount
  if (state.logs.length === 0) {
    robotService.addLog(t('log.init'), 'success');
  }
});
</script>

<template>
  <div class="console-log">
    <div class="logs-header">
      <button class="pause-btn" @click="togglePause" :class="{ paused: isPaused }">
        <span v-if="isPaused">▶</span>
        <span v-else>⏸</span>
        {{ isPaused ? t('log.resumed') : t('log.paused') }}
      </button>
    </div>

    <div v-if="!state.isConnected" class="offline-overlay mono">
      <div class="pulse-icon"></div>
      <span>{{ t('log.no_connection') }}</span>
    </div>

    <div class="logs-container mono" ref="logContainer" @scroll="onScroll">
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
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

.logs-header {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px;
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border);
}

.pause-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.75rem;
  background: var(--color-bg-element);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-bg-element-hover);
    border-color: var(--color-primary);
  }

  &.paused {
    background: var(--color-warning);
    color: var(--color-bg);
    border-color: var(--color-warning);
  }
}

.console-header {
  display: none;
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

  .time { 
    color: var(--color-text-dim); 
    white-space: nowrap;
    font-size: 0.7rem;
  }
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

