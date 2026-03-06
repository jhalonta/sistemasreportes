<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { AlertTriangle, X, Pencil, Trash2, Check, PenLine, Plus, Users, ClipboardList, Save, Building2, Truck } from 'lucide-vue-next';
import { rates } from '../data/rates';
import { useAttendanceStore } from '../features/attendance/store/attendanceStore';
import { useTechnicianStore } from '../features/technicians/store/technicianStore';
import { useActivityStore } from '../features/activities/store/activityStore';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { useAuthStore } from '../features/auth/store/authStore';
import { useLocationStore } from '../features/locations/store/locationStore';
import { useVehicleStore } from '../features/vehicles/store/vehicleStore';
import { storeToRefs } from 'pinia';;

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const { showNotification } = useNotifications();
const attendanceStore = useAttendanceStore();
const techStore = useTechnicianStore();
const activityStore = useActivityStore();
const authStore = useAuthStore();
const vehicleStore = useVehicleStore();
const locationStore = useLocationStore();

const selectedSede = ref(''); // Admin filter

onMounted(async () => {
  await Promise.all([
    techStore.fetchTechnicians(),
    attendanceStore.fetchAttendance(),
    activityStore.fetchActivities(),
    vehicleStore.fetchVehicles(),
    locationStore.fetchLocations()
  ]);
});

watch(selectedDate, async (newDate) => {
  if (newDate) {
    await attendanceStore.fetchAttendance(newDate);
  }
});

// Helper for safe ID generation
const generateId = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Math.random().toString(36).substring(2, 15);
    }
};

const isToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate.value === today;
});

// Form State
const selectedMainTech = ref('');
const selectedPartnerTech = ref('');
const selectedVehicle = ref('');
const showMainModal = ref(false);
const activityRows = ref([
  { id: generateId(), rateCode: '', assigned: 0, completed: 0, observations: '' }
]);

// Editing State
const editingId = ref(null);
const editForm = ref({ assigned: 0, completed: 0, observations: '' });
const showDeleteModal = ref(false);
const itemToDeleteId = ref(null);

// Status Modals State
const showPartialModal = ref(false);
const showCancelModal = ref(false);
const currentStatusGroup = ref(null);
const partialItems = ref([]);
const cancelReason = ref('');
const statusLoading = ref(false);
const isAddingToExisting = ref(false);
const currentStatusItem = ref(null);

// Helpers
const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const formatDate = (isoString) => {
  return new Date(isoString).toLocaleString('es-PE');
};

const getRateInfo = (code) => {
  if (!rates) return null;
  return rates.find(r => r.code === code);
};

// Computed Properties
const groupedRates = computed(() => {
  if (!rates) return {};
  return rates.reduce((acc, rate) => {
    const category = rate.category || 'Otros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(rate);
    return acc;
  }, {});
});

const totalProjected = computed(() => {
  return activityRows.value.reduce((sum, row) => {
    const rate = getRateInfo(row.rateCode);
    if (!rate || !row.assigned) return sum;
    return sum + (rate.price * row.assigned);
  }, 0).toFixed(2);
});

const totalRealized = computed(() => {
  return activityRows.value.reduce((sum, row) => {
    const rate = getRateInfo(row.rateCode);
    if (!rate || !row.completed) return sum;
    return sum + (rate.price * row.completed);
  }, 0).toFixed(2);
});

const excludedRoles = ['Analista Informatico', 'Asistente Administrativo'];
const operationalPersonnel = computed(() => {
  const profile = authStore.userProfile;
  
  return techStore.technicians.filter(p => {
    // 1. Exclude non-operational roles
    if (excludedRoles.includes(p.role)) return false;
    
    // 2. Must be active
    if (!p.active) return false;
    
    // 3. Role-based filter
    if (profile?.role === 'sede') {
      // Sede only sees their own
      if (p.locationId !== profile.locationId) return false;
    } else if (profile?.role === 'admin' && selectedSede.value) {
      // Admin filter by sede if selected
      if (p.locationId !== selectedSede.value) return false;
    }
    
    // 4. User request: Don't show absent technicians in activity selection
    const attendanceRecord = attendanceStore.records[p.id];
    if (attendanceRecord && attendanceRecord.status === 'absent') return false;
    
    return true;
  });
});

const busyTechIds = computed(() => {
  const targetDate = selectedDate.value;
  const targetActivities = activityStore.activities.filter(a => a.timestamp.startsWith(targetDate));
  
  const ids = new Set();
  targetActivities.forEach(a => {
    if (a.mainTechId) ids.add(a.mainTechId);
    if (a.partnerTechId) ids.add(a.partnerTechId);
  });
  return ids;
});

const availableLeadTechs = computed(() => {
  // We MUST always include the currently selected tech IDs to avoid the selector stripping them
  // due to race conditions or "busy" status filtering.
  return operationalPersonnel.value.filter(p => {
    const isBusy = busyTechIds.value.has(p.id);
    const isMain = p.id === selectedMainTech.value;
    const isPartner = p.id === selectedPartnerTech.value;
    
    // Show if NOT busy OR if it's one of the currently selected ones
    if (!isBusy || isMain || isPartner) {
        // However, if we are looking for Lead, don't show the one already selected as Partner
        if (selectedPartnerTech.value && p.id === selectedPartnerTech.value) return false;
        return true;
    }
    return false;
  });
});

