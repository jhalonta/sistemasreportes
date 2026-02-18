<script setup>
import { ref } from 'vue';
import AttendanceSystem from './components/AttendanceSystem.vue';
import ActivityLog from './components/ActivityLog.vue';
import ReportsView from './components/ReportsView.vue';
import NotificationToast from './components/NotificationToast.vue';

const currentTab = ref('attendance'); // 'attendance', 'activities', 'reports'
</script>

<template>
  <NotificationToast />
  <div class="app-layout">
    <nav class="main-nav">
      <button 
        @click="currentTab = 'attendance'" 
        :class="{ active: currentTab === 'attendance' }"
        class="nav-tab"
      >
        Asistencia
      </button>
      <button 
        @click="currentTab = 'activities'" 
        :class="{ active: currentTab === 'activities' }"
        class="nav-tab"
      >
        Actividades
      </button>
      <button 
        @click="currentTab = 'reports'" 
        :class="{ active: currentTab === 'reports' }"
        class="nav-tab"
      >
        Reportes
      </button>
    </nav>

    <div class="content-area">
      <AttendanceSystem v-if="currentTab === 'attendance'" />
      <ActivityLog v-if="currentTab === 'activities'" />
      <ReportsView v-if="currentTab === 'reports'" />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  width: 100%;
  max-width: 98vw; /* Almost full width as requested */
  margin: 0 auto; /* Center horizontally */
  padding: 1rem;
  min-height: 100vh;
  justify-content: flex-start; /* Start from top */
  align-items: center; /* Center children */
}

.main-nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap; /* Allow wrapping on small screens */
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  width: fit-content;
  max-width: 95vw;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.nav-tab {
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.3);
  color: var(--text-main);
}

.nav-tab.active {
  background: white;
  color: #6366f1; /* Primary indigo */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

@media print {
  .main-nav {
    display: none;
  }
}

.content-area {
  width: 100%;
  display: flex;
  justify-content: center;
  animation: fadeIn 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
