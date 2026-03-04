<script setup>
import { Sun, Moon, LogOut } from 'lucide-vue-next';

defineProps({
  isDark: Boolean,
});
defineEmits(['toggleTheme', 'logout']);
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <!-- You could put a breadcrumb or title here if you want -->
      <h2 class="page-title">Sistema de Gestión</h2>
    </div>
    <div class="header-right">
      <button @click="$emit('toggleTheme')" class="theme-toggle" :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
        <Sun v-if="isDark" :size="20" />
        <Moon v-else :size="20" />
      </button>
      <div class="nav-divider"></div>
      <button @click="$emit('logout')" class="logout-btn" title="Cerrar Sesión">
        <LogOut :size="18" /> Salir
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2.5rem;
  background: var(--glass-bg, rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  position: sticky;
  top: 0;
  z-index: 90;
}

.page-title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-main, #1e293b);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: transparent;
  border: none;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  background: var(--bg-input, #f8fafc);
}

.theme-toggle:hover {
  transform: rotate(15deg) scale(1.1);
  background: var(--info-bg, #e2e8f0);
}

.nav-divider {
  width: 1px;
  height: 24px;
  background: var(--border, #cbd5e1);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fee2e2;
  color: #ef4444;
  font-weight: 600;
  padding: 0.5rem 1.2rem;
  border-radius: 9px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  cursor: pointer;
}

.logout-btn:hover {
  background: #fca5a5;
  color: #991b1b;
  border-color: #f87171;
  transform: translateY(-1px);
}

@media print {
  .app-header { display: none; }
}

@media (max-width: 768px) {
  .app-header {
    padding: 1rem;
  }
  .page-title {
    font-size: 1.1rem;
  }
}
</style>