const availablePartners = computed(() => {
  if (!selectedMainTech.value) return [];
  
  return operationalPersonnel.value.filter(p => {
    const isBusy = busyTechIds.value.has(p.id);
    const isPartner = p.id === selectedPartnerTech.value;
    const isMain = p.id === selectedMainTech.value;

    if (!isBusy || isPartner || isMain) {
        // Can't be the same person as Main
        if (p.id === selectedMainTech.value) return false;
        return true;
    }
    return false;
  });
});

const pendingPersonnel = computed(() => {
  return operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
});

const availableVehicles = computed(() => {
  const profile = authStore.userProfile;
  return vehicleStore.vehicles.filter(v => {
    // 1. Must be available
    if (v.estado !== 'disponible') return false;
    // 2. Sede-based filter
    if (profile?.role === 'sede') {
      if (v.sedeId !== profile.locationId) return false;
    } else if (profile?.role === 'admin' && selectedSede.value) {
      if (v.sedeId !== selectedSede.value) return false;
    }
    return true;
  });
});

const groupedActivities = computed(() => {
    const groups = [];
    const map = new Map();
    
    const targetDate = selectedDate.value;
    const filtered = activityStore.activities.filter(a => a.timestamp.startsWith(targetDate));

    filtered.forEach(act => {
        const key = `${act.mainTechId}|${act.partnerTechId}`;
        
        if (!map.has(key)) {
            const group = {
                id: key, 
                timestamp: act.timestamp,
                mainTechId: act.mainTechId,
                mainTechName: act.mainTechName,
                partnerTechId: act.partnerTechId,
                partnerTechName: act.partnerTechName,
                vehicleId: act.vehicleId || null,
                vehiclePlaca: act.vehiclePlaca || null,
                items: []
            };
            map.set(key, group);
            groups.push(group);
        }
        map.get(key).items.push(act);
    });

    // Compute aggregate status for the group
    groups.forEach(group => {
        const allCompletada = group.items.every(i => i.status === 'completada');
        const allCancelled = group.items.every(i => i.status === 'cancelada');
        const anyInProcess = group.items.some(i => i.status === 'en_proceso');
        
        if (anyInProcess) group.status = 'en_proceso';
        else if (allCompletada) group.status = 'completada';
        else if (allCancelled) group.status = 'cancelada';
        else group.status = 'parcial';
    });

    return groups;
});

// Actions
const openMainModal = () => {
    resetForm();
    isAddingToExisting.value = false;
    showMainModal.value = true;
};

const closeMainModal = () => {
    isAddingToExisting.value = false;
    showMainModal.value = false;
};

const addActivityToGroup = async (group) => {
    try {
        const isSameTeam = selectedMainTech.value === group.mainTechId && 
                          selectedPartnerTech.value === (group.partnerTechId || '');

        if (isSameTeam) {
            // Check if we have an empty row already to reuse it
            const hasEmptyRow = activityRows.value.length === 1 && !activityRows.value[0].rateCode;
            if (!hasEmptyRow) {
                addRow();
            }
        } else {
            // New team selection
            selectedMainTech.value = group.mainTechId || '';
            selectedPartnerTech.value = group.partnerTechId || '';
            selectedVehicle.value = group.vehicleId || '';
            
            // Only reset to 1 clean row if necessary
            activityRows.value = [{ 
              id: generateId(), 
              rateCode: '', 
              assigned: 0, 
              completed: 0,
              observations: ''
            }];
        }

        isAddingToExisting.value = true;
        showMainModal.value = true;
        await nextTick();
    } catch (e) {
        console.error("Error in addActivityToGroup:", e);
        showNotification("Error al cargar técnicos", "error");
    }
};

const addRow = () => {
  activityRows.value.push({ 
    id: generateId(), 
    rateCode: '', 
    assigned: 0, 
    completed: 0,
    observations: ''
  });
};

const removeRow = (index) => {
  if (activityRows.value.length > 1) {
    activityRows.value.splice(index, 1);
  }
};

const startEditing = (activity) => {
    editingId.value = activity.id;
    editForm.value = {
        rateCode: activity.rateCode,
        assigned: activity.assigned,
        completed: activity.completed,
        observations: activity.observations || ''
    };
};

const cancelEditing = () => {
    editingId.value = null;
};

const saveEdit = async (activity) => {
    const rate = getRateInfo(editForm.value.rateCode); 
    if (!rate) return;

    const assigned = Number(editForm.value.assigned);
    const completed = Number(editForm.value.completed);

    const newProjected = (rate.price * assigned).toFixed(2);
    const newRealized = (rate.price * completed).toFixed(2);

    await activityStore.updateActivity(activity.id, {
        rateCode: rate.code,
        description: `${rate.code} - ${rate.name}`,
        assigned: assigned,
        completed: completed,
        projectedValue: newProjected,
        realizedValue: newRealized,
        totalValue: newRealized,
        observations: editForm.value.observations
    });
    
    editingId.value = null;
    showNotification('Actividad actualizada', 'success');
};

const requestDelete = (id) => {
    itemToDeleteId.value = id;
    showDeleteModal.value = true;
};

const confirmDelete = async () => {
    if (itemToDeleteId.value) {
        // Find the group before deleting
        const activity = activityStore.activities.find(a => a.id === itemToDeleteId.value);
        const groupKey = activity ? `${activity.mainTechId}-${activity.timestamp}` : null;
        
        await activityStore.deleteActivity(itemToDeleteId.value);
        
        // After deletion, check if the group is now complete (to release vehicle)
        if (groupKey) {
            await nextTick(); // Wait for groupedActivities computed to update
            const group = groupedActivities.value.find(g => `${g.mainTechId}-${g.timestamp}` === groupKey);
            if (group) await checkGroupCompletion(group);
        }
        
        showNotification('Registro eliminado', 'info');
    }
    closeDeleteModal();
};

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    itemToDeleteId.value = null;
};

