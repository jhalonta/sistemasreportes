<script setup>
import { ref, computed } from 'vue';
import { personnel } from '../data/personnel';
import { useAttendance } from '../composables/useAttendance';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

const { currentTime, isWithinSchedule, checkIn, getStatus } = useAttendance();
const { showNotification } = useNotifications();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const isToday = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate.value === today;
});

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

const handleCheckIn = (personId) => {
  const result = checkIn(personId, selectedDate.value);
  showNotification(result.message, result.success ? 'success' : 'error');
};
</script>

<template>
  <div class="attendance-container">
    <header class="header glass-panel">
      <h1 class="title">Registro de Asistencia</h1>
      
      <div class="clock-display">
        <div class="date-selector">
            <label>Fecha de Registro:</label>
            <input type="date" v-model="selectedDate" class="date-input" />
        </div>

        <div class="time-wrapper" v-if="isToday">
          <span class="time">{{ formattedTime }}</span>
          <span class="date">{{ formattedDate }}</span>
        </div>
        
        <div class="status-badge" :class="{ 'open': isWithinSchedule, 'closed': !isWithinSchedule }" v-if="isToday">
          <span class="status-dot"></span>
          {{ isWithinSchedule ? 'SISTEMA ABIERTO' : 'SISTEMA CERRADO' }}
        </div>
        <div class="status-badge manual" v-else>
            <span class="status-dot"></span>
            MODO HISTÓRICO
        </div>
      </div>
    </header>

    <main class="staff-list-container glass-panel">
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Colaborador</th>
              <th>Cargo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="person in personnel" :key="person.id" class="staff-row">
              <td class="id-cell">#{{ person.id }}</td>
              <td class="name-cell">
                <div class="avatar-placeholder">{{ person.name.charAt(0) }}</div>
                <span class="name-text">{{ person.name }}</span>
              </td>
              <td class="role-cell">{{ person.role }}</td>
              <td>
                <div v-if="getStatus(person.id, selectedDate)" class="status-pill present">
                  Presente
                </div>
                <div v-else class="status-pill pending">
                  Pendiente
                </div>
              </td>
              <td>
                <button 
                  @click="handleCheckIn(person.id)" 
                  :disabled="(isToday && !isWithinSchedule) || getStatus(person.id, selectedDate)"
                  class="btn-checkin"
                >
                  {{ getStatus(person.id, selectedDate) ? 'Registrado' : 'Marcar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<style scoped>
.attendance-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Glassmorphism Common */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clock-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.time-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.time {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1;
  color: #334155;
  font-variant-numeric: tabular-nums;
}

.date {
  font-size: 1.1rem;
  color: var(--text-muted);
  text-transform: capitalize;
  margin-top: 0.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.status-badge.open {
  background-color: var(--success-bg);
  color: #059669;
}

.status-badge.closed {
  background-color: var(--danger-bg);
  color: #dc2626;
}

.status-badge.manual {
    background-color: #fef3c7;
    color: #d97706;
}

.date-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.date-selector label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #64748b;
}

.date-input {
    background-color: white;
    padding: 0.5rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 1rem;
    color: #334155;
    outline: none;
    transition: all 0.2s;
}

.date-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

/* Table Styles */
.staff-list-container {
  padding: 0; /* Let table fill */
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

thead th {
  padding: 1.25rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background-color: rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

tbody tr {
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(0,0,0,0.02);
}

tbody tr:last-child {
  border-bottom: none;
}

tbody tr:hover {
  background-color: rgba(255,255,255,0.4);
}

td {
  padding: 1.25rem 1.5rem;
  vertical-align: middle;
}

.id-cell {
  font-family: monospace;
  color: var(--text-muted);
  font-weight: 600;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
}

.name-text {
  font-weight: 600;
  color: var(--text-main);
}

.role-cell {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-pill.present {
  background-color: var(--success-bg);
  color: #059669;
}

.status-pill.pending {
  background-color: #f1f5f9;
  color: #64748b;
}

.checkin-time {
  font-size: 0.75rem;
  opacity: 0.8;
  margin-left: 0.25rem;
}

.btn-checkin {
  background: var(--primary-gradient);
  color: white;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
}

.btn-checkin:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
}

.btn-checkin:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

@media (max-width: 640px) {
  .header {
    padding: 1.5rem;
  }
  
  .title {
    font-size: 1.5rem;
  }
  
  .time {
    font-size: 2.5rem;
  }
  
  td, th {
    padding: 1rem;
  }
  
  .role-cell {
    display: none; /* Hide role on small screens if needed */
  }
}
</style>
