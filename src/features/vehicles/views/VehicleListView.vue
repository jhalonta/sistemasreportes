<script setup>
import { onMounted, ref, computed } from 'vue';
import { useVehicleStore } from '../store/vehicleStore';
import { useLocationStore } from '../../locations/store/locationStore';
import { useAuthStore } from '../../auth/store/authStore';
import VehicleModal from '../components/VehicleModal.vue';
import BaseModal from '../../../components/BaseModal.vue';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Truck, 
  Tag, 
  Search, 
  AlertTriangle, 
  Building2,
  CircleCheck,
  XCircle,
  HelpCircle,
  Wrench
} from 'lucide-vue-next';

const vehicleStore = useVehicleStore();
const locationStore = useLocationStore();
const authStore = useAuthStore();

const showModal = ref(false);
const selectedVehicle = ref(null);
const searchQuery = ref('');
const selectedSede = ref(''); // Admin filter
const vehicleToDelete = ref(null);

onMounted(async () => {
  await vehicleStore.fetchVehicles();
  if (locationStore.locations.length === 0) {
    locationStore.fetchLocations();
  }
});

const filteredVehicles = computed(() => {
  const profile = authStore.userProfile;
  const query = searchQuery.value.toLowerCase();
  
  return vehicleStore.vehicles.filter(v => {
    // 1. Role-based filter
    if (profile?.role === 'sede') {
      if (v.sedeId !== profile.locationId) return false;
    } else if (profile?.role === 'admin' && selectedSede.value) {
      if (v.sedeId !== selectedSede.value) return false;
    }
    
    // 2. Search query filter
    const locName = locationStore.locations.find(l => l.id === v.sedeId)?.nombre || '';
    return v.placa.toLowerCase().includes(query) ||
           v.tipo.toLowerCase().includes(query) ||
           v.estado.toLowerCase().includes(query) ||
           locName.toLowerCase().includes(query);
  });
});

const openModal = (vehicle = null) => {
  selectedVehicle.value = vehicle;
  showModal.value = true;
};

const handleSave = async (data) => {
  try {
    const profile = authStore.userProfile;
    if (profile?.role === 'sede') {
      data.sedeId = profile.locationId;
    }
    
    if (selectedVehicle.value) {
      await vehicleStore.updateVehicle(selectedVehicle.value.id, data);
    } else {
      await vehicleStore.addVehicle(data);
    }
    showModal.value = false;
  } catch (err) {
    console.error(err);
  }
};

const confirmDelete = (vehicle) => {
  vehicleToDelete.value = vehicle;
};

const handleDelete = async () => {
  if (vehicleToDelete.value) {
    await vehicleStore.deleteVehicle(vehicleToDelete.value.id);
    vehicleToDelete.value = null;
  }
};

const getStateIcon = (state) => {
  switch (state) {
    case 'disponible': return { icon: CircleCheck, class: 'state-available', label: 'Disponible' };
    case 'mantenimiento': return { icon: Wrench, class: 'state-maintenance', label: 'Mantenimiento' };
    case 'asignado': return { icon: Truck, class: 'state-assigned', label: 'Asignado' };
    case 'inactivo': return { icon: XCircle, class: 'state-inactive', label: 'Inactivo' };
    default: return { icon: HelpCircle, class: 'state-unknown', label: 'Desconocido' };
  }
};
</script>

