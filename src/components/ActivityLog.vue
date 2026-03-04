<script setup>
import { ref, computed, nextTick } from 'vue';
import { AlertTriangle, X, Pencil, Trash2, Check, PenLine, Plus, Users, ClipboardList, Save } from 'lucide-vue-next';
import { personnel } from '../data/personnel';
import { rates } from '../data/rates';
import { useActivities } from '../composables/useActivities';
import { useAttendance } from '../composables/useAttendance';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

const { activities, addActivity, updateActivity, deleteActivity } = useActivities();
const { getStatus } = useAttendance();
const { showNotification } = useNotifications();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const isToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate.value === today;
});

// Form State
const selectedMainTech = ref('');
const selectedPartnerTech = ref('');
const forcedVisibleTechs = ref([]);
const activityRows = ref([
  { id: crypto.randomUUID(), rateCode: '', assigned: 0, completed: 0, observations: '' }
]);

// Editing State
const editingId = ref(null);
const editForm = ref({ assigned: 0, completed: 0, observations: '' });
const showDeleteModal = ref(false);
const itemToDeleteId = ref(null);

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
  return personnel.filter(p => {
    if (excludedRoles.includes(p.role)) return false;
    const attendanceRecord = getStatus(p.id, selectedDate.value);
    if (attendanceRecord && attendanceRecord.status === 'Falta') return false;
    return true;
  });
});

const busyTechIds = computed(() => {
  const targetDate = selectedDate.value;
  const targetActivities = activities.value.filter(a => a.timestamp.startsWith(targetDate));
  
  const ids = new Set();
  targetActivities.forEach(a => {
    if (a.mainTechId) ids.add(a.mainTechId);
    if (a.partnerTechId) ids.add(a.partnerTechId);
  });
  return ids;
});

const availableLeadTechs = computed(() => {
  let available = operationalPersonnel.value.filter(p => 
    !busyTechIds.value.has(p.id) || p.id === selectedMainTech.value || p.id === selectedPartnerTech.value || forcedVisibleTechs.value.includes(p.id)
  );
  if (selectedPartnerTech.value) {
    available = available.filter(p => p.id !== selectedPartnerTech.value);
  }
  return available;
});

const availablePartners = computed(() => {
  if (!selectedMainTech.value) return [];
  let available = operationalPersonnel.value.filter(p => 
    !busyTechIds.value.has(p.id) || p.id === selectedPartnerTech.value || p.id === selectedMainTech.value || forcedVisibleTechs.value.includes(p.id)
  );
  return available.filter(p => p.id !== selectedMainTech.value);
});

const pendingPersonnel = computed(() => {
  return operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
});

const groupedActivities = computed(() => {
    const groups = [];
    const map = new Map();
    
    const targetDate = selectedDate.value;
    const filtered = activities.value.filter(a => a.timestamp.startsWith(targetDate));

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
                items: []
            };
            map.set(key, group);
            groups.push(group);
        }
        map.get(key).items.push(act);
    });
    return groups;
});

