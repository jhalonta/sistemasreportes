<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
import 'vue-sonner/style.css';
import { Toaster } from '@/components/ui/sonner';
import NotificationToast from './components/NotificationToast.vue';
import AppSidebar from './components/AppSidebar.vue';
import AppHeader from './components/AppHeader.vue';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
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
  <Toaster rich-colors position="top-right" />

  <div v-if="authStore.loading"
    class="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
    <div class="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
    <p>Cargando sesión...</p>
  </div>

  <template v-else>
    <!-- Public Layout -->
    <main v-if="isPublicRoute" class="flex h-screen w-screen items-center justify-center bg-background overflow-hidden">
      <router-view />
    </main>

    <!-- App Layout -->
    <SidebarProvider v-else>
      <AppSidebar />
      <SidebarInset>
        <AppHeader :isDark="isDark" @toggleTheme="toggleTheme" @logout="handleLogout" />
        <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
          <router-view />
        </div>
      </SidebarInset>
    </SidebarProvider>
  </template>
</template>

<style scoped>
/* No proprietary styles here, let shadcn/tailwind handle it */
</style>
