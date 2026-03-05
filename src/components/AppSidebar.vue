<script setup>
import { 
  ClipboardCheck, 
  PenLine, 
  LayoutDashboard, 
  FileText, 
  Users, 
  Lock, 
  Building2,
  CircleUser,
  Truck
} from 'lucide-vue-next';
import { useAuthStore } from '../features/auth/store/authStore';
import { useTechnicianStore } from '../features/technicians/store/technicianStore';
import { useLocationStore } from '../features/locations/store/locationStore';
import { computed, onMounted } from 'vue';

const authStore = useAuthStore();
const techStore = useTechnicianStore();
const locationStore = useLocationStore();

onMounted(async () => {
  if (techStore.technicians.length === 0) techStore.fetchTechnicians();
  if (locationStore.locations.length === 0) locationStore.fetchLocations();
});

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
</script>

<template>
  <aside class="app-sidebar">
    <div class="sidebar-header">
      <div class="user-block">
        <div class="user-avatar-small">
          <CircleUser :size="32" class="avatar-icon" />
        </div>
        <div class="user-info">
          <h2 class="user-name">{{ userDisplayName }}</h2>
          <span class="user-role-text">{{ userDisplayRole }}</span>
        </div>
      </div>
    </div>
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" active-class="active">
        <LayoutDashboard class="nav-icon" :size="20" /> <span class="nav-text">Dashboard</span>
      </router-link>
      <router-link to="/attendance" class="nav-item" active-class="active">
        <ClipboardCheck class="nav-icon" :size="20" /> <span class="nav-text">Asistencia</span>
      </router-link>
      <router-link to="/activities" class="nav-item" active-class="active">
        <PenLine class="nav-icon" :size="20" /> <span class="nav-text">Actividades</span>
      </router-link>
      <router-link to="/reports" class="nav-item" active-class="active">
        <FileText class="nav-icon" :size="20" /> <span class="nav-text">Reportes</span>
      </router-link>
      <!-- Restricted for SEDE and TECNICO -->
      <router-link v-if="authStore.userProfile?.role === 'admin'" to="/locations" class="nav-item" active-class="active">
        <Building2 class="nav-icon" :size="20" /> <span class="nav-text">Sedes</span>
      </router-link>
      <!-- Access for admin and sede -->
      <router-link v-if="['admin', 'sede'].includes(authStore.userProfile?.role)" to="/technicians" class="nav-item" active-class="active">
        <Users class="nav-icon" :size="20" /> <span class="nav-text">Personal</span>
      </router-link>
      <router-link v-if="['admin', 'sede'].includes(authStore.userProfile?.role)" to="/vehicles" class="nav-item" active-class="active">
        <Truck class="nav-icon" :size="20" /> <span class="nav-text">Vehículos</span>
      </router-link>
      <!-- Restricted for SEDE and TECNICO -->
      <router-link v-if="authStore.userProfile?.role === 'admin'" to="/users" class="nav-item" active-class="active">
        <Lock class="nav-icon" :size="20" /> <span class="nav-text">Usuarios</span>
      </router-link>
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
  padding: 1.5rem 1.25rem;
  border-bottom: 1px solid var(--border-2);
}

.user-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar-small {
  width: 44px;
  height: 44px;
  background: var(--nav-active-bg, #eef2ff);
  color: var(--brand-primary, #6366f1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.1);
}

.user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.user-role-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
