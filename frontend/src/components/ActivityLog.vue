<script setup>
import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { rates } from '../data/rates';
import { useActivities } from '../composables/useActivities';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

const { activities, addActivity, updateActivity, deleteActivity } = useActivities();
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
const activityRows = ref([
  { id: crypto.randomUUID(), rateCode: '', assigned: 0, completed: 0 }
]);

// Editing State
const editingId = ref(null);
const editForm = ref({ assigned: 0, completed: 0 });
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
const operationalPersonnel = computed(() => 
  personnel.filter(p => !excludedRoles.includes(p.role))
);

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
  let available = operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
  if (selectedPartnerTech.value) {
    available = available.filter(p => p.id !== selectedPartnerTech.value);
  }
  return available;
});

const availablePartners = computed(() => {
  if (!selectedMainTech.value) return [];
  let available = operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
  return available.filter(p => p.id !== selectedMainTech.value);
});

const pendingPersonnel = computed(() => {
  return operationalPersonnel.value.filter(p => !busyTechIds.value.has(p.id));
});

const groupedActivities = computed(() => {
    const groups = [];
    const map = new Map();
    
    // Filter activities by selected date first
    const targetDate = selectedDate.value;
    const filtered = activities.value.filter(a => a.timestamp.startsWith(targetDate));

    filtered.forEach(act => {
        const key = `${act.mainTechId}|${act.partnerTechId}`;
        
        if (!map.has(key)) {
            const group = {
                id: key, 
                timestamp: act.timestamp,
                mainTechName: act.mainTechName,
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
const addRow = () => {
  activityRows.value.push({ 
    id: crypto.randomUUID(), 
    rateCode: '', 
    assigned: 0, 
    completed: 0 
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
        assigned: activity.assigned,
        completed: activity.completed
    };
};

const cancelEditing = () => {
    editingId.value = null;
};

const saveEdit = (activity) => {
    const rate = getRateInfo(activity.rateCode); 
    if (!rate) return;

    const assigned = Number(editForm.value.assigned);
    const completed = Number(editForm.value.completed);

    const newProjected = (rate.price * assigned).toFixed(2);
    const newRealized = (rate.price * completed).toFixed(2);

    updateActivity(activity.id, {
        assigned: assigned,
        completed: completed,
        projectedValue: newProjected,
        realizedValue: newRealized,
        totalValue: newRealized
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
      timestamp: timestamp
    });
    savedCount++;
  });

  selectedMainTech.value = '';
  selectedPartnerTech.value = '';
  activityRows.value = [{ id: crypto.randomUUID(), rateCode: '', assigned: 0, completed: 0 }];
  
  showNotification(`${savedCount} actividades registradas (${selectedDate.value})`, 'success');
  scrollToTop();
};
</script>

<template>
  <div class="activity-container">
    <div class="loading-state" v-if="!rates || rates.length === 0">
      <p>Cargando datos de actividades...</p>
    </div>

    <div class="activity-form glass-panel" v-else>
      <header class="panel-header">
          <div class="header-left">
              <h2 class="section-title">Registro de Producción</h2>
              <div class="date-display">
                <input type="date" v-model="selectedDate" class="date-input-small" />
                <span class="mode-badge" v-if="!isToday">Modo Histórico</span>
              </div>
          </div>
          <span class="close-time">Cierre 18:00 PM</span>
      </header>
      
      <div v-if="pendingPersonnel.length > 0" class="pending-alert">
        <span class="icon">⚠</span> 
        <span>Faltan reportar <strong>{{ pendingPersonnel.length }}</strong> técnicos</span>
      </div>

      <form @submit.prevent="handleSubmit" class="main-form">
        <!-- Tech Selection Section -->
        <section class="tech-section">
            <div class="form-group">
              <label>Técnico Principal</label>
              <div class="select-wrapper">
                  <select v-model="selectedMainTech" required>
                    <option disabled value="">Seleccionar Técnico</option>
                    <option v-for="p in availableLeadTechs" :key="p.id" :value="p.id">
                      {{ p.name }} ({{ p.role }})
                    </option>
                  </select>
              </div>
            </div>

            <div class="form-group">
              <label>Pareja (Opcional)</label>
              <div class="select-wrapper">
                  <select v-model="selectedPartnerTech">
                    <option value="">Sin pareja</option>
                    <option v-for="p in availablePartners" :key="p.id" :value="p.id">
                      {{ p.name }}
                    </option>
                  </select>
              </div>
            </div>
        </section>

        <div class="divider"></div>

        <!-- Activities Rows -->
        <section class="activities-section">
            <div class="section-header">
                <h3>Actividades Realizadas</h3>
                <span class="badge">{{ activityRows.length }}</span>
            </div>
            
            <transition-group name="list" tag="div" class="rows-container">
                <div v-for="(row, index) in activityRows" :key="row.id" class="activity-row">
                    <div class="row-header">
                        <span class="row-number">Actividad {{ index + 1 }}</span>
                        <button type="button" class="btn-icon remove" @click="removeRow(index)" v-if="activityRows.length > 1" title="Eliminar Fila">
                            ✕
                        </button>
                    </div>
                    
                    <div class="row-inputs">
                        <div class="form-group full-width">
                          <label v-if="index === 0">Tipo de Actividad</label>
                          <div class="select-wrapper">
                              <select v-model="row.rateCode" required>
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
                              <label v-if="index === 0">Meta (Asignado)</label>
                              <input type="number" v-model="row.assigned" min="0" placeholder="0" />
                              <div class="mini-calc" v-if="row.rateCode">Est: S/ {{ (getRateInfo(row.rateCode)?.price * row.assigned).toFixed(2) }}</div>
                            </div>

                            <div class="form-group">
                              <label v-if="index === 0">Avance (Realizado)</label>
                              <input type="number" v-model="row.completed" min="0" placeholder="0" />
                              <div class="mini-calc highlight" v-if="row.rateCode">Real: S/ {{ (getRateInfo(row.rateCode)?.price * row.completed).toFixed(2) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </transition-group>

            <button type="button" class="btn-secondary" @click="addRow">
                + Agregar otra actividad
            </button>
        </section>
        
        <section class="totals-section" v-if="totalProjected > 0 || totalRealized > 0">
           <div class="total-card">
             <span class="label">Proyección Total</span>
             <span class="value">S/ {{ totalProjected }}</span>
           </div>
           <div class="total-card real">
             <span class="label">Total Realizado</span>
             <span class="value">S/ {{ totalRealized }}</span>
           </div>
        </section>

        <button type="submit" class="btn-primary-large">
            Registrar Toda la Producción
        </button>
      </form>
    </div>

    <!-- Activity List History -->
    <div class="activity-history glass-panel">
      <h3>Producción Reciente (Hoy)</h3>
      <div v-if="activities.length === 0" class="empty-state">
        No hay registros hoy.
      </div>
      <ul v-else class="history-list">
        <li v-for="group in groupedActivities" :key="group.id" class="history-item group-card">
            <div class="group-header">
                <div class="tech-info">
                    <span class="tech-name main">{{ group.mainTechName }}</span>
                    <span v-if="group.partnerTechName" class="tech-name partner">+ {{ group.partnerTechName }}</span>
                </div>
                <span class="time-badge">{{ formatDate(group.timestamp) }}</span>
            </div>

            <div class="group-body">
                <div v-for="activity in group.items" :key="activity.id" class="activity-line">
                    
                    <!-- Standard View -->
                    <div v-if="editingId !== activity.id" class="activity-content">
                        <div class="activity-info">
                            <p class="description">{{ activity.description }}</p>
                            <div class="stats-mini">
                                <span class="stat-pill">Meta: <strong>{{ activity.assigned }}</strong> <small class="text-muted">S/ {{ activity.projectedValue || '0.00' }}</small></span>
                                <span class="stat-pill">Real: <strong>{{ activity.completed }}</strong> <small class="text-success">S/ {{ activity.realizedValue || activity.totalValue || '0.00' }}</small></span>
                            </div>
                        </div>
                        <div class="actions">
                            <button @click="startEditing(activity)" class="btn-icon edit" title="Editar Cantidades">✎</button>
                            <button @click="requestDelete(activity.id)" class="btn-icon delete" title="Eliminar Actividad">🗑</button>
                        </div>
                    </div>

                    <!-- Edit Mode -->
                    <div v-else class="edit-mode inline">
                        <div class="edit-grid compact">
                            <div class="form-group">
                                <label>Meta</label>
                                <input type="number" v-model="editForm.assigned" min="0">
                            </div>
                             <div class="form-group">
                                <label>Real</label>
                                <input type="number" v-model="editForm.completed" min="0">
                            </div>
                        </div>
                        <div class="edit-actions">
                             <button @click="cancelEditing" class="btn-small secondary">✕</button>
                             <button @click="saveEdit(activity)" class="btn-small primary">✔</button>
                        </div>
                    </div>

                </div>
            </div>
        </li>
      </ul>
    </div>
  </div>

  <!-- Custom Delete Modal -->
  <Transition name="fade">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
          <div class="modal-card">
              <div class="modal-icon">⚠</div>
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
.activity-container {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  color: #334155;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 24px;
  padding: 2.5rem;
  transition: transform 0.3s ease;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2rem;
    border-bottom: 2px solid #f1f5f9;
    padding-bottom: 1rem;
}

.header-left {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.date-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-input-small {
    padding: 0.25rem 0.5rem;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 0.9rem;
    color: #334155;
    background: white;
}

.mode-badge {
    font-size: 0.75rem;
    background: #fef3c7;
    color: #d97706;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-weight: 700;
}

.section-title {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  margin: 0;
}

.close-time {
    font-size: 0.9rem;
    color: #64748b;
    font-weight: 600;
    background: #f1f5f9;
    padding: 0.25rem 0.75rem;
    border-radius: 99px;
}

.pending-alert {
  background: #fffbeb;
  color: #b45309;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #fcd34d;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}

.tech-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
}

.divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #e2e8f0, transparent);
    margin: 2rem 0;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.section-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #475569;
}

.badge {
    background: #e0e7ff;
    color: #4338ca;
    font-size: 0.8rem;
    font-weight: 700;
    padding: 0.1rem 0.5rem;
    border-radius: 99px;
}

.activity-row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    position: relative;
    transition: all 0.2s ease;
}

.activity-row:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.row-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
}

.row-number {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    color: #94a3b8;
}

.btn-icon.remove {
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
    opacity: 0.6;
    transition: all 0.2s;
}

.btn-icon.remove:hover {
    opacity: 1;
    transform: scale(1.1);
}

.row-inputs {
    display: grid;
    grid-template-columns: 2fr 1.5fr;
    gap: 1.5rem;
}

.qty-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-group label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.5rem;
}

.select-wrapper {
    position: relative;
}

select, input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    font-size: 0.95rem;
    background: white;
    transition: all 0.2s;
    color: #1e293b;
}

select:focus, input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.mini-calc {
    font-size: 0.75rem;
    text-align: right;
    margin-top: 0.4rem;
    font-weight: 600;
    color: #94a3b8;
}

.mini-calc.highlight {
    color: #10b981;
}

.btn-secondary {
    width: 100%;
    padding: 1rem;
    background: #fff;
    border: 2px dashed #cbd5e1;
    color: #64748b;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
}

.btn-secondary:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #eef2ff;
}

.totals-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin: 2rem 0;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 16px;
}

.total-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
}

