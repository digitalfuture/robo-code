<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import CameraFeed from './components/CameraFeed.vue';
import RobotStatus from './components/RobotStatus.vue';
import ConsoleLog from './components/ConsoleLog.vue';
import ControlPanel from './components/ControlPanel.vue';
import { currentLang, setLanguage, t } from './services/i18n';
import { robotService } from './services/robotState';
import type { Language } from './services/i18n';

const langs: Language[] = ['EN', 'RU', 'CN'];
const state = robotService.state;
const isConnected = computed(() => state.isConnected);
const showConsole = ref(false);

// Auto-connect on app mount
onMounted(() => {
  robotService.addLog('=== APPLICATION STARTED ===', 'success');
  robotService.addLog(`Interface language: ${currentLang.value}`, 'info');
  robotService.addLog('Attempting initial connection...', 'info');
  robotService.connect();
  showConsole.value = true;
});
</script>

<template>
  <div class="app-container">
    <header>
      <div class="brand">
        <h1>ROBO<span class="highlight">CORE</span> v2.0</h1>
        <span class="subtitle mono">{{ t('header.subtitle') }}</span>
      </div>

      <div class="header-right">
          <div class="lang-switch">
             <button
                v-for="l in langs"
                :key="l"
                class="lang-btn"
                :class="{ active: currentLang === l }"
                @click="setLanguage(l)"
             >
               {{ l }}
             </button>
          </div>
          <div class="network-status mono">
            <button class="console-toggle-btn" @click="showConsole = !showConsole">
              <span class="icon">📋</span>
              <span class="label">{{ showConsole ? t('log.hide') : t('log.show') }}</span>
            </button>
            <span class="divider">|</span>
            {{ t('header.net') }}: <span :class="isConnected ? 'online' : 'offline'">{{ isConnected ? t('header.online') : t('status.offline') }}</span>
            <template v-if="isConnected">| {{ t('header.ping') }}: 24ms</template>
          </div>
      </div>
    </header>

    <main class="dashboard-grid">
      <div class="main-view">
        <CameraFeed />
      </div>
      <div class="side-panel">
        <RobotStatus />
      </div>
    </main>

    <footer>
      <ControlPanel />
    </footer>

    <!-- Console Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showConsole" class="console-modal-overlay" @click="showConsole = false">
          <div class="console-modal" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title mono">{{ t('log.title') }}</h3>
              <div class="modal-actions">
                <button class="clear-btn" @click="robotService.clearLogs()" :title="t('log.clear')">
                  🗑 {{ t('log.clear') }}
                </button>
                <button class="modal-close" @click="showConsole = false">×</button>
              </div>
            </div>
            <ConsoleLog />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  padding: 1rem;
  gap: 1rem;
  margin: 0;
  box-sizing: border-box;

  @media (max-width: 1200px) {
    padding: 0.5rem;
    gap: 0.5rem;
  }
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  
  .brand {
    h1 { font-size: 1.5rem; letter-spacing: 2px; }
    .highlight { color: var(--color-primary); }
    .subtitle { color: var(--color-text-dim); font-size: 0.8rem; margin-top: 4px; display: block;}
  }

  .network-status {
    font-size: 0.9rem;
    color: var(--color-text-dim);
    display: flex;
    align-items: center;
    gap: 10px;

    .divider { color: var(--color-border); }
    .online { color: var(--color-primary); text-shadow: 0 0 5px var(--color-primary); }
    .offline { color: var(--color-danger); }
  }
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.lang-switch {
  display: flex;
  gap: 2px;
  background: var(--color-panel);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.lang-btn {
  background: transparent;
  color: var(--color-text-dim);
  border: none;
  font-size: 0.7rem;
  padding: 2px 8px;
  cursor: pointer;

  &:hover { color: var(--color-text); }
  &.active {
    background: var(--color-primary);
    color: #000;
  }
}

/* Console Toggle Button */
.console-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  padding: 4px 10px;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: var(--font-mono);
  color: var(--color-text-dim);

  .icon { font-size: 0.9rem; }

  &:hover {
    background: var(--color-primary);
    color: #000;
    border-color: var(--color-primary);
  }
}

.dashboard-grid {
  flex-grow: 1;
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 1rem;
  min-height: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
    padding-right: 5px;
  }
}

.main-view {
  display: flex;
  flex-direction: column;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  height: 100%;

  :deep(.robot-status) {
    flex: 0 0 auto;
    max-height: 100%;
  }
}

footer {
  margin-top: auto;
}

/* Modal Styles */
.console-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.console-modal {
  background: var(--color-panel);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 1000px;
  height: 70vh;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);

  .modal-title {
    color: var(--color-primary);
    font-size: 0.9rem;
    margin: 0;
    letter-spacing: 2px;
  }

  .modal-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .clear-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--color-border);
    color: var(--color-text-dim);
    font-size: 0.7rem;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--font-mono);

    &:hover {
      background: var(--color-warning);
      color: #000;
      border-color: var(--color-warning);
    }
  }

  .modal-close {
    background: transparent;
    border: none;
    color: var(--color-text-dim);
    font-size: 1.5rem;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      color: var(--color-danger);
      background: rgba(255, 0, 85, 0.1);
    }
  }
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .console-modal,
.modal-leave-active .console-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from .console-modal,
.modal-leave-to .console-modal {
  transform: scale(0.95);
}
</style>
