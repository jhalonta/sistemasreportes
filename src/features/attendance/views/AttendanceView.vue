<script setup>
import { onMounted, computed, ref, watch } from 'vue';
import { 
  ClipboardCheck, 
  Printer, 
  UserCheck, 
  CircleCheck, 
  CircleX, 
  Clock, 
  AlertTriangle,
  Search,
  XCircle,
  HelpCircle,
  MoreVertical,
  Stethoscope
} from 'lucide-vue-next';
import { useAttendanceStore } from '../store/attendanceStore';
import { useTechnicianStore } from '../../technicians/store/technicianStore';
import { useAuthStore } from '../../auth/store/authStore';
import { useReports } from '@/composables/useReports';
import BaseModal from '@/components/BaseModal.vue';

const attendanceStore = useAttendanceStore();
const techStore = useTechnicianStore();
const authStore = useAuthStore();
const { downloadMonthlyAttendancePdf } = useReports();

const searchQuery = ref('');
const showNotesModal = ref(false);
const selectedTechForNotes = ref(null);
const pendingStatus = ref(null);
const notesText = ref('');

// Custom Confirmation Modal State
const showConfirmModal = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmName = ref('');
const confirmAction = ref(null);
const confirmType = ref('danger'); // 'danger' or 'primary'

const openConfirmModal = (title, message, name, action, type = 'danger') => {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmName.value = name;
  confirmAction.value = action;
  confirmType.value = type;
  showConfirmModal.value = true;
};

const handleConfirmAction = async () => {
  if (confirmAction.value) {
    await confirmAction.value();
  }
  showConfirmModal.value = false;
};

onMounted(async () => {
  await techStore.fetchTechnicians();
  await attendanceStore.fetchAttendance();
});

// Watch for date changes to refetch attendance
watch(() => attendanceStore.selectedDate, async (newDate) => {
  await attendanceStore.fetchAttendance(newDate);
});

const filteredTechnicians = computed(() => {
  const profile = authStore.userProfile;
  const query = searchQuery.value.toLowerCase();
  
  return techStore.sortedTechnicians.filter(t => {
    // 1. Must be active
    if (!t.active) return false;
    
    // 2. Role-based filter (Sede only sees their own)
    if (profile?.role === 'sede' && t.locationId !== profile.locationId) {
      return false;
    }
    
    // 3. Search query filter
    return t.fullName.toLowerCase().includes(query) ||
           t.role?.toLowerCase().includes(query);
  });
});

const getStatusIcon = (status) => {
  switch (status) {
    case 'present': return { icon: CircleCheck, class: 'present', label: 'Presente' };
    case 'absent': return { icon: CircleX, class: 'absent', label: 'Falta' };
    case 'late': return { icon: Clock, class: 'late', label: 'Tarde' };
    case 'justified': return { icon: CircleCheck, class: 'justified', label: 'Justificado' };
    case 'dm': return { icon: Stethoscope, class: 'medical', label: 'D. Médico' };
    default: return { icon: HelpCircle, class: 'pending', label: 'Pendiente' };
  }
};

const handleStatusClick = async (techId, status) => {
  if (status === 'late' || status === 'justified' || status === 'dm') {
    selectedTechForNotes.value = techId;
    pendingStatus.value = status;
    notesText.value = attendanceStore.records[techId]?.notes || '';
    showNotesModal.value = true;
  } else {
    await attendanceStore.setAttendanceStatus(techId, status);
  }
};

const saveWithNotes = async () => {
  if (selectedTechForNotes.value && pendingStatus.value) {
    await attendanceStore.setAttendanceStatus(selectedTechForNotes.value, pendingStatus.value, {
      notes: notesText.value
    });
    showNotesModal.value = false;
    selectedTechForNotes.value = null;
    pendingStatus.value = null;
    notesText.value = '';
  }
};

const handleTogglePresence = async (techId) => {
  const record = attendanceStore.records[techId];
  if (record) {
    const tech = techStore.technicians.find(t => t.id === techId);
    openConfirmModal(
      '¿Desmarcar Asistencia?',
      'Esta acción eliminará el registro de asistencia del técnico:',
      tech?.fullName || '',
      () => attendanceStore.removeAttendance(techId),
      'danger'
    );
  } else {
    await handleStatusClick(techId, 'present');
  }
};

const handleMarkAbsent = async (techId) => {
  await handleStatusClick(techId, 'absent');
};