.total-card .label {
    font-size: 0.85rem;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
}

.total-card .value {
    font-size: 1.5rem;
    font-weight: 800;
    color: #334155;
}

.total-card.real .value {
    color: #10b981;
}

.btn-primary-large {
    width: 100%;
    padding: 1.25rem;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: white;
    border: none;
    border-radius: 16px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    transition: all 0.3s;
}

.btn-primary-large:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
}

/* History List Styles */
.history-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.history-item.group-card {
    background: white;
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    padding: 0;
    overflow: hidden;
    transition: transform 0.2s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.history-item:hover {
    border-color: #cbd5e1;
}

.group-header {
    background: #f8fafc;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.group-body {
    padding: 0.5rem 0;
}

.activity-line {
    padding: 0.75rem 1.25rem;
    border-bottom: 1px dashed #e2e8f0;
}

.activity-line:last-child {
    border-bottom: none;
}

.activity-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
}

.activity-info {
    flex: 1;
}

.description {
    font-size: 0.95rem;
    margin: 0 0 0.4rem 0;
    color: #334155;
    font-weight: 500;
}

.stats-mini {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
}

.stat-pill {
    background: #f1f5f9;
    padding: 0.2rem 0.6rem;
    border-radius: 6px;
    color: #64748b;
}

.text-muted { color: #94a3b8; font-weight: normal; margin-left: 4px; }
.text-success { color: #10b981; font-weight: bold; margin-left: 4px; }

.tech-name {
    font-size: 0.9rem;
    font-weight: 700;
    padding: 0.25rem 0.75rem;
    border-radius: 6px;
}

.tech-name.main {
    background: #eff6ff;
    color: #2563eb;
}

.tech-name.partner {
    background: #fdf2f8;
    color: #db2777;
    margin-left: 0.5rem;
}

.time-badge {
    font-size: 0.75rem;
    color: #94a3b8;
    font-weight: 600;
}

.actions {
    display: flex;
    gap: 0.5rem;
}

.btn-icon {
    border: none;
    background: #f1f5f9;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-icon.edit:hover { background: #e0e7ff; color: #4338ca; }
.btn-icon.delete:hover { background: #fee2e2; color: #ef4444; }

.edit-mode.inline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background: #f8fafc;
    padding: 0.5rem;
    border-radius: 8px;
}

.edit-grid.compact {
    display: flex;
    gap: 1rem;
}

.edit-grid.compact .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
}

.edit-grid.compact input {
    width: 80px;
    padding: 0.4rem;
    font-size: 0.9rem;
}

.edit-actions {
    display: flex;
    gap: 0.5rem;
}

.btn-small {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    font-size: 0.8rem;
}

.btn-small.primary { background: #10b981; color: white; }
.btn-small.secondary { background: #e2e8f0; color: #64748b; }

.edit-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
}

.btn-small {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    border: none;
}

.btn-small.primary { background: #4f46e5; color: white; }
.btn-small.secondary { background: white; border: 1px solid #cbd5e1; color: #64748b; margin-right: 0.5rem; }

/* MODAL STYLES */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
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
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    background: #fee2e2;
    width: 80px;
    height: 80px;
    line-height: 80px;
    border-radius: 50%;
    margin: 0 auto 1.5rem auto;
    color: #ef4444;
}

.modal-card h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
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
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-size: 1rem;
    transition: all 0.2s;
}

.btn-modal.secondary {
    background: #f3f4f6;
    color: #4b5563;
}

.btn-modal.secondary:hover {
    background: #e5e7eb;
}

.btn-modal.danger {
    background: #ef4444;
    color: white;
}

.btn-modal.danger:hover {
    background: #dc2626;
    transform: translateY(-1px);
}

@keyframes modal-pop {
    0% { transform: scale(0.9); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
    .glass-panel { padding: 1.5rem; }
    .tech-section, .row-inputs { grid-template-columns: 1fr; }
    .totals-section { grid-template-columns: 1fr; }
}
</style>
