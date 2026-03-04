<script setup>
import { ClipboardCheck, PenLine, LayoutDashboard, FileText } from 'lucide-vue-next';

defineProps({
  currentTab: String,
});
defineEmits(['changeTab']);
</script>

<template>
  <aside class="app-sidebar">
    <div class="sidebar-header">
      <h2 class="sidebar-brand">Reportes</h2>
    </div>
    <nav class="sidebar-nav">
      <button @click="$emit('changeTab', 'attendance')" :class="{ active: currentTab === 'attendance' }" class="nav-item">
        <ClipboardCheck class="nav-icon" :size="20" /> <span class="nav-text">Asistencia</span>
      </button>
      <button @click="$emit('changeTab', 'activities')" :class="{ active: currentTab === 'activities' }" class="nav-item">
        <PenLine class="nav-icon" :size="20" /> <span class="nav-text">Actividades</span>
      </button>
      <button @click="$emit('changeTab', 'dashboard')" :class="{ active: currentTab === 'dashboard' }" class="nav-item">
        <LayoutDashboard class="nav-icon" :size="20" /> <span class="nav-text">Dashboard</span>
      </button>
      <button @click="$emit('changeTab', 'reports')" :class="{ active: currentTab === 'reports' }" class="nav-item">
        <FileText class="nav-icon" :size="20" /> <span class="nav-text">Reportes</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 260px;
  background: var(--nav-bg, rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(14px);
  border-right: 1px solid var(--glass-border);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  box-shadow: 4px 0 15px rgba(0,0,0,0.05);
  transition: width 0.3s;
  z-index: 100;
}

.sidebar-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border, #e2e8f0);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-brand {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  background: var(--primary-gradient, linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  background: transparent;
  color: var(--text-muted, #64748b);
  font-weight: 600;
  font-size: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
  text-align: left;
}

.nav-item:hover {
  background: var(--info-bg, #f8fafc);
  color: var(--brand-primary, #4f46e5);
  transform: translateX(4px);
}

.nav-item.active {
  background: var(--nav-active-bg, #eef2ff);
  color: var(--nav-active-fg, #4338ca);
  box-shadow: 0 4px 12px rgba(99,102,241,0.1);
  font-weight: 700;
}

@media (max-width: 768px) {
  .app-sidebar {
    width: 80px;
  }
  .sidebar-brand {
    font-size: 1rem;
  }
  .nav-text {
    display: none;
  }
  .nav-item {
    padding: 1rem;
    justify-content: center;
  }
}

@media print {
  .app-sidebar { display: none; }
}
</style>
