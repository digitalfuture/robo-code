<script setup lang="ts">
import CameraFeed from './components/CameraFeed.vue';
import RobotStatus from './components/RobotStatus.vue';
import ConsoleLog from './components/ConsoleLog.vue';
import ControlPanel from './components/ControlPanel.vue';
import { currentLang, setLanguage, t } from './services/i18n';
import type { Language } from './services/i18n';

const langs: Language[] = ['EN', 'RU', 'CN'];
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
            {{ t('header.net') }}: <span class="online">{{ t('header.online') }}</span> | {{ t('header.ping') }}: 24ms
          </div>
      </div>
    </header>

    <main class="dashboard-grid">
      <div class="main-view">
        <CameraFeed />
      </div>
      <div class="side-panel">
        <RobotStatus />
        <ConsoleLog />
      </div>
    </main>

    <footer>
      <ControlPanel />
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 1rem;
  gap: 1rem;
  max-width: 1600px;
  margin: 0 auto;
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
    .online { color: var(--color-primary); text-shadow: 0 0 5px var(--color-primary); }
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

.dashboard-grid {
  flex-grow: 1;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  min-height: 0; /* Important for scroll */
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
  
  /* Give RobotStatus strict height or flex */
  :deep(.robot-status) { flex: 0 0 auto; }
  :deep(.console-log) { flex: 1 1 auto; min-height: 0; }
}

footer {
  margin-top: auto;
}
</style>
