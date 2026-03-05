<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin, 
  User, 
  Tag, 
  AlertTriangle 
} from 'lucide-vue-next';
import { useLocationStore } from '../store/locationStore';
import LocationModal from '../components/LocationModal.vue';
import BaseModal from '../../../components/BaseModal.vue';

const locationStore = useLocationStore();
const searchQuery = ref('');
const showAddModal = ref(false);
const selectedLocation = ref(null);
const showDeleteConfirm = ref(false);
const locationToDelete = ref(null);

onMounted(() => {
  locationStore.fetchLocations();
});

const filteredLocations = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return locationStore.locations.filter(loc => 
    loc.nombre.toLowerCase().includes(query) ||
    loc.codigo.toLowerCase().includes(query) ||
    loc.ciudad.toLowerCase().includes(query)
  );
});

const openEditModal = (loc) => {
  selectedLocation.value = loc;
  showAddModal.value = true;
};

const openAddModal = () => {
  selectedLocation.value = null;
  showAddModal.value = true;
};

const handleSave = async (data) => {
  try {
    if (selectedLocation.value) {
      await locationStore.updateLocation(selectedLocation.value.id, data);
    } else {
      await locationStore.addLocation(data);
    }
    showAddModal.value = false;
  } catch (error) {
    console.error('Error saving location:', error);
  }
};

const confirmDelete = (loc) => {
  locationToDelete.value = loc;
  showDeleteConfirm.value = true;
};

const handleDelete = async () => {
  if (locationToDelete.value) {
    await locationStore.deleteLocation(locationToDelete.value.id);
    showDeleteConfirm.value = false;
    locationToDelete.value = null;
  }
};
</script>

<template>
  <div class="location-view">
    <div class="view-header">
      <div class="header-info">
        <h2 class="title">
          <Building2 :size="28" class="title-icon" /> Gestión de Sedes
        </h2>
        <p class="subtitle">Administra el personal técnico del sistema.</p>
      </div>
      <div class="header-actions">
        <button class="btn-primary" @click="openAddModal">
          <Plus :size="18" /> Nueva Sede
        </button>
      </div>
    </div>

    <div class="view-controls glass-panel">
      <div class="search-wrap">
        <Search :size="18" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Buscar por nombre, código o ciudad..." />
      </div>
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-label">Total Sedes:</span>
          <span class="stat-value">{{ filteredLocations.length }}</span>
        </div>
      </div>
    </div>

    <div class="table-container glass-panel">
      <div v-if="locationStore.loading && filteredLocations.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando sedes...</p>
      </div>

      <div v-else-if="filteredLocations.length === 0" class="empty-state">
        <Building2 :size="48" class="empty-icon" />
        <p>No se encontraron sedes.</p>
      </div>

      <table v-else class="location-table">
        <thead>
          <tr>
            <th>Info Sede</th>
            <th>Ubicación</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="loc in filteredLocations" :key="loc.id">
            <td>
              <div class="loc-info">
                <div class="loc-avatar">{{ loc.codigo.substring(0, 2) }}</div>
                <div class="loc-details">
                  <span class="loc-name">{{ loc.nombre }}</span>
                  <span class="loc-code"><Tag :size="12" /> {{ loc.codigo }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="loc-geo">
                <span class="loc-addr"><MapPin :size="14" /> {{ loc.direccion }}</span>
                <span class="loc-city">{{ loc.ciudad }}, {{ loc.departamento }}</span>
              </div>
            </td>
            <td>
              <div class="loc-lead">
                <User :size="14" /> {{ loc.supervisor }}
              </div>
            </td>
            <td>
              <span class="status-badge" :class="loc.estado === 'activa' ? 'status-active' : 'status-inactive'">
                {{ loc.estado === 'activa' ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="text-right">
              <div class="action-buttons">
                <button class="btn-icon edit" title="Editar" @click="openEditModal(loc)">
                  <Edit :size="18" />
                </button>
                <button class="btn-icon delete" title="Eliminar" @click="confirmDelete(loc)">
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <LocationModal
      :show="showAddModal"
      :location="selectedLocation"
      :loading="locationStore.loading"
      @close="showAddModal = false"
      @save="handleSave"
    />

    <BaseModal
      :show="showDeleteConfirm"
      title="¿Eliminar Sede?"
      :subtitle="'Esta acción no se puede deshacer y la sede será removida del sistema.'"
      :icon="AlertTriangle"
      icon-class="text-red-500"
      max-width="450px"
      @close="showDeleteConfirm = false"
    >
      <div class="confirm-body">
        <p>¿Estás seguro de que deseas eliminar la sede <span class="loc-name-highlight">{{ locationToDelete?.nombre }}</span>?</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showDeleteConfirm = false">Cancelar</button>
        <button class="btn-danger" @click="handleDelete">Sí, Eliminar</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.location-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.title-icon {
  color: var(--brand-primary);
}

.subtitle {
  color: var(--text-muted);
}

.btn-primary {
  padding: 0.7rem 1.25rem;
  background: var(--brand-primary, #6366f1);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 450px;
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
  padding: 0.8rem 1rem 0.8rem 2.8rem;
  border-radius: 12px;
  background: var(--bg-input, #f8fafc);
  border: 1.5px solid var(--border-2);
  color: var(--text-main);
}

.stats-summary {
  display: flex;
  gap: 2rem;
}

.stat-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
}

.table-container {
  overflow: hidden;
}

.location-table {
  width: 100%;
  border-collapse: collapse;
}

.location-table th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1.5px solid var(--border-2);
}

.location-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-2);
}

.loc-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.loc-avatar {
  width: 40px;
  height: 40px;
  background: var(--nav-active-bg, #eef2ff);
  color: var(--brand-primary, #6366f1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
}

.loc-details {
  display: flex;
  flex-direction: column;
}

.loc-name {
  font-weight: 700;
  color: var(--text-main);
  display: block;
}

.loc-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.loc-geo {
  display: flex;
  flex-direction: column;
}

.loc-addr {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.loc-city {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-left: 1.3rem;
}

.loc-lead {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
}

.status-active {
  background: #d1fae5;
  color: #059669;
}

.status-inactive {
  background: #fee2e2;
  color: #dc2626;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border-2);
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon.edit:hover {
  background: var(--nav-active-bg);
  color: var(--brand-primary);
  border-color: var(--brand-primary);
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-2);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.confirm-body {
  padding: 1.5rem;
  color: var(--text-main);
}

.loc-name-highlight {
  font-weight: 800;
  color: #ef4444;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: #ef4444;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: var(--border-2);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
}
</style>
