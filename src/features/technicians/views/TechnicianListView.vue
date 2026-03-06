<script setup>
import { onMounted, ref, watchEffect } from 'vue';
import { useTechnicianStore } from '../store/technicianStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import TechnicianModal from '../components/TechnicianModal.vue';
import BaseModal from '../../../components/BaseModal.vue';
import { Plus, Pencil, Trash2, User, Phone, Mail, Search, AlertTriangle, Building2 } from 'lucide-vue-next';

const techStore = useTechnicianStore();
const locationStore = useLocationStore();
const authStore = useAuthStore();
const showModal = ref(false);
const selectedTech = ref(null);
const searchQuery = ref('');
const selectedSede = ref(''); // Admin filter

onMounted(() => {
  techStore.fetchTechnicians();
  locationStore.fetchLocations();
});

const openModal = (tech = null) => {
  selectedTech.value = tech;
  showModal.value = true;
};

const handleSave = async (data) => {
  try {
    const profile = authStore.userProfile;
    // If user is SEDE, enforce their locationId
    if (profile?.role === 'sede') {
      data.locationId = profile.locationId;
    }
    
    if (selectedTech.value) {
      await techStore.updateTechnician(selectedTech.value.id, data);
    } else {
      await techStore.addTechnician(data);
    }
    showModal.value = false;
  } catch (err) {
    // Error handled in store
  }
};

const techToDelete = ref(null);

const confirmDelete = (tech) => {
  techToDelete.value = tech;
};

const handleDelete = async () => {
  if (techToDelete.value) {
    await techStore.deleteTechnician(techToDelete.value.id);
    techToDelete.value = null;
  }
};

const filteredTechnicians = ref([]);

watchEffect(() => {
  const profile = authStore.userProfile;
  
  filteredTechnicians.value = techStore.technicians.filter(t => {
    // Filter by role/sede access
    if (profile?.role === 'sede') {
      if (t.locationId !== profile.locationId) return false;
    } else if (profile?.role === 'admin' && selectedSede.value) {
      if (t.locationId !== selectedSede.value) return false;
    }
    
    const locName = locationStore.locations.find(l => l.id === t.locationId)?.nombre || '';
    return t.fullName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.phone?.includes(searchQuery.value) ||
      t.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      t.role?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      locName.toLowerCase().includes(searchQuery.value.toLowerCase());
  });
});

const getLocationName = (locationId) => {
  const loc = locationStore.locations.find(l => l.id === locationId);
  return loc ? loc.nombre : 'Sin sede';
};
</script>

<template>
  <div class="tech-view">
    <div class="view-header">
      <div class="header-info">
        <h2 class="title"><User :size="28" class="title-icon" /> Gestión de Personal</h2>
        <p class="subtitle">
          {{ authStore.userProfile?.role === 'sede' ? 'Administra el personal de tu sede.' : 'Administra el personal del sistema.' }}
        </p>
      </div>
      <button class="btn-add" @click="openModal()">
        <Plus :size="18" /> Nuevo Personal
      </button>
    </div>

    <div class="view-controls glass-panel">
      <div class="search-wrap">
        <Search :size="20" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por nombre, teléfono o email..." />
      </div>

      <!-- Sede Filter for Admin -->
      <div v-if="authStore.userProfile?.role === 'admin'" class="sede-filter-wrap">
        <div class="filter-box">
          <Building2 :size="18" class="filter-icon" />
          <select v-model="selectedSede" class="sede-select">
            <option value="">Todas las Sedes</option>
            <option v-for="l in locationStore.locations" :key="l.id" :value="l.id">
              {{ l.nombre }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="table-container glass-panel">
      <div v-if="techStore.loading && techStore.technicians.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando personal...</p>
      </div>

      <div v-else-if="filteredTechnicians.length === 0" class="empty-state">
        <AlertTriangle :size="48" class="empty-icon" />
        <p>No se encontró personal.</p>
      </div>

      <table v-else class="tech-table">
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Contacto</th>
            <th>Sede</th>
            <th>Cargo</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTechnicians" :key="t.id">
            <td>
              <div class="tech-name-cell">
                <div class="tech-avatar">{{ t.fullName.charAt(0) }}</div>
                <span>{{ t.fullName }}</span>
              </div>
            </td>
            <td>
              <div class="tech-contact">
                <div v-if="t.phone"><Phone :size="14" /> {{ t.phone }}</div>
                <div v-if="t.email" class="email-text"><Mail :size="14" /> {{ t.email }}</div>
              </div>
            </td>
            <td>
              <div class="tech-location">
                <Building2 :size="14" /> {{ getLocationName(t.locationId) }}
              </div>
            </td>
            <td>
              <div class="tech-role">
                <span class="role-badge">{{ t.role || 'Sin cargo' }}</span>
              </div>
            </td>
            <td>
              <span class="status-badge" :class="t.active ? 'active' : 'inactive'">
                {{ t.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-right">
              <div class="actions">
                <button class="btn-action edit" @click="openModal(t)" title="Editar">
                  <Pencil :size="16" />
                </button>
                <button class="btn-action delete" @click="confirmDelete(t)" title="Eliminar">
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <TechnicianModal 
      :show="showModal" 
      :technician="selectedTech" 
      :loading="techStore.loading"
      @close="showModal = false"
      @save="handleSave"
    />

    <BaseModal
      :show="!!techToDelete"
      title="¿Eliminar Personal?"
      subtitle="Esta acción no se puede deshacer y el personal será removido del sistema."
      :icon="AlertTriangle"
      max-width="450px"
      @close="techToDelete = null"
    >
      <div class="delete-confirm">
        <p>¿Estás seguro de que deseas eliminar a <strong>{{ techToDelete?.fullName }}</strong>?</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="techToDelete = null">Cancelar</button>
        <button class="btn-danger" @click="handleDelete">Sí, Eliminar</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.tech-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-icon {
  color: #6366f1;
  -webkit-text-fill-color: initial;
}

.subtitle {
  color: var(--text-muted);
  margin: 0.25rem 0 0 0;
}

.btn-add {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.view-controls {
  padding: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.sede-filter-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.filter-box {
  position: relative;
  width: 100%;
  max-width: 280px;
}

.filter-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.sede-select {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  font-size: 0.95rem;
}

.search-wrap {
  position: relative;
  max-width: 500px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-wrap input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}

.table-container {
  min-height: 400px;
}

.tech-table {
  width: 100%;
  border-collapse: collapse;
}

.tech-table th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-2);
}

.tech-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-2);
}

.tech-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.tech-avatar {
  width: 36px;
  height: 36px;
  background: var(--nav-active-bg, #eef2ff);
  color: var(--brand-primary, #6366f1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.tech-contact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.9rem;
}

.tech-contact div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
}

.email-text {
  font-size: 0.8rem;
}

.role-badge {
  background: var(--nav-active-bg, #eef2ff);
  color: #6366f1;
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.tech-location {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-badge.active {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge.inactive {
  background: var(--danger-bg);
  color: var(--danger);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action.edit {
  background: #eff6ff;
  color: #3b82f6;
}

.btn-action.delete {
  background: #fef2f2;
  color: #ef4444;
}

.text-right { text-align: right; }

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-2);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}

@keyframes rotate { to { transform: rotate(360deg); } }
.btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.delete-confirm {
  padding: 0.5rem 0;
  color: var(--text-main);
  line-height: 1.6;
}

.delete-confirm strong {
  color: #ef4444;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--border-2, #e2e8f0);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--border, #cbd5e1);
}
</style>
