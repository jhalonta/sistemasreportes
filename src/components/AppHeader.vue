<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Sun, Moon, LogOut, User, ChevronDown, CircleUser, Navigation, Tag } from 'lucide-vue-next';
import { useAuthStore } from '../features/auth/store/authStore';
import { useTechnicianStore } from '../features/technicians/store/technicianStore';
import { useLocationStore } from '../features/locations/store/locationStore';

defineProps({
  isDark: Boolean,
});
const emit = defineEmits(['toggleTheme', 'logout']);

const authStore = useAuthStore();
const techStore = useTechnicianStore();
const locationStore = useLocationStore();
const router = useRouter();
const isDropdownOpen = ref(false);

const userDisplayName = computed(() => {
  const profile = authStore.userProfile;
  if (!profile) return 'Invitado';
  
  if (profile.role === 'tecnico') {
    const tech = techStore.technicians.find(t => t.id === profile.technicianId);
    return tech ? tech.fullName : 'Técnico';
  } else if (profile.role === 'sede') {
    const sede = locationStore.locations.find(l => l.id === profile.locationId);
    return sede ? sede.nombre : 'Sede';
  } else if (profile.role === 'admin') {
    return 'Administrador';
  }
  return 'Usuario';
});

const userDisplayRole = computed(() => {
  const role = authStore.userProfile?.role;
  if (!role) return '';
  switch (role) {
    case 'admin': return 'Gestión Total';
    case 'sede': return 'Administrativo';
    case 'tecnico': return 'Operativo';
    default: return role;
  }
});

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = (e) => {
  if (!e.target.closest('.user-profile-menu')) {
    isDropdownOpen.value = false;
  }
};

const goToProfile = () => {
  isDropdownOpen.value = false;
  router.push({ name: 'profile' });
};

onMounted(() => {
  window.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeDropdown);
});
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <h2 class="page-title">Sistema de Gestión</h2>
    </div>
    <div class="header-right">
      <button @click="$emit('toggleTheme')" class="theme-toggle" :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
        <Sun v-if="isDark" :size="20" />
        <Moon v-else :size="20" />
      </button>
      
      <div class="nav-divider"></div>

      <div class="user-profile-menu">
        <div class="user-text-info">
          <span class="header-user-name">{{ userDisplayName }}</span>
          <span class="header-user-role">{{ userDisplayRole }}</span>
        </div>
        
        <button class="avatar-trigger" @click.stop="toggleDropdown">
          <div class="header-avatar">
            <CircleUser :size="24" />
          </div>
          <ChevronDown :size="14" class="chevron" :class="{ rotated: isDropdownOpen }" />
        </button>

        <Transition name="dropdown">
          <div v-if="isDropdownOpen" class="profile-dropdown glass-panel">
            <button class="dropdown-item" @click="goToProfile">
              <User :size="18" /> Ver Perfil
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout-item" @click="$emit('logout')">
              <LogOut :size="18" /> Cerrar Sesión
            </button>
          </div>
        </Transition>
      </div>
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

.user-profile-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-left: 0.5rem;
}

.user-text-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.header-user-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
}

.header-user-role {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.avatar-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 12px;
  transition: all 0.2s;
}

.avatar-trigger:hover {
  background: var(--bg-input);
}

.header-avatar {
  width: 40px;
  height: 40px;
  background: var(--nav-active-bg);
  color: var(--brand-primary);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.chevron {
  color: var(--text-muted);
  transition: transform 0.3s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.profile-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 200px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 15px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  z-index: 100;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-input);
  color: var(--brand-primary);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-2);
  margin: 0.25rem 0.5rem;
}

.logout-item {
  color: #ef4444;
}

.logout-item:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
  .user-text-info {
    display: none;
  }
}
</style>
