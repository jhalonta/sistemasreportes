<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '../store/authStore';
import { useTechnicianStore } from '../../technicians/store/technicianStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  Phone, 
  IdCard,
  MapPin,
  Clock,
  Briefcase
} from 'lucide-vue-next';

const authStore = useAuthStore();
const techStore = useTechnicianStore();
const locationStore = useLocationStore();

onMounted(async () => {
  if (techStore.technicians.length === 0) techStore.fetchTechnicians();
  if (locationStore.locations.length === 0) locationStore.fetchLocations();
});

const profile = computed(() => authStore.userProfile);

const technicalData = computed(() => {
  if (profile.value?.role === 'tecnico') {
    return techStore.technicians.find(t => t.id === profile.value.technicianId);
  }
  return null;
});

const locationData = computed(() => {
  if (profile.value?.role === 'sede') {
    return locationStore.locations.find(l => l.id === profile.value.locationId);
  } else if (technicalData.value?.locationId) {
    return locationStore.locations.find(l => l.id === technicalData.value.locationId);
  }
  return null;
});

const formatDate = (date) => {
  if (!date) return 'No disponible';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
};
</script>

<template>
  <div class="profile-view">
    <div class="profile-header">
      <div class="header-content">
        <h1 class="title">Mi Perfil</h1>
        <p class="subtitle">Gestiona tu información personal y de acceso.</p>
      </div>
    </div>

    <div class="profile-grid">
      <!-- Left Column: User Card -->
      <div class="profile-card user-main-card glass-panel">
        <div class="user-avatar-large">
          <div class="avatar-circle" :class="profile?.role">
            <User v-if="profile?.role === 'tecnico'" :size="64" />
            <ShieldCheck v-else-if="profile?.role === 'admin'" :size="64" />
            <Building2 v-else :size="64" />
          </div>
        </div>
        
        <div class="user-basic-info">
          <h2 class="full-name">
            {{ technicalData?.fullName || (profile?.role === 'admin' ? 'Administrador del Sistema' : locationData?.nombre) }}
          </h2>
          <div class="role-tag" :class="profile?.role">
            {{ profile?.role === 'tecnico' ? 'Técnico Operativo' : (profile?.role === 'admin' ? 'Super Administrador' : 'Administrador de Sede') }}
          </div>
          <p class="user-email">
            <Mail :size="16" /> {{ authStore.user?.email }}
          </p>
        </div>

        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ formatDate(profile?.createdAt) }}</span>
            <span class="stat-label">Miembro desde</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Details -->
      <div class="details-column">
        <!-- Technical Info (If technician) -->
        <div v-if="technicalData" class="profile-card glass-panel info-section">
          <div class="section-header">
            <Briefcase :size="20" />
            <h3>Información Profesional</h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <label><IdCard :size="16" /> DNI</label>
              <span>{{ technicalData.dni }}</span>
            </div>
            <div class="info-item">
              <label><Phone :size="16" /> Teléfono</label>
              <span>{{ technicalData.phone }}</span>
            </div>
            <div class="info-item">
              <label><Clock :size="16" /> Cargo Actual</label>
              <span>{{ technicalData.role }}</span>
            </div>
            <div class="info-item">
              <label><ShieldCheck :size="16" /> Estado</label>
              <span class="status-indicator" :class="{ active: technicalData.active }">
                {{ technicalData.active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Location Info -->
        <div v-if="locationData" class="profile-card glass-panel info-section">
          <div class="section-header">
            <Building2 :size="20" />
            <h3>Sede de Trabajo</h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <label><Building2 :size="16" /> Nombre Comercial</label>
              <span>{{ locationData.nombre }}</span>
            </div>
            <div class="info-item">
              <label><Tag :size="16" /> Código Sede</label>
              <span>{{ locationData.codigo }}</span>
            </div>
            <div class="info-item">
              <label><MapPin :size="16" /> Ubicación</label>
              <span>{{ locationData.ciudad }}, {{ locationData.departamento }}</span>
            </div>
            <div class="info-item">
              <label><Navigation :size="16" /> Dirección</label>
              <span>{{ locationData.direccion }}</span>
            </div>
          </div>
        </div>

        <!-- System Account Info -->
        <div class="profile-card glass-panel info-section">
          <div class="section-header">
            <Lock :size="20" />
            <h3>Seguridad de la Cuenta</h3>
          </div>
          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <strong>ID de Usuario</strong>
                <span>{{ authStore.user?.uid }}</span>
              </div>
            </div>
            <div class="security-item">
              <div class="security-info">
                <strong>Verificación de Email</strong>
                <span :class="authStore.user?.emailVerified ? 'verified' : 'unverified'">
                  {{ authStore.user?.emailVerified ? 'Verificado' : 'Pendiente' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-header {
  margin-bottom: 0.5rem;
}

.title {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-muted);
  margin: 0.5rem 0 0 0;
  font-size: 1.1rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  align-items: start;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

.profile-card {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.user-main-card {
  text-align: center;
  align-items: center;
}

.user-avatar-large {
  position: relative;
  margin-bottom: 1rem;
}

.avatar-circle {
  width: 140px;
  height: 140px;
  border-radius: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nav-active-bg, #eef2ff);
  color: var(--brand-primary, #6366f1);
  box-shadow: 0 10px 30px -5px rgba(99, 102, 241, 0.2);
}

.avatar-circle.admin { background: #fef3c7; color: #d97706; }
.avatar-circle.sede { background: #eff6ff; color: #3b82f6; }

.full-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.2;
}

.role-tag {
  display: inline-block;
  margin: 0.75rem 0;
  padding: 0.4rem 1rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--nav-active-bg);
  color: var(--brand-primary);
}

.role-tag.admin { background: #fef3c7; color: #92400e; }
.role-tag.sede { background: #eff6ff; color: #1d4ed8; }

.user-email {
  color: var(--text-muted);
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.profile-stats {
  width: 100%;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-2);
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.details-column {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--brand-primary);
  margin-bottom: 0.5rem;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 600px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-item span {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.75rem;
  border-radius: 99px;
  background: #fef2f2;
  color: #ef4444;
  font-size: 0.85rem;
}

.status-indicator.active {
  background: #ecfdf5;
  color: #10b981;
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.security-item {
  padding: 1rem;
  background: var(--bg-input, #f8fafc);
  border: 1px solid var(--border-2);
  border-radius: 12px;
}

.security-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.security-info strong {
  font-size: 0.9rem;
  color: var(--text-main);
}

.security-info span {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-family: monospace;
}

.verified { color: #10b981; font-weight: 700; }
.unverified { color: #f59e0b; font-weight: 700; }
</style>
