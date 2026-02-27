<script setup>
import { ref, onMounted } from 'vue';
import AttendanceSystem from './components/AttendanceSystem.vue';
import ActivityLog from './components/ActivityLog.vue';
import ReportsView from './components/ReportsView.vue';
import DashboardView from './components/DashboardView.vue';
import NotificationToast from './components/NotificationToast.vue';

const currentTab = ref('attendance');

// ── Theme toggle ──────────────────────────────────────────────────
const isDark = ref(false);

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  isDark.value = !isDark.value;
  applyTheme(isDark.value);
}

onMounted(() => {
  // Respect saved preference, fallback to system preference
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  isDark.value = saved ? saved === 'dark' : prefersDark;
  applyTheme(isDark.value);
});
</script>

<template>
  <NotificationToast />
  <div class="app-layout">
    <nav class="main-nav">
      <button @click="currentTab = 'attendance'" :class="{ active: currentTab === 'attendance' }" class="nav-tab">
        Asistencia
      </button>
      <button @click="currentTab = 'activities'" :class="{ active: currentTab === 'activities' }" class="nav-tab">
        Actividades
      </button>
      <button @click="currentTab = 'reports'" :class="{ active: currentTab === 'reports' }" class="nav-tab">
        Reportes
      </button>
      <button @click="currentTab = 'dashboard'" :class="{ active: currentTab === 'dashboard' }" class="nav-tab">
        📊 Dashboard
      </button>
      <div class="nav-divider"></div>
      <button @click="toggleTheme" class="theme-toggle" :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
        <span v-if="isDark">☀️</span>
        <span v-else>🌙</span>
      </button>
    </nav>

    <div class="content-area">
      <AttendanceSystem v-if="currentTab === 'attendance'" />
      <ActivityLog v-if="currentTab === 'activities'" />
      <ReportsView v-if="currentTab === 'reports'" />
      <DashboardView v-if="currentTab === 'dashboard'" />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 98vw;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  justify-content: flex-start;
  align-items: center;
}

.main-nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: var(--nav-bg);
  backdrop-filter: blur(14px);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  width: fit-content;
  max-width: 95vw;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.nav-tab {
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.92rem;
  padding: 0.45rem 1.25rem;
  border-radius: 9px;
  transition: var(--tr);
  border: none;
  cursor: pointer;
}

.nav-tab:hover {
  background: var(--info-bg);
  color: var(--brand-primary);
  border-color: var(--border);
}

.nav-tab.active {
  background: var(--nav-active-bg);
  color: var(--nav-active-fg);
  box-shadow: 0 2px 12px rgba(99,102,241,0.18);
}

.nav-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
  margin: 0 4px;
  align-self: center;
}

.theme-toggle {
  background: transparent;
  border: none;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  transition: var(--tr);
}

.theme-toggle:hover {
  background: var(--info-bg);
  transform: rotate(20deg) scale(1.1);
}

@media print {
  .main-nav { display: none; }
}

.content-area {
  width: 100%;
  display: flex;
  justify-content: center;
  animation: fadeIn 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
