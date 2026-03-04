<script setup>
import { ref, computed } from 'vue';
import { Printer, Ban, ClipboardCheck, UserCheck, CircleCheck, CircleX, Clock } from 'lucide-vue-next';
import { personnel } from '../data/personnel';
import { useAttendance } from '../composables/useAttendance';
import { useNotifications } from '../composables/useNotifications';
import { useGlobalStore } from '../stores/global';
import { storeToRefs } from 'pinia';

const { currentTime, isWithinSchedule, checkIn, removeCheckIn, markAbsent, markAll, getStatus, records } = useAttendance();
const { showNotification } = useNotifications();

const globalStore = useGlobalStore();
const { selectedDate } = storeToRefs(globalStore);

const daysInMonth = computed(() => {
    if (!selectedDate.value) return [];
    const [year, month, _] = selectedDate.value.split('-').map(Number);
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = 1; i <= lastDayOfMonth; i++) {
        days.push(i);
    }
    return days;
});

const monthlyAttendanceList = computed(() => {
    if (!selectedDate.value) return [];
    const [year, month, _] = selectedDate.value.split('-');
    
    return personnel.map(person => {
        const attendance = [];
        let totalPresent = 0;
        let totalAbsent = 0;
        
        for (let i = 1; i <= daysInMonth.value.length; i++) {
            const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
            const record = records.value[dateStr]?.[person.id];
            
            let statusChar = '';
            // If date is in the future, we don't count it yet
            if (record) {
                if (record.status === 'Presente') {
                    statusChar = 'P';
                    totalPresent++;
                } else if (record.status === 'Falta') {
                    statusChar = 'F';
                    totalAbsent++;
                }
            }
            attendance.push(statusChar);
        }
        
        return {
            name: person.name,
            role: person.role,
            attendance,
            totalPresent,
            totalAbsent
        };
    });
});

const printMonthlyReport = () => {
    window.print();
};

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

const toggleAttendance = async (personId) => {
  const status = getStatus(personId, selectedDate.value);
  const isRegistered = !!status;
  let result;
  
  if (isRegistered) {
      // Unmark
      result = await removeCheckIn(personId, selectedDate.value);
  } else {
      // Mark checking
      result = await checkIn(personId, selectedDate.value); 
  }

  showNotification(result.message, result.success ? 'success' : 'error');
};

const handleMarkAbsent = async (personId) => {
    const result = await markAbsent(personId, selectedDate.value);
    showNotification(result.message, result.success ? 'success' : 'error');
};

const handleMarkAll = async () => {
    const result = await markAll(personnel, selectedDate.value);
    showNotification(result.message, result.success ? 'success' : 'error');
};
</script>