<template>
  <div class="vehicle-view">
    <div class="view-header">
      <div class="header-info">
        <h2 class="title"><Truck :size="28" class="title-icon" /> Gestión de Vehículos</h2>
        <p class="subtitle">
          {{ authStore.userProfile?.role === 'sede' ? 'Control de unidades de transporte de tu sede.' : 'Administra la flota de vehículos corporativos.' }}
        </p>
      </div>
      <button class="btn-add" @click="openModal()">
        <Plus :size="18" /> Nuevo Vehículo
      </button>
    </div>

    <!-- Controls -->
    <div class="view-controls glass-panel">
      <div class="search-wrap">
        <Search :size="18" class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar vehículo por placa, tipo o sede..."
        />
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
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">{{ filteredVehicles.length }}</span>
        </div>
        <div class="stat-item available">
          <span class="stat-label">Disponibles:</span>
          <span class="stat-value">{{ filteredVehicles.filter(v => v.estado === 'disponible').length }}</span>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="table-container glass-panel">
      <div v-if="vehicleStore.loading && vehicleStore.vehicles.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando flota...</p>
      </div>

      <div v-else-if="filteredVehicles.length === 0" class="empty-state">
        <AlertTriangle :size="48" class="empty-icon" />
        <p>No se encontraron vehículos.</p>
      </div>

      <table v-else class="vehicle-table">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Placa / Serial</th>
            <th>Sede</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in filteredVehicles" :key="v.id">
            <td>
              <div class="unit-info">
                <div class="unit-type-icon" :class="getStateIcon(v.estado).class">
                  <Truck :size="20" />
                </div>
                <div class="unit-details">
                  <span class="unit-name">{{ v.tipo }}</span>
                  <span class="unit-meta">ID: {{ v.id.substring(0, 8) }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="placa-badge">{{ v.placa }}</span>
            </td>
            <td>
              <div class="loc-cell">
                <Building2 :size="14" />
                <span>{{ locationStore.locations.find(l => l.id === v.sedeId)?.nombre || 'Sede no encontrada' }}</span>
              </div>
            </td>
            <td>
              <div class="status-cell" :class="getStateIcon(v.estado).class">
                <component :is="getStateIcon(v.estado).icon" :size="16" />
                <span>{{ getStateIcon(v.estado).label }}</span>
              </div>
            </td>
            <td class="text-right">
              <div class="action-buttons">
                <button class="btn-icon-action edit" @click="openModal(v)" title="Editar">
                  <Pencil :size="18" />
                </button>
                <button class="btn-icon-action delete" @click="confirmDelete(v)" title="Eliminar">
                  <Trash2 :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modals -->
    <VehicleModal 
      :show="showModal" 
      :vehicle="selectedVehicle" 
      @close="showModal = false; selectedVehicle = null"
      @save="handleSave"
    />

    <BaseModal
      :show="!!vehicleToDelete"
      title="¿Eliminar Vehículo?"
      subtitle="Esta acción no se puede deshacer y retirará la unidad del sistema."
      :icon="AlertTriangle"
      max-width="450px"
      @close="vehicleToDelete = null"
    >
      <div class="confirm-body">
        <p v-if="vehicleToDelete">¿Confirmas que deseas eliminar el vehículo <span class="highlight">{{ vehicleToDelete.placa }}</span>?</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="vehicleToDelete = null">Cancelar</button>
        <button class="btn-danger" @click="handleDelete">Sí, Eliminar</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.vehicle-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.title-icon { color: #6366f1; -webkit-text-fill-color: initial; }
.subtitle { color: var(--text-muted); margin: 0.25rem 0 0 0; }

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.3);
}

.view-controls {
  padding: 1.25rem 1.75rem;
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
  max-width: 250px;
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
  padding: 0.65rem 1rem 0.65rem 2.5rem;
  border-radius: 12px;
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
  flex: 1;
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
  padding: 0.75rem 1rem 0.75rem 2.8rem;
  border-radius: 12px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.95rem;
}

.stats-summary { display: flex; gap: 1.5rem; }
.stat-item { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.9rem; }
.stat-value { color: var(--brand-primary); font-size: 1.25rem; font-weight: 800; }
.stat-item.available .stat-value { color: #10b981; }

.table-container { min-height: 400px; padding: 0; overflow: hidden; }
.vehicle-table { width: 100%; border-collapse: collapse; }
.vehicle-table th {
  text-align: left;
  padding: 1.25rem 1.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-2);
  letter-spacing: 0.05em;
}

.vehicle-table td { padding: 1.1rem 1.5rem; border-bottom: 1px solid var(--border-2); }
.vehicle-table tr:last-child td { border-bottom: none; }
.vehicle-table tr:hover { background: rgba(0,0,0,0.02); }

.unit-info { display: flex; align-items: center; gap: 1rem; }
.unit-type-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.unit-type-icon.state-available { background: #d1fae5; color: #10b981; }
.unit-type-icon.state-maintenance { background: #fef3c7; color: #d97706; }
.unit-type-icon.state-assigned { background: #e0f2fe; color: #0369a1; }
.unit-type-icon.state-inactive { background: #fee2e2; color: #ef4444; }

.unit-details { display: flex; flex-direction: column; }
.unit-name { font-weight: 700; color: var(--text-main); font-size: 1rem; text-transform: capitalize; }
.unit-meta { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }

.placa-badge {
  display: inline-block;
  padding: 0.4rem 0.75rem;
  background: #f1f5f9;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 800;
  color: #334155;
  font-family: monospace;
  font-size: 1.1rem;
}

.loc-cell { display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-size: 0.95rem; font-weight: 600; }

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-cell.state-available { background: #d1fae5; color: #10b981; }
.status-cell.state-maintenance { background: #fef3c7; color: #d97706; }
.status-cell.state-assigned { background: #e0f2fe; color: #0369a1; }
.status-cell.state-inactive { background: #fee2e2; color: #ef4444; }

.action-buttons { display: flex; justify-content: flex-end; gap: 0.5rem; }
.btn-icon-action {
  width: 38px; height: 38px; border-radius: 10px; border: 1.5px solid var(--border-2);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; background: white;
}
.btn-icon-action:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.btn-icon-action.edit { color: var(--brand-primary); }
.btn-icon-action.edit:hover { background: #eef2ff; border-color: #6366f1; }
.btn-icon-action.delete { color: #ef4444; }
.btn-icon-action.delete:hover { background: #fef2f2; border-color: #ef4444; }

.highlight { font-weight: 800; color: #1e293b; }

.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem; gap: 1rem; }
.spinner { width: 40px; height: 40px; border: 4px solid var(--border-2); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