const handleSubmit = async () => {
  if (!selectedMainTech.value) {
    showNotification('Seleccione un técnico principal.', 'error');
    return;
  }
  
  const validRows = activityRows.value.filter(r => r.rateCode && (r.assigned > 0 || r.completed > 0));
  if (validRows.length === 0) {
    showNotification('Registre al menos una actividad con cantidades.', 'error');
    return;
  }

  const mainTech = techStore.technicians.find(p => p.id === selectedMainTech.value);
  const partnerTech = selectedPartnerTech.value 
    ? techStore.technicians.find(p => p.id === selectedPartnerTech.value) 
    : null;
  const vehicle = selectedVehicle.value 
    ? vehicleStore.vehicles.find(v => v.id === selectedVehicle.value)
    : null;

  let savedCount = 0;
  const entryTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const timestamp = `${selectedDate.value}T${entryTime}`;
  
  for (const row of validRows) {
    const rate = getRateInfo(row.rateCode);
    const description = `${rate.code} - ${rate.name}`;
    const rowProjected = (rate.price * row.assigned).toFixed(2);
    const rowRealized = (rate.price * row.completed).toFixed(2);

    await activityStore.addActivity({
      mainTechId: mainTech.id,
      mainTechName: mainTech.fullName,
      partnerTechId: partnerTech?.id || null,
      partnerTechName: partnerTech?.fullName || null,
      vehicleId: vehicle?.id || null,
      vehiclePlaca: vehicle?.placa || null,
      description: description,
      assigned: row.assigned,
      completed: row.completed,
      rateCode: rate.code,
      unitPrice: rate.price,
      projectedValue: rowProjected,
      realizedValue: rowRealized,
      observations: row.observations || '',
      timestamp: timestamp,
      status: 'en_proceso'
    });
    savedCount++;
  }

  // Update vehicle status
  if (vehicle) {
    await vehicleStore.updateVehicle(vehicle.id, { estado: 'asignado' });
  }

  selectedMainTech.value = '';
  selectedPartnerTech.value = '';
  selectedVehicle.value = '';
  activityRows.value = [{ id: generateId(), rateCode: '', assigned: 0, completed: 0, observations: '' }];
  showMainModal.value = false;
  
  showNotification(`${savedCount} actividades registradas (${selectedDate.value})`, 'success');
  scrollToTop();
};

const handleReleaseVehicle = async (group) => {
  if (!group.vehicleId) return;
  try {
    await vehicleStore.updateVehicle(group.vehicleId, { estado: 'disponible' });
    showNotification('Vehículo liberado', 'success');
  } catch (err) {
    showNotification('Error al liberar vehículo', 'error');
  }
};

const checkGroupCompletion = async (group) => {
  if (!group || !group.vehicleId) return;
  
  // Wait for computed property to re-evaluate items
  await nextTick();
  
  // Find the fresh group data
  const freshGroup = groupedActivities.value.find(g => g.mainTechId === group.mainTechId && g.timestamp === group.timestamp);
  if (!freshGroup) return;

  const allClosed = freshGroup.items.every(i => ['completada', 'parcial', 'cancelada'].includes(i.status));
  if (allClosed) {
    await vehicleStore.updateVehicle(group.vehicleId, { estado: 'disponible' });
  } else {
    // If at least one is "en_proceso", vehicle must be "asignado"
    await vehicleStore.updateVehicle(group.vehicleId, { estado: 'asignado' });
  }
};

const handleUpdateStatus = async (item, group, newStatus) => {
  currentStatusGroup.value = group;
  currentStatusItem.value = item;
  
  if (newStatus === 'completada') {
    statusLoading.value = true;
    try {
      const rate = getRateInfo(item.rateCode);
      const val = (rate.price * item.assigned).toFixed(2);
      await activityStore.updateActivity(item.id, { 
        status: 'completada',
        completed: item.assigned,
        realizedValue: val,
        totalValue: val
      });
      await checkGroupCompletion(group);
      showNotification('Actividad completada', 'success');
    } finally {
      statusLoading.value = false;
    }
  } else if (newStatus === 'parcial') {
    partialItems.value = [{
      id: item.id,
      description: item.description,
      assigned: item.assigned,
      completed: item.completed || 0,
      rateCode: item.rateCode
    }];
    showPartialModal.value = true;
  } else if (newStatus === 'cancelada') {
    cancelReason.value = '';
    showCancelModal.value = true;
  } else if (newStatus === 'en_proceso') {
    await activityStore.updateActivity(item.id, { status: 'en_proceso' });
    await checkGroupCompletion(group);
    showNotification('Actividad reabierta', 'info');
  }
};

const confirmPartialStatus = async () => {
  statusLoading.value = true;
  try {
    const item = partialItems.value[0];
    const rate = getRateInfo(item.rateCode);
    const val = (rate.price * item.completed).toFixed(2);
    await activityStore.updateActivity(item.id, { 
      status: 'parcial',
      completed: Number(item.completed),
      realizedValue: val,
      totalValue: val
    });
    await checkGroupCompletion(currentStatusGroup.value);
    showPartialModal.value = false;
    showNotification('Avance parcial registrado', 'success');
  } finally {
    statusLoading.value = false;
  }
};