<template>
  <div class="attendance-container">

    <!-- Page Header -->
    <div class="att-header">
      <div class="header-info">
        <h2 class="att-title">
          <ClipboardCheck :size="28" class="title-icon" /> Registro de Asistencia
        </h2>
        <div class="time-row" v-if="isToday">
          <span class="live-time">{{ formattedTime }}</span>
          <span class="live-date">{{ formattedDate }}</span>
        </div>
      </div>
      <div class="header-controls">
        <div class="date-picker-wrap">
          <label>Fecha de Registro</label>
          <input type="date" v-model="selectedDate" class="date-input" />
        </div>
        <button @click="printMonthlyReport" class="btn-action btn-print-pdf" title="Imprimir Reporte Mensual PDF">
          <Printer :size="18" /> PDF Mensual
        </button>
      </div>
    </div>

    <!-- Status & Actions Bar -->
    <div class="status-bar glass-panel">
      <div class="status-left">
        <div class="status-badge" :class="{ 'open': isWithinSchedule, 'closed': !isWithinSchedule }" v-if="isToday">
          <span class="status-dot"></span>
          {{ isWithinSchedule ? 'SISTEMA ABIERTO' : 'SISTEMA CERRADO' }}
        </div>
        <div class="status-badge manual" v-else>
          <span class="status-dot"></span>
          MODO HISTÓRICO
        </div>
      </div>
      <div class="status-right">
        <button v-if="isToday && isWithinSchedule" @click="handleMarkAll" class="btn-action btn-mark-all">
          <UserCheck :size="18" /> Marcar Todos
        </button>
      </div>
    </div>

    <!-- Staff Table -->
    <div class="staff-table-wrap glass-panel">
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
                <div v-if="getStatus(person.id, selectedDate)?.status === 'Presente'" class="status-pill present">
                  <CircleCheck :size="14" /> Presente
                </div>
                <div v-else-if="getStatus(person.id, selectedDate)?.status === 'Falta'" class="status-pill absent">
                  <CircleX :size="14" /> Falta
                </div>
                <div v-else class="status-pill pending">
                  <Clock :size="14" /> Pendiente
                </div>
              </td>
              <td class="actions-cell">
                <button
                  @click="toggleAttendance(person.id)"
                  :disabled="isToday && !isWithinSchedule"
                  class="btn-checkin"
                  :class="{ 'btn-danger': getStatus(person.id, selectedDate) }"
                >
                  {{ getStatus(person.id, selectedDate) ? 'Desmarcar' : 'Marcar' }}
                </button>

                <button
                    v-if="!getStatus(person.id, selectedDate)"
                    @click="handleMarkAbsent(person.id)"
                    :disabled="isToday && !isWithinSchedule"
                    class="btn-absent"
                    title="Marcar como Falta"
                >
                    <Ban :size="18" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Printable Area (Hidden on Screen) -->
    <div class="print-sheet screen-hidden">
        <header class="report-header">
            <h1 class="company-name">CONSORCIO <span class="blue-text">GALCAS</span> INGENIEROS</h1>
            <div class="company-info">
                <p><strong>RUC:</strong> 20612913766</p>
                <p><strong>DIRECCIÓN:</strong> AV. SALAVERRY N° 2415 INT. 202 - SAN ISIDRO - LIMA</p>
            </div>

            <h2 class="report-title">
                REPORTE GENERAL DE ASISTENCIA MENSUAL
                - {{ selectedDate ? selectedDate.split('-')[1] + '/' + selectedDate.split('-')[0] : '' }}
            </h2>
        </header>

        <table class="report-table">
            <thead>
                <tr>
                    <th rowspan="2" class="w-item">N°</th>
                    <th rowspan="2" class="w-name">APELLIDOS Y NOMBRES</th>
                    <th rowspan="2" class="w-role">CARGO</th>
                    <th :colspan="daysInMonth.length" class="text-center bg-gray">DÍAS DEL MES</th>
                    <th colspan="2" class="text-center bg-gray">TOTAL</th>
                </tr>
                <tr>
                    <th v-for="day in daysInMonth" :key="day" class="w-day">{{ day }}</th>
                    <th class="w-total">P</th>
                    <th class="w-total">F</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(person, index) in monthlyAttendanceList" :key="index">
                    <td class="text-center">{{ index + 1 }}</td>
                    <td class="text-left font-sm">{{ person.name }}</td>
                    <td class="text-left font-xs">{{ person.role }}</td>
                    <td v-for="(status, i) in person.attendance" :key="i" class="text-center font-bold"
                        :class="{'text-green': status === 'P', 'text-red': status === 'F'}">
                        {{ status }}
                    </td>
                    <td class="text-center font-bold text-green">{{ person.totalPresent }}</td>
                    <td class="text-center font-bold text-red">{{ person.totalAbsent }}</td>
                </tr>
            </tbody>
        </table>

        <div class="leyenda mt-4">
            <p><strong>LEYENDA:</strong> <span class="text-green">P</span> = Presente | <span class="text-red">F</span> = Falta</p>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.attendance-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Header ── */
