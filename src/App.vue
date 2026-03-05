<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import NotificationToast from './components/NotificationToast.vue';
import AppSidebar from './components/AppSidebar.vue';
import AppHeader from './components/AppHeader.vue';
import { useAuthStore } from './features/auth/store/authStore';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const isPublicRoute = computed(() => route.meta.public);

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

async function handleLogout() {
  try {
    await authStore.logout();
    router.push({ name: 'login' });
  } catch (err) {
    console.error('Logout failed:', err);
  }
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

  <template v-else>
    <!-- Public Layout -->
    <main v-if="isPublicRoute" class="full-viewport">
      <router-view />
    </main>

    <!-- App Layout -->
    <div v-else class="app-container">
      <AppSidebar />
      <div class="main-wrapper">
        <AppHeader :isDark="isDark" @toggleTheme="toggleTheme" @logout="handleLogout" />
        <main class="content-area">
          <router-view />
        </main>
      </div>
    </div>
  </template>
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

.full-viewport {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bg-main);
  overflow: hidden;
}

@media (max-width: 768px) {
  .content-area {
    padding: 1rem;
  }
}
</style>