const confirmCancelStatus = async () => {
  if (!cancelReason.value.trim()) {
    showNotification('Por favor, ingrese un motivo.', 'error');
    return;
  }
  statusLoading.value = true;
  try {
    await activityStore.updateActivity(currentStatusItem.value.id, { 
      status: 'cancelada',
      observations: `CANCELADO: ${cancelReason.value.trim()}`
    });
    await checkGroupCompletion(currentStatusGroup.value);
    showCancelModal.value = false;
    showNotification('Actividad cancelada', 'info');
  } finally {
    statusLoading.value = false;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'en_proceso': return { label: 'En Proceso', class: 'status-process' };
    case 'completada': return { label: 'Completada', class: 'status-completed' };
    case 'parcial': return { label: 'Parcial', class: 'status-partial' };
    case 'cancelada': return { label: 'Cancelada', class: 'status-cancelled' };
    default: return { label: status, class: '' };
  }
};

const resetForm = () => {
  selectedMainTech.value = '';
  selectedPartnerTech.value = '';
  selectedVehicle.value = '';
  isAddingToExisting.value = false;
  activityRows.value = [{ id: generateId(), rateCode: '', assigned: 0, completed: 0, observations: '' }];
};
</script>

<template>
  <div class="activity-container">

    <!-- Page Header -->
    <div class="act-header">
      <div class="header-info">
        <h2 class="act-title">
          <PenLine :size="28" class="title-icon" /> Registro de Producción
        </h2>
        <p class="act-subtitle">Asigna actividades a los técnicos y registra su avance diario.</p>
      </div>
      <div class="header-controls">
        <div class="date-picker-wrap">
          <label for="act-date">Fecha</label>
          <input id="act-date" name="actDate" type="date" v-model="selectedDate" class="date-input" />
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

        <span class="mode-badge" v-if="!isToday">Modo Histórico</span>
        <button type="button" class="btn-assign" @click="openMainModal">
          <Plus :size="18" /> Asignar Trabajo
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div class="loading-state glass-panel" v-if="!rates || rates.length === 0">
      <p>Cargando datos de actividades...</p>
    </div>

    <template v-else>
      <!-- Pending Alert -->
      <div v-if="pendingPersonnel.length > 0" class="pending-alert">
        <AlertTriangle :size="20" />
        <span>Faltan reportar <strong>{{ pendingPersonnel.length }}</strong> técnicos</span>
      </div>

      <!-- MAIN REGISTRATION MODAL -->
      <Transition name="fade">
        <div v-show="showMainModal" class="modal-overlay main-form-modal" @click.self="closeMainModal">
          <div class="modal-content glass-panel">
            <div class="modal-header">
              <div class="header-title">
                <PenLine :size="24" class="title-icon" />
                <div>
                  <h3>Asignar Nueva Actividad</h3>
                  <p>Completa los pasos para registrar el trabajo.</p>
                </div>
              </div>
              <button type="button" class="btn-close-modal" @click="closeMainModal">
                <X :size="24" />
              </button>
            </div>

            <div class="modal-body">
              <div class="form-card">
                <form @submit.prevent="handleSubmit">

                  <!-- Step 1: Team Selection -->
                  <div class="form-step" v-if="!isAddingToExisting">
                    <div class="step-header">
                      <span class="step-number">1</span>
                      <div>
                        <h3 class="step-title">Equipo de Trabajo</h3>
                        <p class="step-desc">Selecciona al técnico principal y su pareja si corresponde.</p>
                      </div>
                    </div>
                    <div class="tech-grid">
                      <div class="form-group">
                        <label for="main-tech"><Users :size="14" /> Técnico Principal</label>
                        <div class="select-wrapper">
                          <select id="main-tech" name="mainTech" v-model="selectedMainTech" required>
                            <option disabled value="">Seleccionar Técnico</option>
                            <option v-for="p in availableLeadTechs" :key="p.id" :value="p.id">
                              {{ p.fullName }} ({{ p.role }})
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group">
                        <label for="partner-tech"><Users :size="14" /> Pareja (Opcional)</label>
                        <div class="select-wrapper">
                          <select id="partner-tech" name="partnerTech" v-model="selectedPartnerTech">
                            <option value="">Sin pareja</option>
                             <option v-for="p in availablePartners" :key="p.id" :value="p.id">
                               {{ p.fullName }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group">
                        <label for="vehicle-select"><Truck :size="14" /> Vehículo Asignado</label>
                        <div class="select-wrapper">
                          <select id="vehicle-select" v-model="selectedVehicle" required>
                            <option disabled value="">Seleccionar Vehículo</option>
                            <option v-for="v in availableVehicles" :key="v.id" :value="v.id">
                              {{ v.placa }} - {{ v.tipo }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Summary for Existing Group -->
                  <div class="form-step existing-summary-step" v-else>
                    <div class="existing-team-info glass-panel-sm">
                      <div class="team-avatars">
                        <Users :size="24" class="team-icon" />
                      </div>
                      <div class="team-details">
                        <p class="team-label">Agregando a equipo existente</p>
                        <p class="team-names">
                          <strong>{{ techStore.technicians.find(t => t.id === selectedMainTech)?.fullName }}</strong>
                          <span v-if="selectedPartnerTech"> + {{ techStore.technicians.find(t => t.id === selectedPartnerTech)?.fullName }}</span>
                        </p>
                        <p class="team-vehicle" v-if="selectedVehicle">
                          <Truck :size="14" /> {{ vehicleStore.vehicles.find(v => v.id === selectedVehicle)?.placa }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div class="form-divider"></div>

                  <!-- Step 2: Activities -->
                  <div class="form-step">
                    <div class="step-header">
                      <span class="step-number">2</span>
                      <div>
                        <h3 class="step-title">Actividades Realizadas</h3>
                        <p class="step-desc">Agrega las partidas trabajadas con sus cantidades.</p>
                      </div>
                    </div>

                    <div class="rows-container">
                      <div v-for="(row, index) in activityRows" :key="row.id" class="activity-row">
                        <div class="row-top">
                          <span class="row-number">Actividad {{ index + 1 }}</span>
                          <button type="button" class="btn-icon-sm remove" @click="removeRow(index)" v-if="activityRows.length > 1" title="Eliminar">
                            <X :size="16" />
                          </button>
                        </div>
                        <div class="row-body">
                          <div class="form-group full-width">
                            <label v-if="index === 0" :for="'rateCode-' + index">Tipo de Actividad (Partida)</label>
                            <div class="select-wrapper">
                              <select :id="'rateCode-' + index" :name="'rateCode-' + index" v-model="row.rateCode" required>
                                <option disabled value="">Seleccionar Actividad</option>
                                <optgroup v-for="(group, category) in groupedRates" :key="category" :label="category">
                                  <option v-for="rate in group" :key="rate.code" :value="rate.code">
                                    {{ rate.code }} - {{ rate.name }} (S/ {{ rate.price.toFixed(2) }})
                                  </option>
                                </optgroup>
                              </select>
                            </div>
                          </div>
                          <div class="qty-grid">
                            <div class="form-group">
                              <label v-if="index === 0" :for="'assigned-' + index">Asignada</label>
                              <input :id="'assigned-' + index" :name="'assigned-' + index" type="number" v-model="row.assigned" min="0" placeholder="0" />
                              <div class="mini-calc" v-if="row.rateCode">Asig: S/ {{ (getRateInfo(row.rateCode)?.price * row.assigned).toFixed(2) }}</div>
                            </div>
                            <div class="form-group">
                              <label v-if="index === 0" :for="'completed-' + index">Realizada</label>
                              <input :id="'completed-' + index" :name="'completed-' + index" type="number" v-model="row.completed" min="0" placeholder="0" />
                              <div class="mini-calc highlight" v-if="row.rateCode">Real: S/ {{ (getRateInfo(row.rateCode)?.price * row.completed).toFixed(2) }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button type="button" class="btn-add-row" @click="addRow">
                      <Plus :size="18" /> Agregar otra actividad
                    </button>
                  </div>

                  <div class="form-divider"></div>

                  <!-- Step 3: Totals & Submit -->
                  <div class="form-step">
                    <div class="step-header">
                      <span class="step-number">3</span>
                      <div>
                        <h3 class="step-title">Resumen y Registro</h3>
                        <p class="step-desc">Verifica los totales y confirma el registro.</p>
                      </div>
                    </div>

                    <div class="totals-row" v-if="totalProjected > 0 || totalRealized > 0">
                      <div class="total-card">
                        <span class="total-label">Proyección Total</span>
                        <span class="total-value">S/ {{ totalProjected }}</span>
                      </div>
                      <div class="total-card real">
                        <span class="total-label">Total Realizado</span>
                        <span class="total-value">S/ {{ totalRealized }}</span>
                      </div>
                    </div>

                    <button type="submit" class="btn-submit">
                      <Save :size="20" /> Registrar Toda la Producción
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- HISTORY SECTION -->
      <div class="history-section glass-panel">
        <h3 class="history-title">
          <ClipboardList :size="22" /> Producción Reciente
        </h3>
        <div v-if="groupedActivities.length === 0" class="empty-state">
          No hay registros para esta fecha.
        </div>
        <ul v-else class="history-list">
          <li v-for="group in groupedActivities" :key="group.id" class="group-card">
            <div class="group-header">
              <div class="tech-info">
                <span class="tech-tag main">{{ group.mainTechName }}</span>
                <span v-if="group.partnerTechName" class="tech-tag partner">+ {{ group.partnerTechName }}</span>
                <span v-if="group.vehiclePlaca" class="tech-tag vehicle">
                  <Truck :size="14" /> {{ group.vehiclePlaca }}
                </span>
                <span class="status-badge-main" :class="getStatusBadge(group.status).class">
                  {{ getStatusBadge(group.status).label }}
                </span>
              </div>
              <div class="group-meta">
                <span class="time-badge">{{ formatDate(group.timestamp) }}</span>
                <button type="button" class="btn-group-add" @click="addActivityToGroup(group)" title="Agregar actividad a este grupo">
                  <Plus :size="14" /> Agregar
                </button>
              </div>
            </div>

            <div class="group-body">
              <div v-for="activity in group.items" :key="activity.id" class="activity-line">

                <!-- Standard View -->
                <div v-if="editingId !== activity.id" class="activity-content">
                  <div class="activity-info">
                    <div class="title-status-row">
                      <p class="description">{{ activity.description }}</p>
                      <span class="item-status-pill" :class="getStatusBadge(activity.status).class">{{ getStatusBadge(activity.status).label }}</span>
                    </div>
                    <p v-if="activity.observations" class="observations-text"><em>Obs: {{ activity.observations }}</em></p>
                    <div class="stats-mini">
                      <span class="stat-pill">Asignada: <strong>{{ activity.assigned }}</strong> <small class="text-muted">S/ {{ activity.projectedValue || '0.00' }}</small></span>
                      <span class="stat-pill" :class="activity.completed >= activity.assigned ? 'stat-success' : 'stat-fail'">
                        Realizada: <strong>{{ activity.completed }}</strong> <small>S/ {{ activity.realizedValue || activity.totalValue || '0.00' }}</small>
                      </span>
                    </div>
                  </div>
                  <div class="line-actions">
                    <!-- Status Actions for the Line -->
                    <div class="status-actions">
                      <button v-if="activity.status === 'en_proceso'" @click="handleUpdateStatus(activity, group, 'completada')" class="btn-status-action complete" title="Completar">
                        <Check :size="14" />
                      </button>
                      <button v-if="activity.status === 'en_proceso'" @click="handleUpdateStatus(activity, group, 'parcial')" class="btn-status-action partial" title="Cierre Parcial">
                        <AlertTriangle :size="14" />
                      </button>
                      <button v-if="['completada', 'parcial', 'cancelada'].includes(activity.status)" @click="handleUpdateStatus(activity, group, 'en_proceso')" class="btn-status-action reset" title="Reabrir">
                        <PenLine :size="14" />
                      </button>
                      <button v-if="activity.status === 'en_proceso'" @click="handleUpdateStatus(activity, group, 'cancelada')" class="btn-status-action cancel" title="Cancelar">
                        <X :size="14" />
                      </button>
                    </div>

                    <div class="divider-v"></div>

                    <button @click="startEditing(activity)" class="btn-icon-action edit" title="Editar"><Pencil :size="16" /></button>
                    <button @click="requestDelete(activity.id)" class="btn-icon-action delete" title="Eliminar"><Trash2 :size="16" /></button>
                  </div>
                </div>

                <!-- Edit Mode -->
                <div v-else class="edit-mode">
                  <div class="edit-fields">
                    <div class="form-group full-width">
                      <label :for="'edit-rate-' + activity.id">Partida</label>
                      <select :id="'edit-rate-' + activity.id" :name="'edit-rate-' + activity.id" v-model="editForm.rateCode" required class="edit-select">
                        <optgroup v-for="(grp, category) in groupedRates" :key="category" :label="category">
                          <option v-for="rate in grp" :key="rate.code" :value="rate.code">
                            {{ rate.code }} - {{ rate.name }} (S/ {{ rate.price.toFixed(2) }})
                          </option>
                        </optgroup>
                      </select>
                    </div>
                    <div class="edit-qty-row">
                      <div class="form-group">
                        <label :for="'edit-assigned-' + activity.id">Cant. Asignada</label>
                        <input :id="'edit-assigned-' + activity.id" :name="'edit-assigned-' + activity.id" type="number" v-model="editForm.assigned" min="0">
                      </div>
                      <div class="form-group info-only">
                        <label>Cant. Realizada</label>
                        <div class="readonly-val">{{ activity.completed }}</div>
                      </div>
                    </div>
                    <div class="form-group full-width">
                      <label :for="'edit-obs-' + activity.id">Observaciones</label>
                      <input :id="'edit-obs-' + activity.id" :name="'edit-obs-' + activity.id" type="text" v-model="editForm.observations" placeholder="Opcional">
                    </div>
                  </div>
                  <div class="edit-actions">
                    <button @click="cancelEditing" class="btn-sm cancel"><X :size="16" /></button>
                    <button @click="saveEdit(activity)" class="btn-sm save"><Check :size="16" /></button>
                  </div>
                </div>

              </div>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>

  <!-- Delete Modal -->
  <Transition name="fade">
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
      <div class="modal-card">
        <div class="modal-icon"><AlertTriangle :size="48" stroke-width="1.5" /></div>
        <h3>¿Eliminar registro?</h3>
        <p>Esta acción no se puede deshacer.</p>
        <div class="modal-actions">
          <button class="btn-modal secondary" @click="closeDeleteModal">Cancelar</button>
          <button class="btn-modal danger" @click="confirmDelete">Sí, Eliminar</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Partial Closure Modal -->
  <Transition name="fade">
    <div v-if="showPartialModal" class="modal-overlay" @click.self="showPartialModal = false">
      <div class="modal-card compact-status">
        <div class="modal-header-compact">
          <AlertTriangle :size="20" class="icon-warning" />
          <h3>Cierre Parcial</h3>
        </div>
        <p class="modal-desc">Ingrese el avance real para cada actividad.</p>
        
        <div class="partial-list">
          <div v-for="item in partialItems" :key="item.id" class="partial-input-row">
            <span class="p-desc">{{ item.description }}</span>
            <div class="p-inputs">
              <span class="p-meta">Meta: {{ item.assigned }}</span>
              <input type="number" v-model="item.completed" placeholder="0" class="input-mini">
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-modal secondary" @click="showPartialModal = false">Cancelar</button>
          <button class="btn-modal primary" :disabled="statusLoading" @click="confirmPartialStatus">
            {{ statusLoading ? 'Guardando...' : 'Confirmar Cierre' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Cancel Modal -->
  <Transition name="fade">
    <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
      <div class="modal-card compact-status">
        <div class="modal-header-compact">
          <X :size="20" class="icon-danger" />
          <h3>Cancelar Trabajo</h3>
        </div>
        <div class="reason-form">
          <label>Motivo de cancelación</label>
          <textarea v-model="cancelReason" placeholder="Ej: Falla mecánica, lluvia, etc." rows="3"></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn-modal secondary" @click="showCancelModal = false">Volver</button>
          <button class="btn-modal danger" :disabled="statusLoading" @click="confirmCancelStatus">
            {{ statusLoading ? 'Procesando...' : 'Confirmar Cancelación' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* ── Layout ── */
.activity-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: var(--text-main);
}

/* ── Header ── */
.act-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-controls {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
}

.sede-filter-wrap {
  display: flex;
  align-items: center;
}

.filter-box {
  position: relative;
  width: 220px;
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
  padding: 0.6rem 1rem 0.6rem 2.25rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  font-size: 0.9rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.act-title {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.title-icon {
  color: #6366f1;
  -webkit-text-fill-color: initial;
}

.act-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-muted, #64748b);
}

.header-controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}

.btn-assign {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  padding: 0.65rem 1.4rem;
  border-radius: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
  margin-bottom: 2px;
}

.btn-assign:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
  filter: brightness(1.1);
}

.btn-assign:active {
  transform: translateY(0);
}

.date-picker-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.date-picker-wrap label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #64748b);
}

.date-input {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2, #cbd5e1);
  background: var(--bg-input, white);
  color: var(--text-main);
  font-size: 0.95rem;
  transition: all 0.2s;
}

.date-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.mode-badge {
  font-size: 0.75rem;
  background: #fef3c7;
  color: #d97706;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-weight: 700;
}

.close-badge {
  font-size: 0.75rem;
  background: #eff6ff;
  color: #3b82f6;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  font-weight: 700;
}

/* ── Glass Panel ── */
.glass-panel {
  background: var(--glass-bg, rgba(255,255,255,0.7));
  border-radius: 16px;
  box-shadow: var(--glass-shadow, 0 4px 20px rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
}

/* ── Pending Alert ── */
.pending-alert {
  background: var(--danger-bg, #fffbeb);
  color: var(--danger, #b45309);
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--border-2);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 0.85rem;
}

/* ── Form Card ── */
.form-card {
  padding: 1.25rem 1.5rem;
}

.form-step {
  margin-bottom: 0.5rem;
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.step-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
}

.step-desc {
  margin: 0.15rem 0 0 0;
  font-size: 0.85rem;
  color: var(--text-muted, #64748b);
}

.form-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, var(--border-2), transparent);
  margin: 1rem 0;
}

/* ── Tech Grid ── */
.tech-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

/* ── Form Groups ── */
.form-group label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted, #64748b);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

select, input[type="number"], input[type="text"] {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1.5px solid var(--border-2, #cbd5e1);
  border-radius: 10px;
  font-size: 0.95rem;
  background: var(--bg-input, white);
  transition: all 0.2s;
  color: var(--text-main, #1e293b);
}

select:focus, input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* ── Activity Rows ── */
.activity-row {
  background: var(--info-bg, #f8fafc);
  border: 1px solid var(--border-2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
}

.activity-row:hover {
  border-color: var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.row-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.row-number {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: #94a3b8;
}

.btn-icon-sm.remove {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-icon-sm.remove:hover {
  opacity: 1;
  transform: scale(1.1);
}

.row-body {
  display: grid;
  grid-template-columns: 2fr 1.5fr;
  gap: 1.5rem;
}

.qty-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.mini-calc {
  font-size: 0.75rem;
  text-align: right;
  margin-top: 0.35rem;
  font-weight: 600;
  color: #94a3b8;
}

.mini-calc.highlight {
  color: #10b981;
}

.btn-add-row {
  width: 100%;
  padding: 0.85rem;
  background: transparent;
  border: 2px dashed var(--border-2, #cbd5e1);
  color: var(--text-muted, #64748b);
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.btn-add-row:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

/* ── Totals ── */
.totals-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.total-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding: 1.25rem;
  background: var(--bg-card-2, #f8fafc);
  border-radius: 12px;
}

.total-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--text-muted, #64748b);
  font-weight: 700;
}

.total-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main, #334155);
}

.total-card.real .total-value {
  color: #10b981;
}

/* ── Submit ── */
.btn-submit {
  width: 100%;
  padding: 1.1rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.4);
}

/* ── History Section ── */
.history-section {
  padding: 2rem;
}

.history-title {
  margin: 0 0 1.5rem 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 2rem;
  font-style: italic;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-card {
  background: var(--bg-card, white);
  border: 1px solid var(--border-2, #f1f5f9);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.group-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
}

.group-header {
  background: var(--bg-card-2, #f8fafc);
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-2, #f1f5f9);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.tech-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tech-tag {
  font-size: 0.85rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
}

.tech-tag.main {
  background: rgba(37, 99, 235, 0.12);
  color: #3b82f6;
}

.tech-tag.partner {
  background: rgba(219, 39, 119, 0.12);
  color: #ec4899;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-badge {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.btn-group-add {
  background: transparent;
  border: 1px dashed #6366f1;
  color: #6366f1;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.btn-group-add:hover {
  background: rgba(99, 102, 241, 0.12);
  border-style: solid;
}

.group-body { padding: 0.25rem 0; }

.activity-line {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px dashed var(--border-2, #e2e8f0);
}

.activity-line:last-child { border-bottom: none; }

.activity-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.activity-info { flex: 1; }

.description {
  font-size: 0.92rem;
  margin: 0 0 0.3rem 0;
  color: var(--text-main, #334155);
  font-weight: 600;
}

.observations-text {
  font-size: 0.82rem;
  color: var(--text-muted, #64748b);
  margin: 0 0 0.4rem 0;
}

.stats-mini {
  display: flex;
  gap: 0.75rem;
  font-size: 0.82rem;
  flex-wrap: wrap;
}

.stat-pill {
  background: var(--info-bg);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  color: var(--text-muted);
}

.stat-pill.stat-success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.stat-pill.stat-fail {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

.text-muted { color: var(--text-muted); font-weight: normal; margin-left: 4px; }

.line-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon-action {
  border: none;
  background: var(--info-bg);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: var(--text-muted);
}

.btn-icon-action.edit:hover { background: rgba(99, 102, 241, 0.12); color: #6366f1; }
.btn-icon-action.delete:hover { background: var(--danger-bg); color: #ef4444; }

/* ── Edit Mode ── */
.edit-mode {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--info-bg);
  padding: 1rem;
  border-radius: 10px;
}

.edit-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.edit-select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}

.edit-qty-row {
  display: flex;
  gap: 1rem;
}

.edit-qty-row input {
  width: 100px;
  padding: 0.55rem 0.75rem;
  font-size: 0.9rem;
}

.edit-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.btn-sm {
  padding: 0.5rem;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-sm.save { background: linear-gradient(135deg, #10b981, #059669); color: white; }
.btn-sm.save:hover { transform: translateY(-1px); }
.btn-sm.cancel { background: var(--border-2); color: var(--text-muted); }
.btn-sm.cancel:hover { background: var(--border); }

/* ── Modal & Overlay ── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.main-form-modal {
  padding: 1.5rem;
}

.modal-content {
  width: 100%;
  max-width: 780px;
  max-height: 88vh;
  overflow-y: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--modal-bg);
  border: 1px solid var(--border-2);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: modal-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: var(--modal-bg);
  backdrop-filter: blur(10px);
  z-index: 10;
  border-radius: 20px 20px 0 0;
}

.modal-body {
  overflow-y: auto;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-content .title-icon {
  color: #6366f1;
  background: rgba(99, 102, 241, 0.12);
  padding: 0.4rem;
  border-radius: 10px;
  -webkit-text-fill-color: initial;
}

.header-title h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-main);
}

.header-title p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-modal:hover {
  background: var(--info-bg);
  color: #ef4444;
}

@keyframes modal-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-card {
  background: var(--modal-bg);
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--border-2);
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-icon {
  background: var(--danger-bg);
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 1.25rem auto;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-main);
  font-size: 1.3rem;
}

.modal-card p {
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-modal {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-modal.secondary { background: var(--info-bg); color: var(--text-muted); }
.btn-modal.secondary:hover { background: var(--border-2); }
.btn-modal.danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; box-shadow: 0 4px 12px rgba(239,68,68,0.25); }
.btn-modal.danger:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(239,68,68,0.35); }

@keyframes modal-pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── List Transitions ── */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.4s ease;
}

/* ── Loading ── */
.loading-state {
  padding: 3rem;
  text-align: center;
  color: #94a3b8;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .act-header { flex-direction: column; align-items: flex-start; }
  .header-controls { flex-wrap: wrap; }
  .tech-grid, .row-body { grid-template-columns: 1fr; }
  .totals-row { grid-template-columns: 1fr; }
  .form-card { padding: 1.5rem; }
  .qty-grid { grid-template-columns: 1fr; }
}
.status-badge-main {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.status-process { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.status-completed { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
.status-partial { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.status-cancelled { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

.title-status-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.25rem; }
.item-status-pill { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 4px; }
.divider-v { width: 1px; height: 20px; background: var(--border-2); margin: 0 0.5rem; }

.status-actions {
  display: flex;
  gap: 0.35rem;
  margin-right: 0.5rem;
}

.btn-status-action {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid var(--border-2);
  background: white;
}

.btn-status-action.complete { color: #10b981; }
.btn-status-action.complete:hover { background: #d1fae5; border-color: #10b981; }
.btn-status-action.partial { color: #f59e0b; }
.btn-status-action.partial:hover { background: #fef3c7; border-color: #f59e0b; }
.btn-status-action.cancel { color: #ef4444; }
.btn-status-action.cancel:hover { background: #fee2e2; border-color: #ef4444; }
.btn-status-action.reset { color: #6366f1; }
.btn-status-action.reset:hover { background: #eef2ff; border-color: #6366f1; }

/* Status Modals Specifics */
.compact-status { max-width: 450px !important; padding: 1.5rem !important; }
.modal-header-compact { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
.modal-header-compact h3 { margin: 0; font-size: 1.1rem; font-weight: 800; }
.modal-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem; }
.partial-list { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; padding-right: 0.5rem; }
.partial-input-row { display: flex; flex-direction: column; gap: 0.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-2); }
.partial-input-row:last-child { border-bottom: none; }
.p-desc { font-size: 0.85rem; font-weight: 700; color: var(--text-main); }
.p-inputs { display: flex; align-items: center; justify-content: space-between; }
.p-meta { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
.input-mini { width: 80px !important; padding: 0.4rem 0.6rem !important; font-size: 0.85rem !important; }
.reason-form { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; }
.reason-form label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
.reason-form textarea { width: 100%; border-radius: 8px; border: 1.5px solid var(--border-2); padding: 0.75rem; font-size: 0.9rem; }
.info-only .readonly-val { padding: 0.7rem 0; font-weight: 800; color: var(--brand-primary); font-size: 1.1rem; }

.tech-tag.vehicle {
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.existing-team-info {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
}

.team-icon { color: #0369a1; }
.team-label { font-size: 0.75rem; font-weight: 700; color: #0369a1; text-transform: uppercase; margin: 0; }
.team-names { font-size: 1rem; color: #0c4a6e; margin: 0.15rem 0; }
.team-vehicle { font-size: 0.85rem; font-weight: 700; color: #0c4a6e; display: flex; align-items: center; gap: 0.35rem; margin: 0; }

.btn-release-vehicle {
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-release-vehicle {
  background: #fef2f2;
  color: #ef4444;
  border: 1.5px solid #fee2e2;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.5rem;
}

.btn-release-vehicle:hover {
  background: #fee2e2;
  transform: translateY(-1px);
}
</style>