.att-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.att-title {
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

.time-row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.live-time {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main, #334155);
  font-variant-numeric: tabular-nums;
}

.live-date {
  font-size: 0.95rem;
  color: var(--text-muted, #64748b);
  text-transform: capitalize;
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

/* ── Action Buttons ── */
.btn-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-print-pdf {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.btn-print-pdf:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
}

/* ── Status Bar ── */
.glass-panel {
  background: var(--glass-bg, rgba(255,255,255,0.7));
  border-radius: 16px;
  box-shadow: var(--glass-shadow, 0 4px 20px rgba(0,0,0,0.06));
  backdrop-filter: blur(12px);
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.5px;
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

.status-badge.open { background-color: var(--success-bg, #d1fae5); color: #059669; }
.status-badge.closed { background-color: var(--danger-bg, #fee2e2); color: #dc2626; }
.status-badge.manual { background-color: #fef3c7; color: #d97706; }

.btn-mark-all {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(16,185,129,0.25);
}

.btn-mark-all:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(16,185,129,0.35);
}

/* ── Table ── */
.staff-table-wrap {
  padding: 0;
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
  padding: 1rem 1.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background-color: rgba(255,255,255,0.5);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

tbody tr {
  transition: background-color 0.2s ease;
  border-bottom: 1px solid rgba(0,0,0,0.03);
}

tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background-color: rgba(99, 102, 241, 0.03); }

td {
  padding: 1rem 1.5rem;
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
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
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
  gap: 0.4rem;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 600;
}

.status-pill.present { background-color: #d1fae5; color: #059669; }
.status-pill.absent { background-color: #fee2e2; color: #ef4444; }
.status-pill.pending { background-color: #f1f5f9; color: #64748b; }

.actions-cell {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-checkin {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  padding: 0.55rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 8px rgba(99, 102, 241, 0.25);
  border: none;
}

.btn-checkin:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(99, 102, 241, 0.35);
}

.btn-checkin.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 3px 8px rgba(239, 68, 68, 0.25);
}

.btn-checkin.btn-danger:hover:not(:disabled) {
  box-shadow: 0 6px 14px rgba(239, 68, 68, 0.35);
}

.btn-checkin:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.btn-absent {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  color: #64748b;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-absent:hover {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
  transform: translateY(-1px);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .att-header { flex-direction: column; align-items: flex-start; }
  .header-controls { flex-direction: column; align-items: stretch; }
  .live-time { font-size: 1.5rem; }
  td, th { padding: 0.75rem 1rem; }
  .role-cell { display: none; }
}

/* ── Print ── */
.screen-hidden { display: none; }

@media print {
  @page { size: landscape; margin: 1cm; }
  body { background: white; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .attendance-container > .att-header,
  .attendance-container > .status-bar,
  .attendance-container > .staff-table-wrap,
  nav, button, .app-container > *:not(.main-wrapper) { display: none !important; }
  body > div:not(#app), [id*="vite-plugin-vue-devtools"] { display: none !important; }
  .attendance-container { width: 100%; margin: 0; padding: 0; }
  .print-sheet { display: block !important; width: 100%; margin: 0; padding: 0; font-family: Arial, sans-serif; color: black; }
  .report-header { margin-bottom: 20px; }
  .company-name { color: #009e60; font-size: 20pt; font-weight: 900; text-align: center; margin: 0; }
  .blue-text { color: #1e3a8a; }
  .company-info { font-size: 9pt; text-align: center; margin-top: 5px; }
  .report-title { text-align: center; font-size: 14pt; margin: 15px 0; text-decoration: underline; }
  .report-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  .report-table th, .report-table td { border: 1px solid #000; padding: 4px; vertical-align: middle; }
  .report-table th { background-color: #f3f4f6 !important; font-weight: bold; }
  .bg-gray { background-color: #e5e7eb !important; }
  .text-center { text-align: center; } .text-left { text-align: left; }
  .font-bold { font-weight: bold; } .font-sm { font-size: 8pt; } .font-xs { font-size: 7pt; }
  .text-green { color: #059669 !important; } .text-red { color: #dc2626 !important; }
  .w-item { width: 20px; } .w-name { width: 220px; } .w-role { width: 100px; }
  .w-day { width: 20px; font-size: 7pt; padding: 2px !important; } .w-total { width: 25px; }
  .leyenda { font-size: 9pt; margin-top: 15px; page-break-inside: avoid; }
}
</style>
