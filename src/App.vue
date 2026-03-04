<script setup>
import { ref, onMounted } from 'vue';
import AttendanceSystem from './components/AttendanceSystem.vue';
import ActivityLog from './components/ActivityLog.vue';
import ReportsView from './components/ReportsView.vue';
import DashboardView from './components/DashboardView.vue';
import NotificationToast from './components/NotificationToast.vue';
import LoginView from './components/LoginView.vue';
import AppSidebar from './components/AppSidebar.vue';
import AppHeader from './components/AppHeader.vue';
import { useAuthStore } from './stores/auth';

const currentTab = ref('attendance');
const authStore = useAuthStore();

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

  <div v-if="authStore.loading" class="loading-screen">
    <div class="spinner"></div>
    <p>Cargando sesión...</p>
  </div>

  <LoginView v-else-if="!authStore.user" />

  <div v-else class="app-container">
    <AppSidebar :currentTab="currentTab" @changeTab="currentTab = $event" />
    <div class="main-wrapper">
      <AppHeader :isDark="isDark" @toggleTheme="toggleTheme" @logout="authStore.logout()" />
      <main class="content-area">
        <AttendanceSystem v-if="currentTab === 'attendance'" />
        <ActivityLog v-if="currentTab === 'activities'" />
        <ReportsView v-if="currentTab === 'reports'" />
        <DashboardView v-if="currentTab === 'dashboard'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  min-height: 100vh;
  background: transparent;
  overflow: hidden;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: 100vh;
}

.content-area {
  padding: 2rem;
  width: 100%;
  max-width: 1400px; /* Un poco más espacioso */
  margin: 0 auto;
  animation: fadeIn 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.loading-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  background: var(--bg-main);
  color: var(--text-sub);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-2);
  border-radius: 50%;
  border-top-color: var(--brand-primary);
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .content-area {
    padding: 1rem;
  }
}
</style>