const handleMarkAll = async () => {
  openConfirmModal(
    '¿Marcar Todos?',
    'Se marcarán todos los técnicos disponibles como "Presentes" para el día seleccionado.',
    '',
    () => attendanceStore.markAllPresent(),
    'primary'
  );
};

const formatTime = (timestamp) => {
  if (!timestamp) return '-';
  // Handle Firestore timestamp if needed, for now assuming it might be JS Date or null
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};

const printReport = async () => {
  const ym = attendanceStore.selectedDate.substring(0, 7);
  // Ensure we have monthly data
  await attendanceStore.fetchMonthlyAttendance(ym);
  downloadMonthlyAttendancePdf(ym);
};
</script>

<template>
  <div class="attendance-view">
    <!-- Header Section -->
    <div class="view-header">
      <div class="header-info">
        <h2 class="title">
          <ClipboardCheck :size="28" class="title-icon" /> Asistencias
        </h2>
        <p class="subtitle">
          {{ authStore.userProfile?.role === 'sede' ? 'Gestiona la asistencia diaria de tu sede.' : 'Gestión diaria de asistencia del personal técnico.' }}
        </p>
      </div>
      <div class="header-actions">
        <div class="date-selector">
          <label>Fecha:</label>
          <input type="date" v-model="attendanceStore.selectedDate" class="date-input" />
        </div>
        <button class="btn-secondary" @click="printReport">
          <Printer :size="18" /> Reporte
        </button>
        <button class="btn-primary" @click="handleMarkAll">
          <UserCheck :size="18" /> Marcar Todo
        </button>
      </div>
    </div>

    <!-- Controls & Filters -->
    <div class="view-controls glass-panel">
      <div class="search-wrap">
        <Search :size="18" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Buscar técnico..." />
      </div>
      <div class="stats-summary">
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value">{{ filteredTechnicians.length }}</span>
        </div>
        <div class="stat-item present">
          <span class="stat-label">Presentes:</span>
          <span class="stat-value">{{ filteredTechnicians.filter(t => attendanceStore.records[t.id]?.status === 'present').length }}</span>
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="table-container glass-panel">
      <div v-if="attendanceStore.loading && techStore.technicians.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando datos...</p>
      </div>

      <div v-else-if="filteredTechnicians.length === 0" class="empty-state">
        <AlertTriangle :size="48" class="empty-icon" />
        <p>No hay técnicos activos para esta fecha.</p>
      </div>

      <table v-else class="attendance-table">
        <thead>
          <tr>
            <th>Técnico</th>
            <th>Cargo</th>
            <th>Estado</th>
            <th>Hora Ingreso</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTechnicians" :key="t.id">
            <td>
              <div class="tech-info">
                <div class="tech-avatar">{{ t.fullName.charAt(0) }}</div>
                <div class="tech-details">
                  <span class="tech-name">{{ t.fullName }}</span>
                  <span class="tech-sub">{{ t.phone || t.email }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="role-badge">{{ t.role || '-' }}</span>
            </td>
            <td>
              <div class="status-cell" :class="getStatusIcon(attendanceStore.records[t.id]?.status).class">
                <component :is="getStatusIcon(attendanceStore.records[t.id]?.status).icon" :size="16" />
                <span>{{ getStatusIcon(attendanceStore.records[t.id]?.status).label }}</span>
              </div>
            </td>
            <td>
              <span class="time-text">{{ formatTime(attendanceStore.records[t.id]?.checkIn) }}</span>
            </td>
            <td class="text-right">
              <div class="action-buttons">
                <button 
                  class="btn-toggle" 
                  :class="{ 'active': attendanceStore.records[t.id] }"
                  @click="handleTogglePresence(t.id)"
                  :title="attendanceStore.records[t.id] ? 'Desmarcar' : 'Marcar Presente'"
                >
                  <CircleCheck v-if="!attendanceStore.records[t.id]" :size="18" />
                  <CircleX v-else :size="18" />
                </button>
                <button 
                  v-if="!attendanceStore.records[t.id]"
                  class="btn-status late" 
                  @click="handleStatusClick(t.id, 'late')"
                  title="Marcar Tarde"
                >
                  <Clock :size="18" />
                </button>
                <button
                  v-if="!attendanceStore.records[t.id]"
                  class="btn-absent"
                  @click="handleMarkAbsent(t.id)"
                  title="Marcar Falta"
                >
                  <CircleX :size="18" />
                </button>
                <button
                  v-if="!attendanceStore.records[t.id]"
                  class="btn-status medical"
                  @click="handleStatusClick(t.id, 'dm')"
                  title="Marcar Descanso Médico"
                >
                  <Stethoscope :size="18" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Notes Modal -->
    <BaseModal
      :show="showNotesModal"
      title="Agregar Notas de Asistencia"
      subtitle="Ingresa detalles sobre el estado de asistencia del técnico."
      icon="Clock"
      @close="showNotesModal = false"
    >
      <div class="notes-form">
        <label>Comentarios / Observaciones</label>
        <textarea 
          v-model="notesText" 
          placeholder="Ej: El técnico informó que llegaría tarde por tráfico..."
          rows="4"
        ></textarea>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="showNotesModal = false">Cancelar</button>
        <button class="btn-primary" @click="saveWithNotes">
          <CircleCheck :size="18" /> Guardar Estado
        </button>
      </template>
    </BaseModal>

    <!-- Custom Confirmation Modal -->
    <BaseModal
      :show="showConfirmModal"
      :title="confirmTitle"
      :subtitle="confirmMessage"
      :icon="AlertTriangle"
      :icon-class="confirmType === 'danger' ? 'text-red-500' : 'text-indigo-500'"
      max-width="450px"
      @close="showConfirmModal = false"
    >
      <div class="confirm-body">
        <p v-if="confirmName" class="confirm-desc">
          ¿Estás seguro de que deseas realizar esta acción para <span :class="confirmType === 'danger' ? 'high-danger' : 'high-primary'">{{ confirmName }}</span>?
        </p>
        <p v-else class="confirm-desc">
          ¿Estás seguro de que deseas realizar esta acción?
        </p>
      </div>

      <template #footer>
        <button type="button" class="btn-secondary" @click="showConfirmModal = false">Cancelar</button>
        <button 
          type="button" 
          :class="confirmType === 'danger' ? 'btn-danger' : 'btn-primary'" 
          @click="handleConfirmAction"
        >
          <CircleCheck v-if="confirmType === 'primary'" :size="20" />
          <CircleX v-else :size="20" />
          {{ confirmType === 'danger' ? 'Sí, Desmarcar' : 'Sí, Marcar Todos' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.attendance-view {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-selector label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.date-input {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  font-size: 0.9rem;
}

.view-controls {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-wrap {
  position: relative;
  max-width: 400px;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-wrap input {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.25rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
}

.stats-summary {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.stat-value {
  color: var(--brand-primary, #6366f1);
  font-size: 1.1rem;
}

.stat-item.present .stat-value {
  color: #10b981;
}

.table-container {
  min-height: 400px;
}

.attendance-table {
  width: 100%;
  border-collapse: collapse;
}

.attendance-table th {
  text-align: left;
  padding: 1rem 1.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-2);
}

.attendance-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-2);
}

.tech-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tech-avatar {
  width: 36px;
  height: 36px;
  background: var(--nav-active-bg, #eef2ff);
  color: var(--brand-primary, #6366f1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}

.tech-details {
  display: flex;
  flex-direction: column;
}

.tech-name {
  font-weight: 700;
  color: var(--text-main);
}

.tech-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.role-badge {
  background: var(--bg-input);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

.status-cell.present { background: #d1fae5; color: #10b981; }
.status-cell.absent { background: #fee2e2; color: #ef4444; }
.status-cell.late { background: #fef3c7; color: #d97706; }
.status-cell.medical { background: #e0f2fe; color: #0369a1; }
.status-cell.pending { background: #f1f5f9; color: #64748b; }

.time-text {
  font-family: monospace;
  font-weight: 600;
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn-toggle, .btn-absent, .btn-status {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid var(--border-2);
  background: white;
}

.btn-status.late {
  color: #d97706;
}

.btn-status.medical {
  color: #0369a1;
}

.btn-toggle {
  color: #10b981;
}

.btn-toggle.active {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

.btn-absent {
  color: #ef4444;
}

.notes-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notes-form label {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.notes-form textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1.5px solid var(--border-2);
  background: var(--bg-input);
  color: var(--text-main);
  resize: none;
}

.btn-toggle:hover, .btn-absent:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

/* ── Custom Confirm Styles ── */
.confirm-body {
  padding: 1.5rem;
}

.confirm-desc {
  font-size: 1rem;
  color: var(--text-main);
  line-height: 1.5;
}

.high-danger {
  color: #ef4444;
  font-weight: 800;
}

.high-primary {
  color: #6366f1;
  font-weight: 800;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
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
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media print {
  .view-header .header-actions, .view-controls, .action-buttons {
    display: none !important;
  }
}
</style>