// Actions
const addActivityToGroup = async (group) => {
    // Make sure the techs are visible in the lists BEFORE updating the selected models
    // to prevent the <select> tag from stripping invalid values.
    forcedVisibleTechs.value = [group.mainTechId, group.partnerTechId].filter(Boolean);
    
    // Wait for the DOM and computed properties to update
    await nextTick();
    
    selectedMainTech.value = group.mainTechId;
    selectedPartnerTech.value = group.partnerTechId || '';
    
    activityRows.value = [{ 
      id: crypto.randomUUID(), 
      rateCode: '', 
      assigned: 0, 
      completed: 0,
      observations: ''
    }];

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const addRow = () => {
  activityRows.value.push({ 
    id: crypto.randomUUID(), 
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

const saveEdit = (activity) => {
    const rate = getRateInfo(editForm.value.rateCode); 
    if (!rate) return;

    const assigned = Number(editForm.value.assigned);
    const completed = Number(editForm.value.completed);

    const newProjected = (rate.price * assigned).toFixed(2);
    const newRealized = (rate.price * completed).toFixed(2);

    updateActivity(activity.id, {
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

const confirmDelete = () => {
    if (itemToDeleteId.value) {
        deleteActivity(itemToDeleteId.value);
        showNotification('Registro eliminado', 'info');
    }
    closeDeleteModal();
};

const closeDeleteModal = () => {
    showDeleteModal.value = false;
    itemToDeleteId.value = null;
};

const handleSubmit = () => {
  if (!selectedMainTech.value) {
    showNotification('Seleccione un técnico principal.', 'error');
    return;
  }
  
  const validRows = activityRows.value.filter(r => r.rateCode && (r.assigned > 0 || r.completed > 0));
  if (validRows.length === 0) {
    showNotification('Registre al menos una actividad con cantidades.', 'error');
    return;
  }

  const mainTech = personnel.find(p => p.id === selectedMainTech.value);
  const partnerTech = selectedPartnerTech.value 
    ? personnel.find(p => p.id === selectedPartnerTech.value) 
    : null;

  let savedCount = 0;
  const entryTime = new Date().toLocaleTimeString('en-US', { hour12: false });
  const timestamp = `${selectedDate.value}T${entryTime}`;
  
  validRows.forEach(row => {
    const rate = getRateInfo(row.rateCode);
    const description = `${rate.code} - ${rate.name}`;
    const rowProjected = (rate.price * row.assigned).toFixed(2);
    const rowRealized = (rate.price * row.completed).toFixed(2);

    addActivity({
      mainTechId: mainTech.id,
      mainTechName: mainTech.name,
      partnerTechId: partnerTech?.id || null,
      partnerTechName: partnerTech?.name || null,
      description: description,
      assigned: row.assigned,
      completed: row.completed,
      rateCode: rate.code,
      unitPrice: rate.price,
      projectedValue: rowProjected,
      realizedValue: rowRealized,
      observations: row.observations || '',
      timestamp: timestamp
    });
    savedCount++;
  });

  selectedMainTech.value = '';
  selectedPartnerTech.value = '';
  forcedVisibleTechs.value = [];
  activityRows.value = [{ id: crypto.randomUUID(), rateCode: '', assigned: 0, completed: 0, observations: '' }];
  
  showNotification(`${savedCount} actividades registradas (${selectedDate.value})`, 'success');
  scrollToTop();
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
        <span class="mode-badge" v-if="!isToday">Modo Histórico</span>
        <span class="close-badge">Cierre 18:00</span>
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

      <!-- FORM CARD -->
      <div class="form-card glass-panel">
        <form @submit.prevent="handleSubmit">

          <!-- Step 1: Team Selection -->
          <div class="form-step">
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
                      {{ p.name }} ({{ p.role }})
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
                      {{ p.name }}
                    </option>
                  </select>
                </div>
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

            <transition-group name="list" tag="div" class="rows-container">
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
                      <label v-if="index === 0" :for="'assigned-' + index">Meta</label>
                      <input :id="'assigned-' + index" :name="'assigned-' + index" type="number" v-model="row.assigned" min="0" placeholder="0" />
                      <div class="mini-calc" v-if="row.rateCode">Est: S/ {{ (getRateInfo(row.rateCode)?.price * row.assigned).toFixed(2) }}</div>
                    </div>
                    <div class="form-group">
                      <label v-if="index === 0" :for="'completed-' + index">Avance</label>
                      <input :id="'completed-' + index" :name="'completed-' + index" type="number" v-model="row.completed" min="0" placeholder="0" />
                      <div class="mini-calc highlight" v-if="row.rateCode">Real: S/ {{ (getRateInfo(row.rateCode)?.price * row.completed).toFixed(2) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </transition-group>

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
                    <p class="description">{{ activity.description }}</p>
                    <p v-if="activity.observations" class="observations-text"><em>Obs: {{ activity.observations }}</em></p>
                    <div class="stats-mini">
                      <span class="stat-pill">Meta: <strong>{{ activity.assigned }}</strong> <small class="text-muted">S/ {{ activity.projectedValue || '0.00' }}</small></span>
                      <span class="stat-pill real">Real: <strong>{{ activity.completed }}</strong> <small>S/ {{ activity.realizedValue || activity.totalValue || '0.00' }}</small></span>
                    </div>
                  </div>
                  <div class="line-actions">
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
                        <label :for="'edit-assigned-' + activity.id">Meta</label>
                        <input :id="'edit-assigned-' + activity.id" :name="'edit-assigned-' + activity.id" type="number" v-model="editForm.assigned" min="0">
                      </div>
                      <div class="form-group">
                        <label :for="'edit-completed-' + activity.id">Real</label>
                        <input :id="'edit-completed-' + activity.id" :name="'edit-completed-' + activity.id" type="number" v-model="editForm.completed" min="0">
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
  background: #fffbeb;
  color: #b45309;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid #fcd34d;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 0.9rem;
}

/* ── Form Card ── */
.form-card {
  padding: 2rem;
}

.form-step {
  margin-bottom: 0.5rem;
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
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
  background: linear-gradient(to right, transparent, var(--border-2, #e2e8f0), transparent);
  margin: 1.5rem 0;
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
  background: var(--bg-card-2, #f8fafc);
  border: 1px solid var(--border-2, #e2e8f0);
  border-radius: 14px;
  padding: 1.25rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.activity-row:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
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
  background: #eff6ff;
  color: #2563eb;
}

.tech-tag.partner {
  background: #fdf2f8;
  color: #db2777;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-badge {
  font-size: 0.75rem;
  color: #94a3b8;
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
  background: #e0e7ff;
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
  background: #f1f5f9;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  color: #64748b;
}

.stat-pill.real {
  background: #d1fae5;
  color: #059669;
}

.text-muted { color: #94a3b8; font-weight: normal; margin-left: 4px; }

.line-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon-action {
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #64748b;
}

.btn-icon-action.edit:hover { background: #e0e7ff; color: #4338ca; }
.btn-icon-action.delete:hover { background: #fee2e2; color: #ef4444; }

/* ── Edit Mode ── */
.edit-mode {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--bg-card-2, #f8fafc);
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
  border: 1.5px solid var(--border-2, #cbd5e1);
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
.btn-sm.cancel { background: #e2e8f0; color: #64748b; }
.btn-sm.cancel:hover { background: #cbd5e1; }

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  padding: 2rem;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-icon {
  background: #fee2e2;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 1.5rem auto;
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-card h3 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1.4rem;
}

.modal-card p {
  color: #6b7280;
  margin-bottom: 2rem;
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

.btn-modal.secondary { background: #f3f4f6; color: #4b5563; }
.btn-modal.secondary:hover { background: #e5e7eb; }
.btn-modal.danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; box-shadow: 0 4px 12px rgba(239,68,68,0.25); }
.btn-modal.danger:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(239,68,68,0.35); }

@keyframes modal-pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

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
</style>
